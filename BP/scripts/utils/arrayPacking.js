/**
 * @typedef {Object} zipList
 * @property {[number, number, string]}
 */

export class Pack {
    /**
     * @param {number[]} values | positive numbers
     * @returns {zipList}
     */
    static zipList(values) {
        const [header, tail, length] = RAns.encode(values)
        const encodedHeader = Base92.encode(this.bigIntToBytes(header))

        return [encodedHeader.toString(), this.lowEntropyZip(tail), length]
    }

    /**
     * @param {zipList} zipList
     * @returns {number[]}
     */
    static unzipList([header, tailZipped, length]) {
        const decodedHeader = this.bytesToBigInt(Base92.decode(header))
        const tail = this.lowEntropyUnzip(tailZipped)
        return RAns.decode([decodedHeader, tail, length])
    }

    /**
     * @param {number[]} values | positive numbers
     * @returns {zipList}
     */
    static lowEntropyZip(values) {
        const max = Math.max(...values)
        const bits = Math.ceil(Math.log2(max + 1))
        const bytes = Pack.intArrayToBytes(values, bits)

        return [values.length, bits, Base92.encode(bytes)]
    }

    /**
     * @param {zipList} zipList
     * @returns {number[]}
     */
    static lowEntropyUnzip([length, bits, string]) {
        const bytes = Base92.decode(string)
        const list = Pack.bytesToIntArray(bytes, bits)

        if (list.length === 0) return [0]
        list.splice(length)

        return list
    }

    /**
     * @param {number[]} values | positive numbers
     * @param {number} bits | highest encoded bit Math.ceil(Math.log2(max + 1))
     * @returns {Uint8Array}
     */
    static intArrayToBytes(values, bits) {
        let bitBuffer = 0
        let bitCount = 0
        const bytes = []

        for (const v of values) {
            bitBuffer = (bitBuffer << bits) | v
            bitCount += bits

            while (bitCount >= 8) {
                bitCount -= 8
                const byte = (bitBuffer >> bitCount) & 0xff
                bytes.push(byte)
            }
        }

        // leftover bits
        if (bitCount > 0) {
            bytes.push((bitBuffer << (8 - bitCount)) & 0xff)
        }

        return Uint8Array.from(bytes)
    }

    static bigIntToBytes(n) {
        if (n < 0n) throw new Error("Only unsigned BigInt supported")

        if (n === 0n) return new Uint8Array([0])

        const bytes = []
        while (n > 0n) {
            bytes.push(Number(n & 0xffn))
            n >>= 8n
        }
        bytes.reverse() // big-endian
        return Uint8Array.from(bytes)
    }

    static bytesToBigInt(bytes) {
        let n = 0n
        for (const b of bytes) {
            n = (n << 8n) | BigInt(b)
        }
        return n
    }

    /**
     * @param {Uint8Array} bytes |
     * @param {number} bits | highest encoded bit Math.ceil(Math.log2(max + 1))
     * @returns {number[]}
     */
    static bytesToIntArray(bytes, bits) {
        const mask = (1 << bits) - 1

        const values = []
        let bitBuffer = 0
        let bitCount = 0

        for (const byte of bytes) {
            bitBuffer = (bitBuffer << 8) | byte
            bitCount += 8

            // extract as many integers as possible
            while (bitCount >= bits) {
                bitCount -= bits
                const value = (bitBuffer >> bitCount) & mask
                values.push(value)
            }
        }

        return values
    }
}

export const Base92 = (() => {
    const ALPHABET =
        " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{}~"

    const INDEX = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]))
    const BASE = 92
    const DELIM = "|" // not in ALPHABET

    function encodeLength(n) {
        if (n === 0) return ALPHABET[0]
        let s = ""
        while (n > 0) {
            s = ALPHABET[n % BASE] + s
            n = Math.floor(n / BASE)
        }
        return s
    }

    function decodeLength(s) {
        let n = 0
        for (const c of s) {
            n = n * BASE + INDEX[c]
        }
        return n
    }

    return {
        /**
         * @param {Uint8Array} bytes
         * @returns {string}
         */
        encode(bytes) {
            let result = ""
            let value = 0
            let bits = 0

            for (const b of bytes) {
                value = (value << 8) | b
                bits += 8

                while (bits >= 13) {
                    bits -= 13
                    const chunk = (value >> bits) & 0x1fff
                    const hi = Math.floor(chunk / BASE)
                    const lo = chunk % BASE
                    result += ALPHABET[hi] + ALPHABET[lo]
                }
            }

            if (bits > 0) {
                const chunk = (value << (13 - bits)) & 0x1fff
                const hi = Math.floor(chunk / BASE)
                const lo = chunk % BASE
                result += ALPHABET[hi] + ALPHABET[lo]
            }

            // prefix length
            return encodeLength(bytes.length) + DELIM + result
        },

        /**
         * @param {string} str
         * @returns {Uint8Array}
         */
        decode(str) {
            const sep = str.indexOf(DELIM)
            if (sep === -1) throw new Error("Missing length prefix")

            const byteLen = decodeLength(str.slice(0, sep))
            const payload = str.slice(sep + 1)

            let value = 0
            let bits = 0
            const bytes = []

            for (let i = 0; i < payload.length; i += 2) {
                const hi = INDEX[payload[i]]
                const lo = INDEX[payload[i + 1]]
                const chunk = hi * BASE + lo

                value = (value << 13) | chunk
                bits += 13

                while (bits >= 8) {
                    bits -= 8
                    bytes.push((value >> bits) & 0xff)
                }
            }

            // trim padding
            return new Uint8Array(bytes.slice(0, byteLen))
        },
    }
})()

