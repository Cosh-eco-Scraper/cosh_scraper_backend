// run.ts

import { Worker } from 'worker_threads';
import path from 'path';
import { getAllValidUrls } from './linkCrawler/linkCrawler';
import dotenv from 'dotenv';
import getRobotParser from './robot/robot';
import { smallSumerize } from './prompt/smallSumerize';
import { LLMService } from '../services/llm.service';
import { summarizeRelevantInfoWithAI } from './scraper';
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

export async function run(baseURL: string, location: string) {
  const host = new URL(baseURL).host;
  const robot = await getRobotParser(`https://${host}`);
  const crawlDelay = robot.getCrawlDelay(host) ?? 0;
  const delayMs = crawlDelay * 1000 || parseInt(process.env.SCRAPER_DELAY as string, 10) || 1000;

  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
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

  // --- Post-processing: Filter and Prioritize Collected Keyword Contexts (SITE-WIDE) ---
  const finalSiteWideKeywordContexts: Record<string, string[]> = {};

  for (const keyword of Array.from(allDetectedKeywords)) {
    // Iterate over all unique keywords found
    const contexts = collectedKeywordContexts[keyword];
    if (contexts && contexts.length > 0) {
      // Apply site-wide filtering and prioritization
      const filteredAndPrioritized = filterAndPrioritizeContexts(keyword, contexts, location);
      if (filteredAndPrioritized.length > 0) {
        finalSiteWideKeywordContexts[keyword] = filteredAndPrioritized;
      }
    }
  }

  console.log(`Site-wide pre-processed keyword contexts. Now consolidating with smallSumerize...`);

  // --- Step 3: Use smallSumerize for each keyword to consolidate its site-wide collected contexts ---
  const summarizedSiteWideKeywordData: Record<string, string> = {};
  const promptDelayMs = 1500; // Delay between LLM calls to respect rate limits

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
        chunksToSend.push(currentChunk);
        currentChunk = [];
        currentChunkCharCount = 0;
      }
      currentChunk.push(context);
      currentChunkCharCount += context.length;
    }
    // Push the last chunk if it has content
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
    case 'opening hours':
    case 'store hours':
    case 'our hours':
    case 'business hours':
    case 'open':
    case 'closed':
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday':
    case 'mon':
    case 'tue':
    case 'wed':
    case 'thu':
    case 'fri':
    case 'sat':
    case 'sun':
    case 'weekdays':
    case 'weekends':
    case 'public holidays':
    case 'openingstijden':
    case 'openingsuren':
    case 'öffnungszeiten':
    case "heures d'ouverture":
    case 'maandag':
    case 'dinsdag':
    case 'woensdag':
    case 'donderdag':
    case 'vrijdag':
    case 'zaterdag':
    case 'zondag':
    case 'montag':
    case 'dienstag':
    case 'mittwoch':
    case 'donnerstag':
    case 'freitag':
    case 'samstag':
    case 'sonntag':
    case 'lundi':
    case 'mardi':
    case 'mercredi':
    case 'jeudi':
    case 'vendredi':
    case 'samedi':
    case 'dimanche':
      return uniqueContexts
        .filter((context) => context.toLowerCase().includes(location.toLowerCase())) // Prioritize location-specific hours
        .sort((a, b) => {
          const days = {
            en: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            nl: ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
            fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
            de: ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'],
          };
          const countDays = (text: string) => {
            let count = 0;
            for (const lang of Object.values(days)) {
              for (const day of lang) {
                if (text.toLowerCase().includes(day)) {
                  count++;
                }
              }
            }
            return count;
          };
          return countDays(b) - countDays(a); // Sort by number of days mentioned (more complete)
        })
        .slice(0, 10); // Take top 10
    case 'address':
    case 'location':
    case 'find us':
    case 'visit us':
    case 'directions':
    case 'street':
    case 'road':
    case 'lane':
    case 'place':
    case 'city':
    case 'zip code':
    case 'postal code':
    case 'country':
    case 'adres':
    case 'locatie':
    case 'bezoek ons':
    case 'straat':
    case 'laan':
    case 'weg':
    case 'plaats':
    case 'stad':
    case 'postcode':
    case 'adresse':
    case 'emplacement':
    case 'rue':
    case 'avenue':
    case 'ville':
    case 'code postal':
    case 'pays':
    case 'anschrift':
    case 'standort':
    case 'straße':
    case 'stadt':
    case 'postleitzahl':
    case 'land':
      return uniqueContexts
        .filter((context) => context.toLowerCase().includes(location.toLowerCase()))
        .sort((a, b) => b.length - a.length) // Prefer longer, more complete addresses
        .slice(0, 10); // Take top 10
    case 'about us':
    case 'our story':
    case 'company profile':
    case 'who we are':
    case 'our mission':
    case 'our vision':
    case 'history':
    case 'return policy':
    case 'returns':
    case 'refunds':
    case 'exchanges':
    case 'shipping & returns':
    case 'customer service':
    case 'warranty':
    case 'guarantee':
    case 'terms and conditions':
    case 'how to return':
    case 'eligibility':
    case 'process':
    case 'over ons':
    case 'ons verhaal':
    case 'bedrijfsprofiel':
    case 'wie zijn wij':
    case 'onze missie':
    case 'onze visie':
    case 'geschiedenis':
    case 'retourbeleid':
    case 'retouren':
    case 'terugbetalingen':
    case 'garantie':
    case 'voorwaarden':
    case 'à propos de nous':
    case 'notre histoire':
    case 'profil de la société':
    case 'qui sommes-nous':
    case 'notre mission':
    case 'notre vision':
    case 'histoire':
    case 'politique de retour':
    case 'retours':
    case 'remboursements':
    case 'conditions':
    case 'über uns':
    case 'unsere geschichte':
    case 'unternehmensprofil':
    case 'wer wir sind':
    case 'unsere mission':
    case 'unsere vision':
    case 'geschichte':
    case 'rückgaberecht':
    case 'rückgaben':
    case 'erstattungen':
    case 'bedingungen':
      return uniqueContexts.sort((a, b) => b.length - a.length).slice(0, 3); // Prefer longer, more descriptive texts
    case 'brands':
    case 'our brands':
    case 'featured brands':
    case 'brand list':
    case 'merken':
    case 'onze merken':
    case 'marques':
    case 'nos marques':
    case 'marken':
    case 'unsere marken':
      return uniqueContexts; // All unique brands are relevant
    case 'store name':
    case 'company':
    case 'winkel naam':
    case 'bedrijf':
    case 'nom du magasin':
    case 'entreprise':
    case 'laden name':
    case 'firma':
      return uniqueContexts
        .filter(
          (context) =>
            context.toLowerCase().includes(location.toLowerCase()) ||
            context.split(/\s+/).length < 10,
        )
        .sort((a, b) => a.length - b.length) // Prefer shorter, more direct names
        .slice(0, 10); // Take top 10
    case 'categories':
    case 'shop by':
    case 'departments':
    case 'products':
    case 'what we sell':
    case 'specialties':
    case 'categorieën':
    case 'winkelen per':
    case 'afdelingen':
    case 'producten':
    case 'wat we verkopen':
    case 'diensten':
    case 'specialiteiten':
    case 'catégories':
    case 'acheter par':
    case 'départements':
    case 'produits':
    case 'ce que nous vendons':
    case 'services':
    case 'spécialités':
    case 'kategorien':
    case 'einkaufen nach':
    case 'abteilungen':
    case 'produkte':
    case 'was wir verkaufen':
    case 'dienstleistungen':
    case 'spezialitäten':
      return uniqueContexts.slice(0, 10);
    default:
      return uniqueContexts.sort((a, b) => b.length - a.length).slice(0, 5); // General fallback
  }
}
