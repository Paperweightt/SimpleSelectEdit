import { system } from "@minecraft/server"

export class JobManager {
    isPaused = false
    promise
    resolve
    timeoutId
    jobId
    reject
    previousValue

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

    *runSession(input) {
        while (true) {
            const { done, value } = this.iterator.next(input)

            if (done) {
                this.resolve(value)
                return
            }

            if (this.isPaused) return

            if (value && typeof value.then === "function") {
                value
                    .then((res) => {
                        this.jobId = system.runJob(this.runSession(res))
                    })
                    .catch((err) => this.reject(err))
                return
            }

            if (typeof value === "number") {
                this.timeoutId = system.runTimeout(() => {
                    this.jobId = system.runJob(this.runSession())
                }, value)
                return
            }

            yield

            input = value
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
