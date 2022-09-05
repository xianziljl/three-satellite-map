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

    /**
     * 从池中获取一个 worker，池中没有时将会创建，每个 worker 被使用的次数时均匀的。
     * @param initMessage 创建 worker 时需要给传递给 worker 的初始化信息。
     * @returns Worker
     */

    public getWorker(initMessage?: any, transferableObjects?: any[]): Worker {
        const { workers, useTimes, size } = this;

        if (workers.length < size) {
            const worker = new this.factory();
            if (initMessage) {
                worker.postMessage(initMessage, transferableObjects);
            }
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

    public dispose() {
        this.workers.forEach(worker => worker.terminate());
        this.workers.length = 0;
    }
}