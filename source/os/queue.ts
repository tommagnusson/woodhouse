/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the Javascript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */

namespace TSOS {
  export class Queue<T> {
    constructor(public q: T[] = []) {}
    public getSize() {
      return this.q.length;
    }

    public isEmpty() {
      return this.q.length == 0;
    }

    public enqueue(element: T) {
      this.q.push(element);
    }

    public dequeue() {
      const shifted = this.q.shift();
      return shifted ? shifted : null;
    }

    public peek() {
      if (this.q.length === 0) {
        return null;
      }
      return this.q[this.q.length - 1];
    }

    public pop() {
      const popped = this.q.pop();
      return popped ? popped : null;
    }

    public toString() {
      return `[${this.q.join(', ')}]`;
    }
  }

  export interface Prioritizable {
    priority: number;
  }

  export class PriorityQueue<T extends Prioritizable> extends Queue<T> {
    public shouldPrioritize = true;

    constructor(public q: T[] = []) {
      super(q);
    }

    private determinePriority = (a, b) => a.priority - b.priority;

    public enqueue(element: T) {
      super.enqueue(element);
      if (this.shouldPrioritize) {
        // keep it sorted by priority
        this.q.sort(this.determinePriority);
      }
    }

    public setShouldPrioritize(shouldPrioritize: boolean) {
      this.shouldPrioritize = shouldPrioritize;
      if (this.shouldPrioritize) {
        this.q.sort(this.determinePriority);
      }
    }
  }
}
