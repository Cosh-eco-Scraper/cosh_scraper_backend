import { Worker } from 'worker_threads';
import path from 'path';
import { summarizeRelevantInfoWithAI } from './scraper';
import { getAllValidUrls } from './linkCrawler/linkCrawler';

const MAX_WORKERS = 4;

export async function run(baseURL: string, location: string) {
  const allLinks = await getAllValidUrls(new URL(baseURL).toString());
  console.log(`Discovered total ${allLinks.length} internal links.`);

  const chunkSize = Math.ceil(allLinks.length / MAX_WORKERS);
  const linkChunks = Array.from({ length: MAX_WORKERS }, (_, i) =>
    allLinks.slice(i * chunkSize, (i + 1) * chunkSize),
  );

  const workerPromises = linkChunks.map((links, i) => {
    return new Promise<string[]>((resolve, reject) => {
      const workerPath = path.resolve(__dirname, 'workers.ts');
      console.log(`Starting worker ${i + 1} with ${links.length} links.`);

      const worker = new Worker(workerPath, {
        workerData: { links, location },
        execArgv: ['-r', 'ts-node/register'],
      });

      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          console.log(`Worker ${i + 1}: Scraped ${msg.count} / ${links.length} pages.`);
        } else if (msg.type === 'done') {
          console.log(`Worker ${i + 1} done, received ${msg.snippets.length} snippets.`);
          resolve(msg.snippets);
        }
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  });

  // Wait for all workers to finish and collect all snippets
  const allWorkersSnippets = await Promise.all(workerPromises);
  const combinedSnippets = allWorkersSnippets.flat();

  console.log(`All workers done. Total combined snippets: ${combinedSnippets.length}`);

  // Now do ONE AI call with combined snippets and location
  const MAX_TOKENS = 250000;
  const TOKEN_ESTIMATE_PER_CHAR = 0.25;
  const MAX_CHARS = Math.floor(MAX_TOKENS / TOKEN_ESTIMATE_PER_CHAR); // 120,000 characters

  const combinedText = combinedSnippets.join('\n\n');
  const limitedText = combinedText.slice(0, MAX_CHARS);
  const limitedSnippets = limitedText.split('\n\n');

  const finalSummary = await summarizeRelevantInfoWithAI(baseURL, limitedSnippets, location);
  console.log('Final combined summary:', finalSummary);
  return finalSummary;
}
