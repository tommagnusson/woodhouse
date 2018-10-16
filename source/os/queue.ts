/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the Javascript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */

namespace TSOS {
  export class Queue {
    constructor(public q = new Array()) {}
    public getSize() {
      return this.q.length;
    }

    public isEmpty() {
      return this.q.length == 0;
    }

    public enqueue(element) {
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
      var retVal = "";
      for (var i in this.q) {
        retVal += "[" + this.q[i] + "] ";
      }
      return retVal;
    }
  }
}
