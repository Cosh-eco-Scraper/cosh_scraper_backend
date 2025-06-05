import { Worker } from 'worker_threads';
import path from 'path';
import { summarizeRelevantInfoWithAI } from './scraper';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';
import RabbitMQMiddleware from '../middlewares/rabbitMQ';

dotenv.config();

type MainToWorkerMessage = { type: 'new_task'; url: string } | { type: 'terminate' };
type WorkerToMainMessage =
  | { type: 'task_complete'; url: string; snippets: string[] }
  | { type: 'task_error'; url: string; message: string }
  | { type: 'request_task' }
  | { type: 'worker_ready' }
  | { type: 'worker_terminated' };

export async function run(baseURL: string, location: string) {
  let currentStep = 0;
  const totalSteps = 100;
  const sendProgress = (step: number) => {
    const percent = Math.min(Math.round((step / totalSteps) * 100), 100);
    RabbitMQMiddleware.sendMessage(`Progress: ${percent}%`);
  };

  currentStep = 1;
  sendProgress(currentStep);

  const host = new URL(baseURL).host;
  const robot = await getRobotParser(`https://${host}`);
  currentStep = 2;
  sendProgress(currentStep);

  const crawlDelay = robot.getCrawlDelay(host) ?? 0;
  const delayMs = crawlDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string) || 1000;

  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
  currentStep = 3;
  sendProgress(currentStep);

  const numberOfWorkers = parseInt(process.env.CONCURRENT_WORKERS || '4', 10);
  const taskQueue: string[] = [...allLinks];

  const collectedSnippets: string[] = [];

  // eslint-disable-next-line no-undef
  let tasksDispatched = 0;
  let tasksProcessed = 0;
  let workersReadyCount = 0;
  let workersTerminatedCount = 0;

  const workers: Worker[] = [];
  const workerPromises: Promise<void>[] = [];

  for (let i = 0; i < numberOfWorkers; i++) {
    const workerId = i + 1;
    const workerPath = path.resolve(__dirname, 'workers.ts');

    const worker = new Worker(workerPath, {
      workerData: { location, delayMs },
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
            currentStep = 4 + Math.floor((workersReadyCount / numberOfWorkers) * 10);
            sendProgress(currentStep);
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
              }
            }
          } else if (msg.type === 'request_task') {
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
              }
            }
          } else if (msg.type === 'task_complete') {
            tasksProcessed++;
            collectedSnippets.push(...msg.snippets);
            currentStep = 14 + Math.floor((tasksProcessed / allLinks.length) * 70);
            sendProgress(currentStep);
          } else if (msg.type === 'task_error') {
            tasksProcessed++;
            currentStep = 14 + Math.floor((tasksProcessed / allLinks.length) * 70);
            sendProgress(currentStep);
          } else if (msg.type === 'worker_terminated') {
            workersTerminatedCount++;
            currentStep = 84 + Math.floor((workersTerminatedCount / numberOfWorkers) * 5);
            sendProgress(currentStep);
            safeResolve();
          }
        });

        worker.on('error', (err) => {
          safeReject(err);
          worker.postMessage({ type: 'terminate' } as MainToWorkerMessage);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            safeReject(new Error(`Worker ${workerId} stopped with exit code ${code}.`));
          } else {
            safeResolve();
          }
        });
      }),
    );
  }

  await Promise.allSettled(workerPromises);

  currentStep = 90;
  sendProgress(currentStep);
  const MAX_TOKENS = 250000;
  const TOKEN_ESTIMATE_PER_CHAR = 0.25;
  const MAX_CHARS = Math.floor(MAX_TOKENS / TOKEN_ESTIMATE_PER_CHAR);

  const combinedText = collectedSnippets.join('\n\n');
  let finalSnippetsToSummarize: string[] = [];

  if (combinedText.length > MAX_CHARS) {
    const limitedText = combinedText.slice(0, MAX_CHARS);
    const lastNewlineIndex = limitedText.lastIndexOf('\n\n');
    if (lastNewlineIndex !== -1) {
      finalSnippetsToSummarize = limitedText
        .substring(0, lastNewlineIndex)
        .split('\n\n')
        .filter(Boolean);
    } else {
      finalSnippetsToSummarize = [limitedText];
    }
  } else {
    finalSnippetsToSummarize = collectedSnippets;
  }

  currentStep = 95;
  sendProgress(currentStep);

  const finalSummary = await summarizeRelevantInfoWithAI(
    baseURL,
    finalSnippetsToSummarize,
    location,
  );

  currentStep = 100;
  sendProgress(currentStep);

  return finalSummary;
}
