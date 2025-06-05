// run.ts

import { Worker } from 'worker_threads';
import path from 'path';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';
import { smallSumerize } from './prompt/smallSumerize'; // Import the new smallSumerize
import { LLMService } from '../services/llm.service';
import { ScraperResult, summarizeRelevantInfoWithAI } from './scraper'; // Import ScraperResult
import * as os from 'os';

dotenv.config();

function getCpuCores(): number {
  return os.cpus().length;
}


// Define message types (remain the same)
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
      keywordContexts: ScraperResult;
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

// Define a map for dynamic wordsBefore/wordsAfter for the scraper
const keywordContextLengths: Record<string, { before: number; after: number }> = {
  // General details, often concise
  name: { before: 20, after: 30 },
  type: { before: 20, after: 30 },
  brands: { before: 30, after: 60 },

  // Structured information, needs more context
  openingHours: { before: 50, after: 120 }, // Can be lists/tables
  open: { before: 50, after: 120 },
  hour: { before: 50, after: 120 },
  hours: { before: 50, after: 120 },
  time: { before: 50, after: 120 },
  times: { before: 50, after: 120 },
  monday: { before: 30, after: 80 }, // Specific day might need surrounding days/times
  tuesday: { before: 30, after: 80 },
  wednesday: { before: 30, after: 80 },
  thursday: { before: 30, after: 80 },
  friday: { before: 30, after: 80 },
  saturday: { before: 30, after: 80 },
  sunday: { before: 30, after: 80 },
  closed: { before: 30, after: 80 },
  'business hours': { before: 50, after: 120 },
  schedule: { before: 50, after: 120 },

  location: { before: 50, after: 100 }, // Full address components
  address: { before: 50, after: 100 },
  directions: { before: 50, after: 100 },
  'find us': { before: 50, after: 100 },
  store: { before: 50, after: 100 },
  shops: { before: 50, after: 100 },

  // Descriptive paragraphs, need ample context
  about: { before: 100, after: 200 },
  'about us': { before: 100, after: 200 },
  'our story': { before: 100, after: 200 },
  mission: { before: 100, after: 200 },
  retour: { before: 100, after: 200 },
  returns: { before: 100, after: 200 },
  policy: { before: 100, after: 200 },
  shipping: { before: 100, after: 200 },
  delivery: { before: 100, after: 200 },
  warranty: { before: 100, after: 200 },
  // Default for general keywords not explicitly listed above
  // (Your scraper's default of 50/100 words will be used if not specified here)
};

