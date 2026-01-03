// TaskQueue Utility
export class TaskQueue {
    private queue: (() => Promise<void>)[] = [];
    private isProcessing = false;
    private concurrency = 1;
  
    constructor(concurrency = 1) {
      this.concurrency = concurrency;
    }
  
    add(task: () => Promise<void>) {
      this.queue.push(task);
      this.process();
    }
  
    // Clears the entire queue (used when unmounting/stopping)
    clear() {
        this.queue = [];
    }
  
    private async process() {
      if (this.isProcessing) return;
      this.isProcessing = true;
  
      while (this.queue.length > 0) {
        // Run tasks up to concurrency limit
        // For simplicity/safety on Mobile JS, we currently do 1-by-1 or batch
        const task = this.queue.shift();
        if (task) {
          try {
            await task();
            // Small gap to breathe
            await new Promise(r => setTimeout(r, 50)); 
          } catch (e) {
            console.warn('[TaskQueue] Task failed', e);
          }
        }
      }
  
      this.isProcessing = false;
    }
  }
