export class LootTable {
    constructor(seed) {
        this.list = []
        this.weight = 0
        this.sorted = false
        this.weighted = false
        this.seed = seed
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number} - float in the range [0,1]
     */
    getRandom(x, y, z) {
        if (!this.seed) return Math.random()

        // modified from chatgpt
        // Convert everything to 32-bit ints
        let h = x * 374761393 + y * 668265263 + z * 2147483647 + this.seed * 2654435761
        h = (h ^ (h >> 13)) * 1274126177
        h = h ^ (h >> 16)
        // spat out a value between 0,0.5 so we are multiplying it by 2
        return ((h >>> 0) / 4294967296) * 2 // float in [0,1)
    }

    saveWeight() {
        this.weighted = true
        this.weight = this.list.reduce((accum, value) => accum + value.weight, 0)
    }

    /**
     * @param {any} value
     * @param {number} weight
     */
    add(value, weight) {
        this.list.push({ value, weight })
        this.sorted = false
        this.weighted = false
    }

    sortList() {
        this.sorted = true
        this.list = this.list.sort((a, b) => b.weight - a.weight)
    }

    /**
     * @param {import("./vector.js").Vector} location
     * @returns {any}
     */
    roll(location) {
        const { x, y, z } = location
        if (!this.sorted) this.sortList()
        if (!this.weighted) this.saveWeight()

        let accum = 0
        const roll = Math.ceil(this.getRandom(x, y, z) * this.weight)

        for (const { value, weight } of this.list) {
            accum += weight
            if (accum >= roll) return value
        }
    }
}
