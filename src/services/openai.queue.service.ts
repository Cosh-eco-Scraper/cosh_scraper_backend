import { randomUUID } from "crypto";

interface Job {
  charCount: number;
  run: () => Promise<any>;
}

interface QueueJob extends Job {
  id: string;
  tokenCount: number;
}

export default class OpenAIQueue {
  private tokenLimit = 200_000;
  private interval = 60_000;
  private maxConcurrent = 10;
  private runningJobs = 0;
  private intervalTokens = 0;
  private queue: QueueJob[] = [];
  private startTime = Date.now();

  enqueue(job: Job) {
    this.queue.push({
      ...job,
      id: randomUUID() as string,
      tokenCount: job.charCount / 4,
    });
  }

  /**
   * Goal: create a queue that will solve as many jobs as possible given a certain token limit throttle
   * Input: array of all jobs to solve (Job[])
   * Function steps:
   *  - 
   * Ouput: void
   */

  async processQueue() {
    return new Promise<void>((resolve) => {
      const tryProcess = async () => {
        if (this.queue.length === 0 && this.runningJobs === 0) {
          return resolve();
        }
  
        const now = Date.now();
        if (now - this.startTime > this.interval) {
          this.intervalTokens = 0;
          this.startTime = now;
        }
  
        while  (
          this.runningJobs < this.maxConcurrent &&
          this.queue.length > 0 &&
          this.intervalTokens + this.queue[0].tokenCount <= this.tokenLimit
        ) {
          const job = this.queue.shift()!;
          this.runningJobs++;
          this.intervalTokens += job.tokenCount;
  
          job
            .run()
            .then(() => console.log(`Finished job-${job.id}`))
            .catch((err) => console.error(`Failed job-${job.id}:`, err))
            .finally(() => {
              this.runningJobs--;
              setImmediate(tryProcess);
            })
        }
  
        if (
          this.queue.length > 0 &&
          (this.intervalTokens + this.queue[0].tokenCount > this.tokenLimit || this.runningJobs >= this.maxConcurrent)
        ) {
          const waitTokenLimit = Math.max(0, this.interval - (now - this.startTime));
          const delay = this.runningJobs >= this.maxConcurrent ? 500 : waitTokenLimit;
          console.log(`Waiting ${delay}ms for token reset or free slot`);
          setTimeout(tryProcess, delay);
        }
      };
  
      this.startTime = Date.now();
      void tryProcess();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}