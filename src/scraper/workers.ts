import { parentPort, workerData } from 'worker_threads';
import dotenv from 'dotenv';
import { Browser, chromium } from 'playwright';
import { scraper } from './scraper';

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

const { location, delayMs } = workerData;

let browser: Browser | null = null;
let isShuttingDown = false; // Flag to prevent new tasks during shutdown

(async () => {
  if (!parentPort) {
    console.error('Worker does not have a parent port. This worker should be run as a thread.');
    process.exit(1);
  }

  try {
    browser = await chromium.launch({ headless: true });
    console.log(`Worker (ID: ${process.pid}) started and ready.`);

    // Signal to the main thread that this worker is ready for a task
    parentPort.postMessage({ type: 'worker_ready' } as WorkerToMainMessage); // Changed to 'worker_ready'

    parentPort.on('message', async (msg: MainToWorkerMessage) => {
      if (isShuttingDown) {
        console.log(`Worker (ID: ${process.pid}) received message while shutting down. Ignoring.`);
        return; // Ignore messages if already in shutdown sequence
      }

      if (msg.type === 'new_task') {
        const url = msg.url;

        console.log(`Worker (ID: ${process.pid}) scraping URL: ${url}`);
        let currentPage = null;
        try {
          currentPage = await browser!.newPage(); // Create new page for each task

          const result = await scraper(url, location, currentPage);

          // eslint-disable-next-line no-undef
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          parentPort!.postMessage({
            type: 'task_complete',
            url: url,
            snippets: result ? result.snippets : [],
          } as WorkerToMainMessage);
        } catch (e: any) {
          console.error(`Worker (ID: ${process.pid}) error scraping ${url}:`, e);
          parentPort!.postMessage({
            type: 'task_error',
            url: url,
            message: e.message || 'Unknown error',
          } as WorkerToMainMessage);
        } finally {
          if (currentPage) {
            await currentPage.close();
            console.log(`Worker (ID: ${process.pid}) closed page for ${url}.`);
          }
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
        // NEW: Confirm termination to the main thread
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
//just a little change

// Handle worker exit to ensure browser is closed if something goes wrong
if (parentPort) {
  parentPort.on('close', async () => {
    console.log(`Worker (ID: ${process.pid}) parentPort closed. Initiating emergency shutdown.`);
    isShuttingDown = true;
    if (browser) {
      await browser.close();
      console.log(`Worker (ID: ${process.pid}) browser closed on parentPort close.`);
    }
  });
}