export async function run(baseURL: string, location: string) {
  const host = new URL(baseURL).host;
  const robot = await getRobotParser(`https://${host}`);
  const crawlDelay = robot.getCrawlDelay(host) ?? 0;
  const delayMs = crawlDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string) || 1000;

  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
  console.log(`Discovered total ${allLinks.length} internal links.`);

  const numberOfWorkers = getCpuCores() || parseInt(process.env.CONCURRENT_WORKERS || '4', 10);
  const taskQueue: string[] = [...allLinks];

  // Store all collected keyword contexts grouped by keyword
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
      console.log('All tasks processed and queue is empty. Terminating workers.');
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
        // Pass dynamic context lengths to the worker so it can use them in scraper
        wordsBeforeMap: Object.fromEntries(
          Object.entries(keywordContextLengths).map(([k, v]) => [k.toLowerCase(), v.before]),
        ),
        wordsAfterMap: Object.fromEntries(
          Object.entries(keywordContextLengths).map(([k, v]) => [k.toLowerCase(), v.after]),
        ),
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
            // Dispatch initial tasks immediately once workers are ready
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
                // console.log(`Main: Sent task for ${nextUrl} to Worker ${workerId}. Queue size: ${taskQueue.length}`); // Too verbose
              }
            } else {
              checkCompletionAndTerminateWorkers();
            }
          } else if (msg.type === 'request_task') {
            // Worker completed a task and is asking for more work
            if (taskQueue.length > 0) {
              const nextUrl = taskQueue.shift();
              if (nextUrl) {
                tasksDispatched++;
                worker.postMessage({ type: 'new_task', url: nextUrl } as MainToWorkerMessage);
                // console.log(`Main: Sent task for ${nextUrl} to Worker ${workerId}. Queue size: ${taskQueue.length}`); // Too verbose
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
                  // Add contexts from the current page to the global collection
                  collectedKeywordContexts[keyword].push(...msg.keywordContexts[keyword]);
                }
              }
            }
            console.log(
              `Main: Worker ${workerId} completed ${msg.url}. Processed: ${tasksProcessed}/${allLinks.length}. Queue: ${taskQueue.length}.`,
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
          // Attempt to terminate worker if an unhandled error occurs
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

  // --- Step 1: Pre-process and Filter Collected Keyword Contexts ---
  const consolidatedKeywordContexts: Record<string, string[]> = {};
  const keywordsToProcess = Object.keys(collectedKeywordContexts);

  for (const keyword of keywordsToProcess) {
    const contexts = collectedKeywordContexts[keyword];
    if (!contexts || contexts.length === 0) {
      continue;
    }

    // Filter and prioritize contexts for this specific keyword
    const filteredAndPrioritized = filterAndPrioritizeContexts(keyword, contexts, location);
    if (filteredAndPrioritized.length > 0) {
      consolidatedKeywordContexts[keyword] = filteredAndPrioritized;
    }
  }

  console.log(`Pre-processed keyword contexts. Now consolidating with smallSumerize...`);

  // --- Step 2: Use smallSumerize for each keyword to consolidate its collected contexts ---
  const summarizedKeywordData: Record<string, string> = {}; // Stores consolidated string for each keyword

  const promptDelayMs = 1500; // Delay between LLM calls to respect rate limits

  for (const [keyword, contexts] of Object.entries(consolidatedKeywordContexts)) {
    // If a keyword has too many contexts, even after filtering, split them into chunks for smallSumerize
    const maxContextsCharsPerPrompt = 200000; // Gemini Flash-Lite context window is 1M. This is ample.
    let currentChunk: string[] = [];
    let currentChunkCharCount = 0;
    const chunksToSend: string[][] = [];

    for (const context of contexts) {
      if (currentChunkCharCount + context.length > maxContextsCharsPerPrompt) {
        chunksToSend.push(currentChunk);
        currentChunk = [];
        currentChunkCharCount = 0;
      }
      currentChunk.push(context);
      currentChunkCharCount += context.length;
    }
    if (currentChunk.length > 0) {
      chunksToSend.push(currentChunk);
    }

    let combinedSummaryForKeyword = '';
    for (const chunk of chunksToSend) {
      const smallPrompt = smallSumerize(keyword, chunk, location, baseURL);
      console.log(
        `Sending smallSumerize prompt for keyword "${keyword}" (chunk size: ${chunk.length} snippets, chars: ${smallPrompt.length}).`,
      );
      const summaryPart = await LLMService.sendPrompt(smallPrompt);
      if (summaryPart) {
        combinedSummaryForKeyword += summaryPart.trim() + '\n'; // Add newline for readability if multiple parts
        // Delay between prompts to avoid hitting rate limits
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setTimeout(resolve, promptDelayMs));
      }
    }
    if (combinedSummaryForKeyword) {
      summarizedKeywordData[keyword] = combinedSummaryForKeyword.trim();
      console.log(`Consolidated details for "${keyword}" obtained.`);
    } else {
      console.warn(`No consolidated details found for "${keyword}".`);
    }
  }

  // --- Step 3: Prepare final snippets for summarizeRelevantInfoWithAI ---
  const finalSnippetsForSummarizeAI: string[] = [];
  for (const [keyword, consolidatedContent] of Object.entries(summarizedKeywordData)) {
    // Prefix with keyword to help the final AI model understand context
    finalSnippetsForSummarizeAI.push(
      `**Consolidated ${keyword} Information:**\\n${consolidatedContent}`,
    );
  }

  console.log(
    `Sending final consolidated data to summarizeRelevantInfoWithAI (${finalSnippetsForSummarizeAI.length} combined snippets`,
  );

  const finalSummary = await summarizeRelevantInfoWithAI(
    baseURL,
    finalSnippetsForSummarizeAI,
    location,
  );
  console.log('Final combined summary:', finalSummary);
  return finalSummary;
}

