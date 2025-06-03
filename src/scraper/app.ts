import { Worker } from 'worker_threads';
import path from 'path';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';
import { smallSumerize } from './prompt/smallSumerize';
import { LLMService } from '../services/llm.service';
import { summarizeRelevantInfoWithAI } from './scraper';

dotenv.config();

// Define message types for clear communication
type MainToWorkerMessage =
  | {
      type: 'new_task';
      url: string;
    }
  | {
      type: 'terminate';
    };

type WorkerToMainMessage =
  | {
      type: 'task_complete';
      url: string;
      keywordContexts: Record<string, string[]> | null;
    }
  | {
      type: 'task_error';
      url: string;
      message: string;
    }
  | {
      type: 'request_task';
    }
  | {
      type: 'worker_ready';
    }
  | {
      type: 'worker_terminated';
    };

export async function run(baseURL: string, location: string) {
  const host = new URL(baseURL).host;
  const robot = await getRobotParser(`https://${host}`);
  const crawlDelay = robot.getCrawlDelay(host) ?? 0;
  const delayMs = crawlDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string) || 1000;

  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
  console.log(`Discovered total ${allLinks.length} internal links.`);

  const numberOfWorkers = parseInt(process.env.CONCURRENT_WORKERS || '4', 10);
  const taskQueue: string[] = [...allLinks];

  const collectedKeywordContexts: Record<string, string[]> = {};
  let tasksDispatched = 0;
  let tasksProcessed = 0;
  let workersReadyCount = 0;
  let workersTerminatedCount = 0;

  const workers: Worker[] = [];
  const workerPromises: Promise<void>[] = [];

  console.log(`Starting ${numberOfWorkers} workers to process tasks dynamically.`);

  const checkCompletionAndTerminateWorkers = () => {
    if (workersReadyCount < numberOfWorkers) {
      return;
    }

    if (taskQueue.length === 0 && tasksDispatched === tasksProcessed) {
      workers.forEach((worker) => {
        worker.postMessage({ type: 'terminate' } as MainToWorkerMessage);
      });
    }
  };

  for (let i = 0; i < numberOfWorkers; i++) {
    const workerId = i + 1;
    const workerPath = path.resolve(__dirname, 'workers.ts');

    const worker = new Worker(workerPath, {
      workerData: {
        location,
        delayMs,
      },
      execArgv: ['-r', 'ts-node/register'],
    });

    workers.push(worker);

    workerPromises.push(
      new Promise<void>((resolve, reject) => {
        let hasWorkerResolvedOrRejected = false;

        const safeResolve = () => {
          if (!hasWorkerResolvedOrRejected) {
            hasWorkerResolvedOrRejected = true;
            resolve();
          }
        };

        const safeReject = (err: Error) => {
          if (!hasWorkerResolvedOrRejected) {
            hasWorkerResolvedOrRejected = true;
            reject(err);
          }
        };

        worker.on('message', (msg: WorkerToMainMessage) => {
          if (msg.type === 'worker_ready') {
            workersReadyCount++;
            console.log(
              `Main: Worker ${workerId} is ready. Total active workers: ${workersReadyCount}.`,
            );
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
                console.log(
                  `Main: Sent task for ${nextUrl} to Worker ${workerId}. Queue size: ${taskQueue.length}`,
                );
              }
            } else {
              checkCompletionAndTerminateWorkers();
            }
          } else if (msg.type === 'request_task') {
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
                console.log(
                  `Main: Sent task for ${nextUrl} to Worker ${workerId}. Queue size: ${taskQueue.length}`,
                );
              }
            } else {
              checkCompletionAndTerminateWorkers();
            }
          } else if (msg.type === 'task_complete') {
            tasksProcessed++;
            if (msg.keywordContexts) {
              for (const keyword in msg.keywordContexts) {
                if (Object.prototype.hasOwnProperty.call(msg.keywordContexts, keyword)) {
                  if (!collectedKeywordContexts[keyword]) {
                    collectedKeywordContexts[keyword] = [];
                  }
                  collectedKeywordContexts[keyword].push(...msg.keywordContexts[keyword]);
                }
              }
            }
            console.log(
              `Main: Worker ${workerId} completed ${msg.url}. Total processed: ${tasksProcessed}/${allLinks.length}.`,
            );
            checkCompletionAndTerminateWorkers();
          } else if (msg.type === 'task_error') {
            tasksProcessed++;
            console.error(`Main: Worker ${workerId} reported error for ${msg.url}: ${msg.message}`);
            checkCompletionAndTerminateWorkers();
          } else if (msg.type === 'worker_terminated') {
            workersTerminatedCount++;
            console.log(
              `Main: Worker ${workerId} confirmed termination. Total terminated: ${workersTerminatedCount}/${numberOfWorkers}.`,
            );
            safeResolve();
          }
        });

        worker.on('error', (err) => {
          console.error(`Main: Unhandled error in Worker ${workerId}:`, err);
          safeReject(err);
          worker.postMessage({ type: 'terminate' } as MainToWorkerMessage);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            const errorMessage = `Main: Worker ${workerId} stopped with exit code ${code}.`;
            console.error(errorMessage);
            safeReject(new Error(errorMessage));
          } else {
            console.log(`Main: Worker ${workerId} exited gracefully.`);
            safeResolve();
          }
        });
      }),
    );
  }

  await Promise.allSettled(workerPromises);

  if (workersTerminatedCount < numberOfWorkers) {
    console.warn(
      `Warning: Not all workers confirmed graceful termination. Expected ${numberOfWorkers}, received ${workersTerminatedCount}.`,
    );
  }

  console.log(
    `All workers have completed or exited. Total tasks processed: ${tasksProcessed}/${allLinks.length}`,
  );

  const totalContexts = Object.values(collectedKeywordContexts).reduce(
    (sum, contexts) => sum + contexts.length,
    0,
  );
  console.log(`Total keywords found: ${Object.keys(collectedKeywordContexts).length}`);
  console.log(`Total combined contexts collected: ${totalContexts}`);

  let summaries: string[] = [];
  const chunkedContexts: Record<string, string[]>[] = [];
  let currentChunk: Record<string, string[]> = {};
  let currentCharCount = 0;

  for (const [keyword, contexts] of Object.entries(collectedKeywordContexts)) {
    const contextsString = contexts.join(' ');
    if (currentCharCount + contextsString.length > 240000) {
      chunkedContexts.push(currentChunk);
      currentChunk = {};
      currentCharCount = 0;
    }
    currentChunk[keyword] = contexts;
    currentCharCount += contextsString.length;
  }
  if (Object.keys(currentChunk).length > 0) {
    chunkedContexts.push(currentChunk);
  }

  for (const chunk of chunkedContexts) {
    const smallPrompt = smallSumerize(chunk);
    const summary = await LLMService.sendPrompt(smallPrompt);

    if (summary) {
      summaries.push(summary);
      // Wait for a response before sending next prompt
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const finalSummary = summarizeRelevantInfoWithAI(baseURL, summaries, location);
  console.log('Final combined summary:', finalSummary);
  return finalSummary;
}
