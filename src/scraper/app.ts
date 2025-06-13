// run.ts

import { Worker } from 'worker_threads';
import path from 'path';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';
import { smallSummarize } from './prompt/smallSummarize';
import { LLMService } from '../services/llm.service';
import { summarizeRelevantInfoWithAI } from './scraper';
import { sendMessage } from '../middlewares/rabbitMQ';
// The consolidateScrapedInfoResults is not needed in run.ts for Strategy B,
// as we're consolidating raw contexts, not pre-summarized ScrapedInfo objects.
// import { consolidateScrapedInfoResults } from './misc/consolidate'; // <-- Remove this line

dotenv.config();

// --- Message Types (Corrected) ---
type MainToWorkerMessage =
  | {
      type: 'new_task';
      url: string;
    }
  | {
      type: 'terminate';
    };

// Worker now returns raw keyword contexts
type WorkerToMainMessage =
  | {
      type: 'task_complete';
      url: string;
      keywordContexts: Record<string, string[]> | null; // Worker returns keyword contexts
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

export async function run(baseURL: string, location: string, clientId: string) {
  const host = new URL(baseURL).host;
  const robot = await getRobotParser(`https://${host}`);
  const crawlDelay = robot.getCrawlDelay(host) ?? 0;
  const delayMs = crawlDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string, 10) || 1000;

  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
  // await sendMessage(`number of urls found to find data: ${allLinks.length}`);
  await sendMessage(
    JSON.stringify({
      target: clientId,
      content: `number of urls found to find data: ${allLinks.length}`,
    }),
  );

  console.log(`Discovered total ${allLinks.length} internal links.`);

  const numberOfWorkers = parseInt(process.env.CONCURRENT_WORKERS || '4', 10);
  const taskQueue: string[] = [...allLinks];

  // This will store ALL keyword contexts collected from ALL pages
  const collectedKeywordContexts: Record<string, string[]> = {};
  const allDetectedKeywords = new Set<string>(); // To keep track of all unique keywords found

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
      console.log('All tasks processed and queue is empty. Terminating workers.');
      workers.forEach((worker) => {
        worker.postMessage({ type: 'terminate' } as MainToWorkerMessage);
      });
    }
  };

  for (let i = 0; i < numberOfWorkers; i++) {
    const workerId = i + 1;
    const workerPath = path.resolve(__dirname, 'workers.ts'); // Ensure this path is correct

    const worker = new Worker(workerPath, {
      workerData: {
        location,
        delayMs,
      },
      execArgv: ['-r', 'ts-node/register'], // Needed if using ts-node to run workers directly
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
              }
            } else {
              checkCompletionAndTerminateWorkers();
            }
          } else if (msg.type === 'task_complete') {
            tasksProcessed++;
            // Collect keyword contexts from this page
            if (msg.keywordContexts) {
              for (const keyword in msg.keywordContexts) {
                if (Object.prototype.hasOwnProperty.call(msg.keywordContexts, keyword)) {
                  if (!collectedKeywordContexts[keyword]) {
                    collectedKeywordContexts[keyword] = [];
                  }
                  // Add contexts from the current page to the global collection
                  collectedKeywordContexts[keyword].push(...msg.keywordContexts[keyword]);
                  allDetectedKeywords.add(keyword); // Keep track of all unique keywords
                }
              }
            }
            console.log(
              `Main: Worker ${workerId} completed ${msg.url}. Processed: ${tasksProcessed}/${allLinks.length}. Queue: ${taskQueue.length}.`,
            );
            const completedPercentage = Math.round((tasksProcessed / allLinks.length) * 100);
            // sendMessage(`Completed ${completedPercentage}% of the links`);
            sendMessage(
              JSON.stringify({
                target: clientId,
                content: `Completed ${completedPercentage}% of the links`,
              }),
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

  // Wait for all workers to complete their tasks and terminate
  await Promise.allSettled(workerPromises);

  if (workersTerminatedCount < numberOfWorkers) {
    console.warn(
      `Warning: Not all workers confirmed graceful termination. Expected ${numberOfWorkers}, received ${workersTerminatedCount}.`,
    );
  }

  console.log(
    `All workers have completed or exited. Total tasks processed: ${tasksProcessed}/${allLinks.length}`,
  );
  console.log(`Starting post-processing and AI summarization...`);

  // await sendMessage(`Filtering on keywords`);
  await sendMessage(
    JSON.stringify({
      target: clientId,
      content: `Filtering on keywords`,
    }),
  );
  // --- Post-processing: Filter and Prioritize Collected Keyword Contexts (SITE-WIDE) ---
  const finalSiteWideKeywordContexts: Record<string, string[]> = {};

  for (const keyword of Array.from(allDetectedKeywords)) {
    // Iterate over all unique keywords found
    const contexts = collectedKeywordContexts[keyword];
    if (contexts && contexts.length > 0) {
      finalSiteWideKeywordContexts[keyword] = contexts;
    }
  }

  console.log(`Site-wide pre-processed keyword contexts. Now consolidating with smallSumerize...`);

  // --- Step 3: Use smallSumerize for each keyword to consolidate its site-wide collected contexts ---
  const summarizedSiteWideKeywordData: Record<string, string> = {};
  const promptDelayMs = 1500; // Delay between LLM calls to respect rate limits
  const maxChunksPerKeyword = 20; // New constant for the maximum number of chunks

  // await sendMessage(`Summerizing the keywords, this may take a while.`);
  await sendMessage(
    JSON.stringify({
      target: clientId,
      content: `Summerizing the keywords, this may take a while.`,
    }),
  );
  for (const [keyword, contexts] of Object.entries(finalSiteWideKeywordContexts)) {
    const maxContextsCharsPerPrompt = 200000; // Aim for Flash-Lite context window (1M chars)
    let currentChunk: string[] = [];
    let currentChunkCharCount = 0;
    const chunksToSend: string[][] = [];

    for (const context of contexts) {
      // If adding the current context exceeds the chunk limit, start a new chunk
      if (
        currentChunkCharCount + context.length > maxContextsCharsPerPrompt &&
        currentChunk.length > 0
      ) {
        // Only add chunk if we haven't reached the maxChunksPerKeyword limit
        if (chunksToSend.length < maxChunksPerKeyword) {
          chunksToSend.push(currentChunk);
        } else {
          console.warn(
            `Skipping further contexts for keyword "${keyword}" as max chunk limit (${maxChunksPerKeyword}) reached.`,
          );
          break; // Stop processing contexts for this keyword
        }
        currentChunk = [];
        currentChunkCharCount = 0;
      }
      currentChunk.push(context);
      currentChunkCharCount += context.length;
    }
    // Push the last chunk if it has content and we haven't reached the limit
    if (currentChunk.length > 0 && chunksToSend.length < maxChunksPerKeyword) {
      chunksToSend.push(currentChunk);
    } else if (currentChunk.length > 0 && chunksToSend.length >= maxChunksPerKeyword) {
      console.warn(
        `Last chunk for keyword "${keyword}" skipped as max chunk limit (${maxChunksPerKeyword}) was already reached during iteration.`,
      );
    }

    let combinedSummaryForKeyword = '';
    for (const chunk of chunksToSend) {
      const smallPrompt = smallSummarize(keyword, chunk, location, baseURL);
      console.log(
        `Sending smallSumerize prompt for keyword "${keyword}" (chunk size: ${chunk.length} snippets, chars: ${smallPrompt.length}).`,
      );
      const summaryPart = await LLMService.sendPrompt(smallPrompt);
      if (summaryPart) {
        combinedSummaryForKeyword += summaryPart.trim() + '\n'; // Add newline for readability if multiple parts
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, promptDelayMs)); // Delay between prompts
      }
    }
    if (combinedSummaryForKeyword) {
      summarizedSiteWideKeywordData[keyword] = combinedSummaryForKeyword.trim();
      console.log(`Consolidated details for "${keyword}" obtained site-wide.`);
    } else {
      console.warn(`No consolidated details found for "${keyword}" site-wide.`);
    }
  }

  // --- Step 4: Prepare final snippets for summarizeRelevantInfoWithAI (site-wide summary) ---
  const finalSnippetsForSummarizeAI: string[] = [];
  for (const [keyword, consolidatedContent] of Object.entries(summarizedSiteWideKeywordData)) {
    // Prefix with keyword to help the final AI model understand context
    console.log(`consolidatedContent for ${keyword}:\n ${consolidatedContent}\n\n`);

    finalSnippetsForSummarizeAI.push(
      `**Consolidated ${keyword} Information:**\n${consolidatedContent}`,
    );
  }

  console.log(
    `Sending final consolidated data to summarizeRelevantInfoWithAI (${finalSnippetsForSummarizeAI.length} combined snippets).`,
  );

  // await sendMessage(`Running the final summarization.`);
  await sendMessage(
    JSON.stringify({
      target: clientId,
      content: `Running the final summarization.`,
    }),
  );
  const finalSummary = await summarizeRelevantInfoWithAI(
    baseURL,
    finalSnippetsForSummarizeAI,
    location,
  );
  console.log('Final combined summary:', finalSummary);
  return finalSummary;
}
