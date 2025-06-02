import { Worker } from 'worker_threads';
import path from 'path';
import { summarizeRelevantInfoWithAI } from './scraper';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';

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
      url: string; // Report which URL was completed
      snippets: string[];
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
      type: 'worker_ready'; // Worker signals it's ready to receive tasks
    }
  | {
      type: 'worker_terminated'; // NEW: Worker confirms it has terminated gracefully
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

  const collectedSnippets: string[] = [];
  let tasksDispatched = 0; // Number of tasks sent to workers
  let tasksProcessed = 0; // Number of tasks reported back (complete or error)
  let workersReadyCount = 0; // Number of workers that have sent 'worker_ready'
  let workersTerminatedCount = 0; // NEW: Number of workers that have confirmed termination

  const workers: Worker[] = [];
  const workerPromises: Promise<void>[] = [];

  console.log(`Starting ${numberOfWorkers} workers to process tasks dynamically.`);

  // Function to check if all tasks are done and workers should terminate
  const checkCompletionAndTerminateWorkers = () => {
    // Only proceed if all workers are initially ready
    if (workersReadyCount < numberOfWorkers) {
      return;
    }

    if (taskQueue.length === 0 && tasksDispatched === tasksProcessed) {
      // All tasks are assigned and processed/errored.
      // Send terminate signal to all workers that are still active.
      workers.forEach((worker) => {
        // Check if worker is still active (e.g., has not explicitly exited yet)
        // This is tricky, often best to just send terminate and let them handle it.
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
        let hasWorkerResolvedOrRejected = false; // Flag to ensure promise resolves/rejects only once

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
            // Immediately try to dispatch if tasks are available, or check for completion
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
              // Worker is ready but no tasks in queue. Check global completion.
              checkCompletionAndTerminateWorkers();
            }
          } else if (msg.type === 'request_task') {
            // This worker just finished a task or initialized, ready for next
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
              checkCompletionAndTerminateWorkers(); // No tasks left, check if time to terminate
            }
          } else if (msg.type === 'task_complete') {
            tasksProcessed++;
            collectedSnippets.push(...msg.snippets);
            console.log(
              `Main: Worker ${workerId} completed ${msg.url}. Total processed: ${tasksProcessed}/${allLinks.length}.`,
            );
            checkCompletionAndTerminateWorkers(); // Task done, check if time to terminate or dispatch next
          } else if (msg.type === 'task_error') {
            tasksProcessed++; // Count errors as processed to advance overall process
            console.error(`Main: Worker ${workerId} reported error for ${msg.url}: ${msg.message}`);
            checkCompletionAndTerminateWorkers(); // Task errored, check if time to terminate or dispatch next
          } else if (msg.type === 'worker_terminated') {
            // NEW
            workersTerminatedCount++;
            console.log(
              `Main: Worker ${workerId} confirmed termination. Total terminated: ${workersTerminatedCount}/${numberOfWorkers}.`,
            );
            safeResolve(); // This worker's promise is now definitively fulfilled
          }
        });

        worker.on('error', (err) => {
          console.error(`Main: Unhandled error in Worker ${workerId}:`, err);
          safeReject(err); // This worker failed critically
          // Also try to terminate it, though it might be crashing anyway
          worker.postMessage({ type: 'terminate' } as MainToWorkerMessage);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            const errorMessage = `Main: Worker ${workerId} stopped with exit code ${code}.`;
            console.error(errorMessage);
            safeReject(new Error(errorMessage)); // Reject if exited with error code
          } else {
            console.log(`Main: Worker ${workerId} exited gracefully.`);
            // If the worker exited with 0 but didn't send 'worker_terminated' (e.g., a race condition),
            // ensure its promise is resolved.
            safeResolve();
          }
        });
      }),
    );
  }

  // --- Wait for all workers to finish ---
  // Using Promise.allSettled to ensure we collect all outcomes.
  // The 'run' function will only return after all workerPromises resolve/reject.
  await Promise.allSettled(workerPromises);

  // Final check to see if all workers truly terminated
  if (workersTerminatedCount < numberOfWorkers) {
    console.warn(
      `Warning: Not all workers confirmed graceful termination. Expected ${numberOfWorkers}, received ${workersTerminatedCount}.`,
    );
    // You might add a process.exit(1) here if this is considered a critical failure
  }

  console.log(
    `All workers have completed or exited. Total tasks processed: ${tasksProcessed}/${allLinks.length}`,
  );
  console.log(`Total combined snippets collected: ${collectedSnippets.length}`);

  // No main browser to close here.

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
    console.warn(
      `Text for AI summary truncated from ${combinedText.length} to ${limitedText.length} characters.`,
    );
  } else {
    finalSnippetsToSummarize = collectedSnippets;
  }

  const finalSummary = await summarizeRelevantInfoWithAI(
    baseURL,
    finalSnippetsToSummarize,
    location,
  );
  console.log('Final combined summary:', finalSummary);
  return finalSummary;
}
