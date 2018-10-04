namespace TSOS {
  export class Segment {
    /**
     *
     * @param base the first usable address of the Segment
     * @param limit the last usable address of the Segment
     */
    constructor(readonly base: string, readonly limit: string) {}
  }
}
