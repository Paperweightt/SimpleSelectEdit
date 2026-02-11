import { system } from "@minecraft/server"
import { Vector } from "../utils/vector.js"
import { Particle } from "../utils/particle.js"
import { BLOCK_PARTICLE, TYPE_IDS } from "../constants.js"

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
        const ro = getEyeLocation(player)
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
     * @param {Selection} selection
     */
    static remove(selection) {
        delete list[selection.id]
    }

    static innit() {
        system.runInterval(() => {
            for (const selection of this.getAll()) {
                selection.display()
            }
        })
    }

    /** @type {import("@minecraft/server").RGB}*/
    lineRGB = Selection.defaultLineRGB

    /**
     * @param {Vector} location
     * @param {Vector} size
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(location, size, dimension) {
        this.displayLocation = location
        this.size = size
        this.location = location
        this.dimension = dimension
        this.id = Math.floor(Math.random() * 10000000)

        Selection.list[this.id] = this
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

    display() {
        Particle.boxFaces(BLOCK_PARTICLE.BASIC, this.displayLocation, this.size, this.dimension)
        Particle.boxEdges(
            TYPE_IDS.LINE,
            this.displayLocation,
            this.size,
            this.dimension,
            0.1,
            0.05,
            this.lineRGB,
        )
    }
}

Selection.innit()

function getEyeLocation(player) {
    const headModelSize = 8
    const headHeight = headModelSize / 32
    const location = player.getHeadLocation()

    location.y += headHeight / 2 - 0.022

    return location
}
