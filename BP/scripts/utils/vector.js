export class Vector {
    constructor(x = 0, y, z) {
        if (Array.isArray(x)) {
            this.x = x[0]
            this.y = x[1]
            this.z = x[2]
        } else if (x.x !== undefined) {
            this.x = x.x
            this.y = x.y
            this.z = x.z
        } else if (y === undefined) {
            this.x = x
            this.y = x
            this.z = x
        } else {
            this.x = x
            this.y = y
            this.z = z
        }
    }

    /**
     * @param {Vector} start
     * @param {Vector} end
     * @param {Vector} [direction=new Vector(1)]
     * @param {"xyz"|"xzy"|"yxz"|"yzx"|"zxy"|"zyx"} [order="xyz"]
     * @returns {Iterable.<Vector>}
     */
    static *iterator(start, end, direction = new Vector(1), order = "xyz") {
        ;[start, end] = [Vector.min(start, end), Vector.max(start, end)]

        const iterators = {
            x: function* () {
                if (direction.x === 1) {
                    for (let x = start.x; x <= end.x; x++) yield x
                } else {
                    for (let x = end.x; x >= start.x; x--) yield x
                }
            },
            y: function* () {
                if (direction.y === 1) {
                    for (let y = start.y; y <= end.y; y++) yield y
                } else {
                    for (let y = end.y; y >= start.y; y--) yield y
                }
            },
            z: function* () {
                if (direction.z === 1) {
                    for (let z = start.z; z <= end.z; z++) yield z
                } else {
                    for (let z = end.z; z >= start.z; z--) yield z
                }
            },
        }

        for (const a of iterators[order[0]]()) {
            for (const b of iterators[order[1]]()) {
                for (const c of iterators[order[2]]()) {
                    const location = new Vector()

                    location[order[0]] = a
                    location[order[1]] = b
                    location[order[2]] = c

                    yield location
                }
            }
        }
    }

    /**
     * @param {Vector} a
     * @param {String} string
     */
    static stringToVector(string) {
        switch (string.toLowerCase()) {
            case "up":
                return new Vector(0, 1, 0)
            case "above":
                return new Vector(0, 1, 0)
            case "down":
                return new Vector(0, -1, 0)
            case "below":
                return new Vector(0, -1, 0)
            case "east":
                return new Vector(1, 0, 0)
            case "west":
                return new Vector(-1, 0, 0)
            case "north":
                return new Vector(0, 0, -1)
            case "south":
                return new Vector(0, 0, 1)
            default:
                return new Vector(0, 0, 0)
        }
    }

    static max(a, b) {
        return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z))
    }

    static min(a, b) {
        return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z))
    }

    static abs(a) {
        return new Vector(Math.abs(a.x), Math.abs(a.y), Math.abs(a.z))
    }

    static removeDuplicates(a) {
        const b = {}
        return a.filter(({ x, y, z }) => (b[[x, y, z]] ? false : (b[[x, y, z]] = true)))
    }

    static normalize(a) {
        const distance = Math.hypot(a.x, a.y, a.z)
        return new Vector(a.x / distance, a.y / distance, a.z / distance)
    }

    static crossProduct(a, b) {
        return new Vector(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x,
        )
    }

    static dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z
    }

    static floor(a) {
        return new Vector(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))
    }

    static ceil(a) {
        return new Vector(Math.ceil(a.x), Math.ceil(a.y), Math.ceil(a.z))
    }

    static round(a) {
        return new Vector(Math.round(a.x), Math.round(a.y), Math.round(a.z))
    }

    static trunc(a) {
        return new Vector(Math.trunc(a.x), Math.trunc(a.y), Math.trunc(a.z))
    }

    static equals(a, b) {
        if (a.x !== b.x) return false
        if (a.y !== b.y) return false
        if (a.z !== b.z) return false
        return true
    }

    static isBetween({ x, y, z }, a, b) {
        if (!((a.x < x && x < b.x) || (a.x > x && x > b.x))) return false
        if (!((a.y < y && y < b.y) || (a.y > y && y > b.y))) return false
        if (!((a.z < z && z < b.z) || (a.z > z && z > b.z))) return false
        return true
    }

    static isBetweenInclusive({ x, y, z }, a, b) {
        if (!((a.x <= x && x <= b.x) || (a.x >= x && x >= b.x))) return false
        if (!((a.y <= y && y <= b.y) || (a.y >= y && y >= b.y))) return false
        if (!((a.z <= z && z <= b.z) || (a.z >= z && z >= b.z))) return false
        return true
    }

    static multiply(a, b) {
        if (typeof b === "number") return new Vector(a.x * b, a.y * b, a.z * b)
        return new Vector(a.x * b.x, a.y * b.y, a.z * b.z)
    }

    static average(vectors) {
        let sum = new Vector(0, 0, 0)

        for (const vector of vectors) {
            sum.add(vector)
        }

        return sum.divide(vectors.length)
    }

    static divide(a, b) {
        if (typeof b === "number") return new Vector(a.x / b, a.y / b, a.z / b)
        return new Vector(a.x / b.x, a.y / b.y, a.z / b.z)
    }

    static add(a, b) {
        if (typeof b === "number") return new Vector(a.x + b, a.y + b, a.z + b)
        return new Vector(a.x + b.x, a.y + b.y, a.z + b.z)
    }

    static subtract(a, b) {
        if (typeof b === "number") return new Vector(a.x - b, a.y - b, a.z - b)
        return new Vector(a.x - b.x, a.y - b.y, a.z - b.z)
    }

    static modulus(a, b) {
        if (typeof b === "number") return new Vector(a.x % b, a.y % b, a.z % b)
        return new Vector(a.x % b.x, a.y % b.y, a.z % b.z)
    }

    static distance(a, b) {
        return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2)
    }

    static map(a, callback) {
        return new Vector(callback(a.x), callback(a.y), callback(a.z))
    }

    static rotate(location, { y: ya, p, r }, pivot = new Vector(0)) {
        const cos = Math.cos
        const sin = Math.sin

        let { x, y, z } = Vector.subtract(location, pivot)

        return new Vector(
            x * (cos(ya) * cos(p)) + y * (sin(ya) * cos(p)) + z * -sin(p),

            x * (cos(ya) * sin(p) * sin(r) - sin(ya) * cos(r)) +
                y * (sin(ya) * sin(p) * sin(r) + cos(ya) * cos(r)) +
                z * (cos(p) * sin(r)),

            x * (cos(ya) * sin(p) * cos(r) + sin(ya) * sin(r)) +
                y * (sin(ya) * sin(p) * cos(r) - cos(ya) * sin(r)) +
                z * (cos(p) * cos(r)),
        ).add(pivot)
    }

    /**
     * @param {"xyz"|"xzy"|"yxz"|"yzx"|"zxy"|"zyx"} order
     */
    setAxisOrder(order) {
        const temp = this.copy()
        this.x = temp[order[0]]
        this.y = temp[order[1]]
        this.z = temp[order[2]]

        return this
    }

    rotateYP({ y, p }) {
        const cy = Math.cos(y),
            sy = Math.sin(y)
        const cp = Math.cos(p),
            sp = Math.sin(p)

        const x = this.x * (cy * cp) + this.y * (sy * cp) - this.z * sp
        const z = this.x * sy + this.y * cy
        const y_ = this.x * (cy * sp) + this.y * (sy * sp) + this.z * cp

        this.x = x
        this.y = y_
        this.z = z
        return this
    }

    equals(a) {
        if (a.x !== this.x) return false
        if (a.y !== this.y) return false
        if (a.z !== this.z) return false
        return true
    }

    isBetween(a, b) {
        if (!((a.x < this.x && this.x < b.x) || (a.x > this.x && this.x > b.x)))
            return false
        if (!((a.y < this.y && this.y < b.y) || (a.y > this.y && this.y > b.y)))
            return false
        if (!((a.z < this.z && this.z < b.z) || (a.z > this.z && this.z > b.z)))
            return false
        return true
    }

    isBetweenInclusive(a, b) {
        if (!((a.x <= this.x && this.x <= b.x) || (a.x >= this.x && this.x >= b.x)))
            return false
        if (!((a.y <= this.y && this.y <= b.y) || (a.y >= this.y && this.y >= b.y)))
            return false
        if (!((a.z <= this.z && this.z <= b.z) || (a.z >= this.z && this.z >= b.z)))
            return false
        return true
    }

    normalize() {
        const distance = Math.hypot(this.x, this.y, this.z)
        return this.divide(distance)
    }

    multiply(b) {
        if (typeof b === "number") {
            this.x *= b
            this.y *= b
            this.z *= b
        } else {
            this.x *= b.x
            this.y *= b.y
            this.z *= b.z
        }

        return this
    }

    divide(b) {
        if (typeof b === "number") {
            this.x /= b
            this.y /= b
            this.z /= b
        } else {
            this.x /= b.x
            this.y /= b.y
            this.z /= b.z
        }

        return this
    }

    add(b) {
        if (typeof b === "number") {
            this.x += b
            this.y += b
            this.z += b
        } else {
            this.x += b.x
            this.y += b.y
            this.z += b.z
        }

        return this
    }

    subtract(b) {
        if (typeof b === "number") {
            this.x -= b
            this.y -= b
            this.z -= b
        } else {
            this.x -= b.x
            this.y -= b.y
            this.z -= b.z
        }

        return this
    }

    modulus(b) {
        if (typeof b === "number") {
            this.x %= b
            this.y %= b
            this.z %= b
        } else {
            this.x %= b.x
            this.y %= b.y
            this.z %= b.z
        }

        return this
    }

    distance(b) {
        return Math.sqrt((b.x - this.x) ** 2 + (b.y - this.y) ** 2 + (b.z - this.z) ** 2)
    }

    map(callback) {
        this.x = callback(this.x)
        this.y = callback(this.y)
        this.z = callback(this.z)

        return this
    }

    rotate({ y, p, r }) {
        const cos = Math.cos
        const sin = Math.sin

        const x =
            this.x * (cos(y) * cos(p)) + this.y * (sin(y) * cos(p)) + this.z * -sin(p)

        const _y =
            this.x * (cos(y) * sin(p) * sin(r) - sin(y) * cos(r)) +
            this.y * (sin(y) * sin(p) * sin(r) + cos(y) * cos(r)) +
            this.z * (cos(p) * sin(r))

        const z =
            this.x * (cos(y) * sin(p) * cos(r) + sin(y) * sin(r)) +
            this.y * (sin(y) * sin(p) * cos(r) - cos(y) * sin(r)) +
            this.z * (cos(p) * cos(r))

        this.x = x
        this.y = _y
        this.z = z

        return this
    }

    abs() {
        this.x = Math.abs(this.x)
        this.y = Math.abs(this.y)
        this.z = Math.abs(this.z)

        return this
    }

    coordinateSum() {
        return this.x + this.y + this.z
    }

    floor() {
        this.x = Math.floor(this.x)
        this.y = Math.floor(this.y)
        this.z = Math.floor(this.z)

        return this
    }

    ceil() {
        this.x = Math.ceil(this.x)
        this.y = Math.ceil(this.y)
        this.z = Math.ceil(this.z)

        return this
    }

    round(decimalPlaces = 0) {
        return this.map((v) => Math.round(v * 10 ** decimalPlaces) / 10 ** decimalPlaces)
    }

    copy() {
        return new Vector(this.x, this.y, this.z)
    }

    setX(x) {
        this.x = x
        return this
    }

    setY(y) {
        this.y = y
        return this
    }

    setZ(z) {
        this.z = z
        return this
    }

    getList() {
        return [this.x, this.y, this.z]
    }

    getString() {
        return `${this.x} ${this.y} ${this.z}`
    }
}
