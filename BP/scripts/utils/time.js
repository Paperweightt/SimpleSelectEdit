import { system } from "@minecraft/server"

export class JobManager {
    isPaused = false
    isValid = true
    promise
    resolve
    timeoutId
    jobId
    reject
    previousValue
    resumeInput

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
                this.isValid = false
                return
            }

            if (this.isPaused) {
                this.resumeInput = value
                return
            }

            if (value && typeof value.then === "function") {
                value
                    .then((res) => {
                        this.jobId = system.runJob(this.runSession(res))
                    })
                    .catch((err) => this.reject(err))
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
        if (this.isPaused) {
            this.isPaused = false
            system.runJob(this.runSession(this.resumeInput))
        }
    }

    cancel() {
        system.clearJob(this.jobId)
        system.clearRun(this.timeoutId)

        this.isPaused = true
        this.isValid = false

        this.reject()
    }

    async result() {
        return this.promise
    }
}
