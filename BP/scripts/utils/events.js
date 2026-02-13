import { world } from "@minecraft/server"

/**
 * @template T
 */
export class Event {
    constructor() {
        /** @type {Set<(data: T) => void>} */
        this.listeners = new Set()
    }

    /**
     * @param {(data: T) => void} fn
     */
    subscribe(fn) {
        this.listeners.add(fn)
    }

    /**
     * @param {(data: T) => void} fn
     */
    unsubscribe(fn) {
        this.listeners.delete(fn)
    }

    /**
     * @param {T} data
     */
    emit(data) {
        for (const fn of this.listeners) {
            fn(data)
        }
    }
}

/**
 * @template T
 */
export class MinPriorityEvent {
    constructor() {
        /**
         * @type {{
         *   priority: number | ((data: T) => number),
         *   callback: (data: T) => void
         * }[]}
         */
        this.listeners = []
    }

    /**
     * @param {{
     *   priority?: number | ((data: T) => number),
     *   callback: (data: T) => void
     * }} param0
     */
    subscribe({ priority = 0, callback }) {
        this.listeners.push({ priority, callback })
    }

    /**
     * @param {(data: T) => void} callback
     */
    unsubscribe(callback) {
        this.listeners = this.listeners.filter((l) => l.callback !== callback)
    }

    /**
     * @param {T} data
     */
    emit(data) {
        let best = null
        let bestPriority = Infinity

        for (const listener of this.listeners) {
            const p =
                typeof listener.priority === "function"
                    ? listener.priority(data)
                    : listener.priority

            if (p < bestPriority) {
                bestPriority = p
                best = listener.callback
            }
        }

        if (best) best(data)
    }
}
