import { system, world } from "@minecraft/server"
import { Arrow } from "./arrow.js"
import { Vector } from "../utils/vector.js"
import { Particle } from "../utils/particle.js"
import { BLOCK_PARTICLE, TYPE_IDS } from "../constants.js"
import "../utils/isShifting.js"

system.run(() => {
    const dim = world.getDimension("overworld")
    const start = new Vector(14, -63, -15)
    const size = new Vector(5, 1, 5)

    new Selection(start, size, dim)
})

export class Selection {
    /**
     * @type {Object<number,Selection>}
     */
    static list = {}

    static directionToRotation = {
        North: { x: 0, y: 0 },
        East: { x: 90, y: 0 },
        South: { x: 180, y: 0 },
        West: { x: 270, y: 0 },
        Down: { x: 0, y: 90 },
        Up: { x: 0, y: 270 },
    }

    /**
     * @param {number} id
     * @returns {Selection|undefined}
     */
    static get(id) {
        return this.list[id]
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

    /** @type {Record<import("@minecraft/server").Direction,Arrow>} */
    arrows = {}

    /**
     * @param {Vector} location
     * @param {Vector} size
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(location, size, dimension) {
        this.displayLocation = location
        this.size = size
        this.locatin = location
        this.dimension = dimension
        this.id = Math.floor(Math.random() * 10000000)

        this.createArrows()

        Selection.list[this.id] = this
    }

    createArrows() {
        const north = this.createArrow("North")
        const east = this.createArrow("East")
        const south = this.createArrow("South")
        const west = this.createArrow("West")
        const up = this.createArrow("Up")
        const down = this.createArrow("Down")
    }

    /**
     * @param {import("@minecraft/server").Direction} direction
     * @returns {Arrow}
     */
    createArrow(direction) {
        const location = this.getArrowLocation(direction)
        const rotation = Selection.directionToRotation[direction]
        const arrow = new Arrow(location, this.dimension, rotation)
        const minSize = new Vector(1, 1, 1)

        arrow.events.onMove.subscribe((data) => {
            const { editor, newLocation, prevLocation } = data
            const diff = Vector.subtract(newLocation, prevLocation)

            if (editor.customIsShifting) {
                if (direction === "Down" || direction === "West" || direction === "North") {
                    const newSize = Vector.max(Vector.subtract(this.size, diff), minSize)
                    const sizeChange = Vector.subtract(this.size, newSize)

                    this.displayLocation.add(sizeChange)
                    this.size = newSize
                } else {
                    this.size = Vector.max(Vector.add(this.size, diff), minSize)
                }
            } else {
                const location = diff.add(this.displayLocation)
                const { min, max } = this.dimension.heightRange

                location.y = Math.min(location.y, max - this.size.y)
                location.y = Math.max(location.y, min)

                this.displayLocation = location
            }
            this.reloadArrowLocations()
        })

        arrow.events.onRelease.subscribe(() => {
            this.displayLocation = this.displayLocation.round()
            this.size = this.size.round()

            this.reloadArrowLocations()
        })

        this.arrows[direction] = arrow

        return arrow
    }

    reloadArrowLocations() {
        for (const [direction, arrow] of Object.entries(this.arrows)) {
            arrow.teleport(this.getArrowLocation(direction))
        }
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @returns {Vector}
     */
    getArrowLocation(direction) {
        return Vector.add(this.displayLocation, this.getArrowOffset(direction))
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @returns {Vector}
     */
    getArrowOffset(direction) {
        const halfSize = Vector.divide(this.size, 2)
        const offset = Vector.stringToVector(direction)
        const edge = Vector.multiply(offset, halfSize).add(halfSize)
        const location = edge.add(offset.multiply(0.75))

        return location
    }

    display() {
        Particle.boxFaces(BLOCK_PARTICLE.BASIC, this.displayLocation, this.size, this.dimension)
        Particle.boxEdges(TYPE_IDS.LINE, this.displayLocation, this.size, this.dimension, 0.1)
    }
}

Selection.innit()
