import { workerData, parentPort } from 'worker_threads';
import { scraper } from './scraper';

const CONCURRENT_SCRAPES = 4;

async function runTasksWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let running = 0;
  let index = 0;
  let completed = 0;

  return new Promise((resolve) => {
    function runNext() {
      if (index === tasks.length && running === 0) {
        resolve(results);
        return;
      }
      while (running < limit && index < tasks.length) {
        const currentIndex = index++;
        running++;

        parentPort?.postMessage({ type: 'progress', count: completed });

        tasks[currentIndex]()
          .then((res) => {
            results[currentIndex] = res;
          })
          .catch((err) => {
            results[currentIndex] = null as any;
            console.error('Error in scraping:', err);
          })
          .finally(() => {
            running--;
            completed++;
            parentPort?.postMessage({ type: 'progress', count: completed });
            runNext();
          });
      }
    }
    runNext();
  });
}

(async () => {
  const { links, location } = workerData;
  console.log(`Worker started with ${links.length} links.`);

  type ScraperResult = { snippets: string[] };

  const tasks = links.map((url: string) => async (): Promise<ScraperResult | null> => {
    console.log(`Worker scraping URL: ${url}`);
    try {
      return await scraper(url, location);
    } catch (e) {
      console.error(`Error scraping ${url}:`, e);
      return null;
    }
  });

  const results = await runTasksWithLimit<ScraperResult | null>(tasks, CONCURRENT_SCRAPES);

  // Flatten snippets from all pages scraped by this worker
  const allSnippets = results
    .filter((r): r is ScraperResult => r !== null && !!r.snippets)
    .flatMap((r) => r.snippets);

  console.log(`Worker finished scraping ${allSnippets.length} snippets.`);

  // Send back all snippets only, no AI call here
  parentPort?.postMessage({ type: 'done', snippets: allSnippets });
})();
