export class WorkerPool {
    public workers: Worker[];
    public size: number;
    public useTimes: number[];
    public factory: new () => Worker;

    constructor(factory: new () => Worker, size = 2) {
        this.workers = [];
        this.size = size;
        this.useTimes = new Array(size).fill(0);
        this.factory = factory;
    }

    public getWorker(): Worker {
        const { workers, useTimes, size } = this;

        if (workers.length < size) {
            const worker = new this.factory();
            useTimes[workers.length] = 1;
            workers.push(worker);
            return worker;
        }

        let min = Infinity;
        let index = 0;
        useTimes.forEach((t, i) => {
            if (t < min) {
                min = t;
                index = i;
            }
        })
        useTimes[index]++;
        return workers[index];
    }
}