export class RAns {
    static encode(values, freq, cumul, M) {
        freq = freq || this.#getFreq(values)
        cumul = cumul || this.#getCumul(freq.list)
        M = M || Object.values(freq.map).reduce((a, v) => a + v, 0)

        let x = 0n

        for (const s of values) {
            x = this.#encodeStep(x, s, freq.map, cumul.map, M)
        }

        return [x, freq.list, values.length]
    }

    static #encodeStep(xPrev, s, freq, cumul, M) {
        let blockId
        blockId = xPrev / BigInt(freq[s])
        const slot = BigInt(cumul[s]) + (xPrev % BigInt(freq[s]))
        const x = blockId * BigInt(M) + slot

        return x
    }

    static decode([values, freqList, length]) {
        const cumul = this.#getCumul(freqList).list
        let M = 0
        const newValues = []
        let xPrev = values
        let s

        for (let i = 0; i < freqList.length; i += 2) {
            M += freqList[i + 1]
        }

        for (let i = 0; i < length; i++) {
            ;[s, xPrev] = this.#decodeStep(xPrev, freqList, cumul, M)
            newValues.push(freqList[s * 2])
        }

        return newValues.reverse()
    }

    static #decodeStep(x, freq, cumul, M) {
        const blockId = x / BigInt(M)
        const slot = x % BigInt(M)
        const s = this.#getBin(cumul, slot)
        const xPrev = blockId * BigInt(freq[s * 2 + 1]) + BigInt(slot) - BigInt(cumul[s])

        return [s, xPrev]
    }

    static #getCumul(freqList) {
        const list = []
        const map = {}
        let sum = 0

        for (let i = 0; i < freqList.length; i += 2) {
            const key = freqList[i]
            const value = freqList[i + 1]

            map[key] = sum
            list.push(sum)

            sum += value
        }

        return { map, list }
    }

    static #getFreq(values) {
        const map = {}
        const list = []

        for (const value of values) {
            map[value] = (map[value] || 0) + 1
        }

        // this.normalize(map, 96)

        for (const [key, value] of Object.entries(map)) {
            list.push(+key)
            list.push(value)
        }

        return { map, list }
    }

    static #getBin(cumul, slot) {
        let lo = 0
        let hi = cumul.length - 1 // last valid symbol

        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2)

            if (slot < cumul[mid]) {
                hi = mid - 1
            } else if (slot >= cumul[mid + 1]) {
                lo = mid + 1
            } else {
                return mid
            }
        }

        throw new Error("slot out of range")
    }

    static normalize(rawFreq, M) {
        const rawM = Object.values(rawFreq).reduce((a, v) => a + v, 0)
        const multiplier = M / rawM

        for (const value in rawFreq) {
            const newValue = Math.round(rawFreq[value] * multiplier)
            rawFreq[value] = Math.max(1, newValue)
        }

        // for (let i = 0; i < rawFreq.list.length; i += 2) {
        //     const newValue = Math.round(rawFreq.list[i + 1] * multiplier)
        //     rawFreq.list[i + 1] = newValue
        // }
    }
}

export const Delta = {
    /**
     * @param {number[]} array
     * @returns {number[]}
     */
    encode(array) {
        const newArray = [array[0]]

        for (let i = 1; i < array.length; i++) {
            newArray[i] = array[i] - array[i - 1]
        }

        return newArray
    },
    /**
     * @param {number[]} array
     * @returns {number[]}
     */
    decode(array) {
        const newArray = []
        let sum = 0

        for (let i = 0; i < array.length; i++) {
            sum += array[i]
            newArray[i] = sum
        }

        return newArray
    },
}
