// This return the amount of tokens used
type Job = {
  charCount: number;
  run: () => Promise<any>;
}

export default class OpenAIQueue {
  private tokenLimit = 200_000;
  private interval = 60_000;
  private maxConcurrent = 5;
  private runningJobs = 0;
  private queue: Job[] = [];
  private startTime;

  enqueue(job: Job) {
    this.queue.push(job);
  }

  private getCurrentTokenUsage(): number {
    const now = Date.now();
    this.tokenLog = this.tokenLog.filter((t) => now - t.timestamp < this.windowMS);
    return this.tokenLog.reduce((sum, t) => sum + t.tokens, 0);
  }

  private async processQueue() {

    while (this.queue.length > 0) {
      const now = Date.now();

      if (!this.startTime) this.startTime = now;
      else if (now - this.startTime <) {

      }

    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}