/**
 * Helper function to filter and prioritize contexts for a given keyword.
 * This is where you implement your logic for deduplication, quality selection, etc.
 * @param {string} keyword - The keyword being processed.
 * @param {string[]} contexts - All collected contexts for this keyword from all pages.
 * @param {string} location - The location context (e.g., "Brasschaat").
 * @returns {string[]} Filtered and prioritized contexts.
 */
function filterAndPrioritizeContexts(
  keyword: string,
  contexts: string[],
  location: string,
): string[] {
  const uniqueContexts = Array.from(new Set(contexts)); // Basic deduplication

  // Further prioritization logic based on keyword type
  switch (keyword.toLowerCase()) {
    case 'openinghours':
    case 'open':
    case 'hour':
    case 'hours':
    case 'time':
    case 'times':
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday':
    case 'closed':
    case 'business hours':
    case 'schedule':
      // Prioritize snippets that contain multiple days or a complete week overview.
      // Also, give preference to snippets that explicitly mention the target location if opening hours are store-specific.
      return uniqueContexts
        .filter((context) => {
          // Simple check: if location is in snippet, it's more relevant for store-specific hours
          return context.toLowerCase().includes(location.toLowerCase());
        })
        .sort((a, b) => {
          // Sort by number of days mentioned (heuristic for completeness)
          const days = [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ];
          const countDays = (text: string) =>
            days.filter((day) => text.toLowerCase().includes(day)).length;
          return countDays(b) - countDays(a);
        })
        .slice(0, 5); // Take top 5 most relevant/complete snippets for opening hours
    case 'location':
    case 'address':
    case 'directions':
    case 'map':
    case 'find us':
      // Prioritize snippets that contain the target location and seem like full addresses
      return uniqueContexts
        .filter((context) => context.toLowerCase().includes(location.toLowerCase()))
        .sort((a, b) => {
          // Heuristic: Longer contexts might contain more address components
          return b.length - a.length;
        })
        .slice(0, 3); // Take top 3 most relevant addresses
    case 'about':
    case 'about us':
    case 'our story':
    case 'mission':
    case 'vision':
    case 'values':
    case 'retour':
    case 'returns':
    case 'policy':
    case 'policies':
    case 'refund':
    case 'exchange':
    case 'shipping':
    case 'delivery':
    case 'warranty':
    case 'guarantee':
    case 'disclaimer':
    case 'cancellation':
      // For descriptive texts, prioritize longer, more complete paragraphs
      return uniqueContexts.sort((a, b) => b.length - a.length).slice(0, 3); // Take top 3 longest
    case 'brands':
    case 'brand':
      // For brands, just get all unique ones. Consolidation happens in smallSumerize.
      return uniqueContexts;
    case 'name':
      // For name, prioritize shortest unique context that contains location or looks like a primary name
      return uniqueContexts
        .filter(
          (context) =>
            context.toLowerCase().includes(location.toLowerCase()) ||
            context.split(/\s+/).length < 10,
        ) // Small names, or location specific
        .sort((a, b) => a.length - b.length) // Prefer shorter, more direct names
        .slice(0, 2); // Take top 2 to allow for name variations
    case 'type':
      // For type, might rely more on the AI's inference from broad contexts.
      // Take a few relevant contexts.
      return uniqueContexts.slice(0, 3);
    default:
      // For other keywords, simple deduplication and perhaps a length-based sort
      return uniqueContexts.sort((a, b) => b.length - a.length).slice(0, 5);
  }
}
