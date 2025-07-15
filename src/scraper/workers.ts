import { parentPort, workerData } from 'worker_threads';
import dotenv from 'dotenv';
import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { scraper } from './scraper';
type ScraperResult = Record<string, string[]> | null;

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
      // Corrected to reflect the actual resolved type from scraper
      cleanedText: string|null;
      keywordContexts: ScraperResult; // This will be Record<string, string[]> | null
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

const { delayMs } = workerData as { delayMs: number };

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let isShuttingDown = false; // Flag to prevent new tasks during shutdown

(async () => {
  if (!parentPort) {
    console.error('Worker does not have a parent port. This worker should be run as a thread.');
    process.exit(1);
  }

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    console.log(`Worker (ID: ${process.pid}) started and ready.`);

    // Signal to the main thread that this worker is ready for a task
    parentPort.postMessage({ type: 'worker_ready' } as WorkerToMainMessage);

    parentPort.on('message', async (msg: MainToWorkerMessage) => {
      if (isShuttingDown) {
        console.log(`Worker (ID: ${process.pid}) received message while shutting down. Ignoring.`);
        return; // Ignore messages if already in shutdown sequence
      }

      if (msg.type === 'new_task') {
        const url = msg.url;

        console.log(`Worker (ID: ${process.pid}) scraping URL: ${url}`);
        let currentPage: Page | null = null; // Specify Page type for currentPage
        try {
          // currentPage = await browser!.newPage(); // Create new page for each task
          currentPage = await context!.newPage(); // Create new page for each task
          await currentPage.waitForTimeout(Math.random() * 2000 + 500); // Randomly wait to bypass captcha

          const result = await scraper(url, currentPage); // Passed URL and Page

          // eslint-disable-next-line no-undef
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          // Send the result back using the 'keywordContexts' property name
          parentPort!.postMessage({
            type: 'task_complete',
            url: url,
            cleanedText: result,
            keywordContexts: {}, // result is already ScraperResult
          } as WorkerToMainMessage);
        } catch (e: any) {
          console.error(`Worker (ID: ${process.pid}) error scraping ${url}:`, e);
          parentPort!.postMessage({
            type: 'task_error',
            url: url,
            message: e.message || 'Unknown error',
          } as WorkerToMainMessage);
        } finally {
          if (currentPage && !currentPage.isClosed()) {
            // Ensure page is not already closed
            await currentPage.close();
            console.log(`Worker (ID: ${process.pid}) closed page for ${url}.`);
          }
          // Request next task after current one is processed (or errored)
          parentPort!.postMessage({ type: 'request_task' } as WorkerToMainMessage);
        }
      } else if (msg.type === 'terminate') {
        console.log(
          `Worker (ID: ${process.pid}) received termination signal. Initiating shutdown.`,
        );
        isShuttingDown = true;
        // Perform cleanup
        if (browser) {
          await browser.close();
          console.log(`Worker (ID: ${process.pid}) browser closed.`);
        }
        // Confirm termination to the main thread
        parentPort!.postMessage({ type: 'worker_terminated' } as WorkerToMainMessage);
        process.exit(0); // Exit gracefully
      }
    });
  } catch (error: any) {
    console.error(
      `Worker (ID: ${process.pid}) failed to initialize or encountered unhandled error during setup:`,
      error,
    );
    if (parentPort) {
      parentPort.postMessage({
        type: 'task_error',
        url: 'initialization',
        message: error.message || 'Worker initialization failed',
      } as WorkerToMainMessage);
    }
    if (browser) {
      console.log(`Worker (ID: ${process.pid}) closing browser on unhandled error.`);
      await browser.close();
    }
    process.exit(1);
  }
})();

// Handle worker exit to ensure browser is closed if something goes wrong
if (parentPort) {
  parentPort.on('close', async () => {
    console.log(`Worker (ID: ${process.pid}) parentPort closed. Initiating emergency shutdown.`);
    isShuttingDown = true;
    if (browser) {
      await browser.close();
      console.log(`Worker (ID: ${process.pid}) browser closed on parentPort close.`);
    }
    // No process.exit(0) here, as parentPort.on('close') is an event handler
    // for when the parent port itself closes, signaling an external shutdown
    // or unhandled termination from the main thread.
  });
}
