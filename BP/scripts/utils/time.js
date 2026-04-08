import { system } from "@minecraft/server"

export class JobManager {
    isPaused = false
    promise
    resolve
    timeoutId
    jobId
    reject

    /**
     * @param {Generator<void,void,void>} iterator
     * @param {boolean} [start]
     */
    constructor(iterator, start = true) {
        this.iterator = iterator

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })

        if (start) this.start()
    }

    *runSession() {
        const data = this.iterator.next()

        if (data.done) {
            this.resolve(data.value)
            return
        }

        if (this.isPaused) {
            return
        }

        if (!data.value || data.value === 0) {
            yield
        } else {
            this.timeoutId = system.runTimeout(() => {
                this.jobId = system.runJob(this.runSession())
            }, data.value)
            return
        }
    }

    start() {
        this.jobId = system.runJob(this.runSession())
    }

    pause() {
        this.isPaused = true
    }

    resume() {
        this.isPaused = false
        system.runJob(this.runSession())
    }

    cancel() {
        system.clearJob(this.jobId)
        system.clearRun(this.timeoutId)

        this.reject()
    }

    async result() {
        return this.promise
    }
}
