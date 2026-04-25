import { system } from "@minecraft/server"

export class JobManager {
    isPaused = false
    isValid = true
    promise
    resolve
    jobId
    reject
    startTime = +new Date()
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
        const iterator = this.iterator

        while (true) {
            const result = iterator.next(input)

            if (result.done) {
                const stop = Date.now()
                const ticks = Math.round((stop - this.startTime) / 50)

                this.resolve({ value: result.value, ticks })
                this.isValid = false
                return
            }

            const value = result.value

            if (this.isPaused) {
                this.resumeInput = value
                return
            }

            if (value && value.then) {
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

    async cancel() {
        if (this.jobId) system.clearJob(this.jobId)

        this.isPaused = true
        this.isValid = false

        this.reject("execution cancled")

        try {
            await this.promise
        } catch (error) {}
    }

    /**
     * @returns {Promise<{value:any,ticks:number}>}
     */
    result() {
        return this.promise
    }
}
