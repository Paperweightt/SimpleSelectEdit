export class Filter {
    typeCache = {}

    /**
     * @param {"blacklist"|"whitelist"} type
     * @param {string[]} typeIds
     */
    constructor(type, typeIds) {
        this.type = type

        for (const type of typeIds) {
            this.typeCache[type] = true
        }
    }

    /**
     * @param {string} typeId
     * @returns {boolean}
     */
    accepts(typeId) {
        switch (this.type) {
            case "blacklist":
                if (this.typeCache[typeId]) {
                    return false
                } else {
                    return true
                }
            case "whitelist":
                if (!this.typeCache[typeId]) {
                    return false
                } else {
                    return true
                }
            case "none":
                return true
        }
    }

    add(typeId) {
        this.typeCache[typeId] = true
    }
}
