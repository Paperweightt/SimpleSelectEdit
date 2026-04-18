import { system, BlockVolume } from "@minecraft/server"
import { Vector } from "../utils/vector.js"
import { Particle } from "../utils/particle.js"
import { PlayerUtils } from "../utils/player.js"
import { TYPE_IDS } from "../constants.js"

export class Selection {
    /**
     * @type {Record<number,Selection>}
     */
    static list = {}

    static defaultLineRGB = {
        red: 1,
        green: 1,
        blue: 1,
    }

    /**
     * @param {import("@minecraft/server").Player}
     * @returns {{distance:number,selection:Selection}|undefined}
     */
    static getPlayerViewBox(player) {
        const ro = PlayerUtils.getEyeLocation(player)
        const rd = Vector.normalize(player.getViewDirection())
        let output

        for (const selection of this.getAll()) {
            const rayResult = selection.rayIntersectsAABB(ro, rd)
            if (!rayResult) continue

            if (!output || rayResult.distance < output.distance) {
                output = rayResult
            }
        }

        return output
    }

    /**
     * @returns {Selection[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {number} id
     * @returns {Selection}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @param {Selection} selection
     */
    static remove(selection) {
        selection.remove()
    }

    static innit() {
        system.runInterval(() => {
            for (const selection of this.getAll()) {
                selection.display()
            }
        })
    }

    /**
     * @param {number[]} snapshot
     * @param {import('@minecraft/server').Dimension} dimension
     */
    static parseSnapshot(snapshot, dimension) {
        const id = snapshot[0]
        const size = new Vector(snapshot.slice(1, 4))
        const location = new Vector(snapshot.slice(4, 7))

        return new Selection(location, size, dimension, id)
    }

    /**
     * @param {number[]} snapshot
     * @param {import('@minecraft/server').Dimension} dimension
     * @returns {{location:Vector,size:Vector,id:number}}
     */
    static getSnapshotData(snapshot) {
        const id = snapshot[0]
        const size = new Vector(snapshot.slice(1, 4))
        const location = new Vector(snapshot.slice(4, 7))

        return { id, location, size }
    }

    /** @type {import("@minecraft/server").RGB}*/
    lineRGB = Selection.defaultLineRGB
    rotation = { y: 0, p: 0, r: 0 }

    /** @type {boolean}*/
    isOwned = false

    /**
     * @param {Vector} location
     * @param {Vector} size
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(location, size, dimension, id = undefined) {
        this.size = size
        this.location = location
        this.dimension = dimension
        this.displayLocation = new Vector(location)
        this.id = id ?? Math.floor(Math.random() * 10000000)

        Selection.list[this.id] = this
    }

    /**
     * @returns {import("@minecraft/server").BlockVolume}
     */
    getBlockVolume() {
        const max = Vector.add(this.size, this.location).subtract(1)
        const volume = new BlockVolume(this.location, max)
        return volume
    }

    /**
     * @param {Vector} [direction=new Vector(1)]
     * @param {"xyz"|"xzy"|"yxz"|"yzx"|"zxy"|"zyx"} [order="xyz"]
     * @returns {Iterable.<Vector>}
     */
    *getIterator(direction = new Vector(1), order = "xyz") {
        const { start, end } = this.getStartEnd()

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
     * @param {{y:number,p:number,r:number}} rotation
     * @param {Vector} pivot
     */
    rotate(rotation, pivot) {
        let min = new Vector(Infinity)
        let max = new Vector(-Infinity)

        for (let corner of this.getCorners()) {
            corner = Vector.rotate(corner, rotation, pivot)

            min = Vector.min(corner, min)
            max = Vector.max(corner, max)
        }

        min.floor()
        max.ceil()

        this.location = min
        this.size = Vector.subtract(max, min).add(1)
    }

    /**
     * @returns {Vector[]}
     */
    getCorners() {
        const { start, end } = this.getStartEnd()

        return [
            start,
            end,
            new Vector(start).setX(end.x),
            new Vector(start).setY(end.y),
            new Vector(start).setZ(end.z),
            new Vector(end).setX(start.x),
            new Vector(end).setY(start.y),
            new Vector(end).setZ(start.z),
        ]
    }

    snapshot() {
        return [this.id, ...this.size.copy().getList(), ...this.location.copy().getList()]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {{distance:number,selection:Selection}}
     */
    rayIntersectsAABB(ro, rd) {
        const min = this.location
        const max = Vector.add(this.location, this.size)

        let tmin = -Infinity
        let tmax = Infinity

        for (const axis of ["x", "y", "z"]) {
            if (Math.abs(rd[axis]) < 1e-8) {
                // Ray is parallel to this axis — reject if origin is outside the slab
                if (ro[axis] < min[axis] || ro[axis] > max[axis]) {
                    return null
                }
            } else {
                const invD = 1 / rd[axis]
                let t1 = (min[axis] - ro[axis]) * invD
                let t2 = (max[axis] - ro[axis]) * invD

                if (t1 > t2) [t1, t2] = [t2, t1] // swap

                tmin = Math.max(tmin, t1)
                tmax = Math.min(tmax, t2)

                if (tmin > tmax) return null // no hit
            }
        }

        if (tmax < 0) return null // box is behind the ray

        const distance = tmin >= 0 ? tmin : tmax
        return {
            distance,
            selection: this,
        }
    }

    /** @returns {Vector} */
    getPivot() {
        return Vector.subtract(this.size, 1).divide(2).add(this.location)
    }

    /**
     * @returns {{start:Vector,end:Vector}}
     */
    getStartEnd() {
        return {
            start: new Vector(this.location),
            end: Vector.add(this.location, this.size).subtract(1),
        }
    }

    getDisplayPivot() {
        return Vector.subtract(this.size, 1).divide(2).add(this.displayLocation)
    }

    display() {
        // if (this.rotation.p === 0 && this.rotation.y === 0 && this.rotation.r === 0)
        //     Particle.boxFaces(
        //         BLOCK_PARTICLE.BASIC,
        //         this.location,
        //         this.size,
        //         this.dimension,
        //     )

        Particle.boxEdges(
            TYPE_IDS.LINE,
            this.displayLocation,
            this.size,
            this.dimension,
            0.1,
            0.05,
            this.lineRGB,
            this.rotation,
            this.getDisplayPivot(),
        )
    }

    remove() {
        delete Selection.list[this.id]
    }
}

Selection.innit()
