import { Arrow } from "./arrow.js"
import { Vector } from "../utils/vector.js"
import { Selection } from "./selection.js"
import { SelectItem } from "../selector/selectItem.js"
import { system, world } from "@minecraft/server"

system.run(() => {
    const dim = world.getDimension("overworld")
    const start = new Vector(14, -63, -15)
    const size = new Vector(5, 1, 5)

    new Selection(start, size, dim)
})

SelectItem.events.click.subscribe({
    priority: (data) => {
        const { player } = data
        const rayResult = Selection.getPlayerViewBox(player)

        if (player.customIsShifting && !rayResult) return Infinity

        return -1
    },
    callback: (data) => {
        const { player } = data
        const dimension = player.dimension
        const rayResult = Selection.getPlayerViewBox(player)
        let group

        if (player.customIsShifting) {
            group = SelectionGroup.get(player.id) || new SelectionGroup(player, dimension)
        } else {
            group = new SelectionGroup(player, dimension)
        }

        if (!rayResult) {
            group.remove()
            return
        }

        group.addSelection(rayResult.selection)
    },
})

export class SelectionGroup {
    /**
     * @type {Object<number,SelectionGroup>}
     */
    static list = {}

    static lineRGB = {
        red: 0,
        green: 0,
        blue: 0,
    }

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
     * @returns {SelectionGroup|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {SelectionGroup[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {SelectionGroup}
     */
    static add(group) {
        this.get(group.id)?.remove()

        this.list[group.id] = group
    }

    /**
     * @param {SelectionGroup} selectionGroup
     */
    static remove(selectionGroup) {
        selectionGroup.remove()
    }

    /** @type {Record<import("@minecraft/server").Direction,Arrow>} */
    arrows = {}
    /** @type {Selection[]} */
    selections = []

    /**
     * @param {Vector} location
     * @param {Vector} size
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(player, dimension) {
        this.dimension = dimension
        this.id = player.id

        SelectionGroup.add(this)
    }

    /** @type {Selection} */
    addSelection(selection) {
        let maxLocation = new Vector(-Infinity)
        let minLocation = new Vector(Infinity)

        this.selections.push(selection)

        for (const selection of this.selections) {
            const selectionMax = Vector.add(selection.location, selection.size)

            minLocation = Vector.min(minLocation, selection.location)
            maxLocation = Vector.max(maxLocation, selectionMax)
        }

        this.size = Vector.subtract(maxLocation, minLocation)
        this.displayLocation = minLocation
        this.location = minLocation

        selection.lineRGB = SelectionGroup.lineRGB

        if (this.selections.length === 1) this.createArrows()

        this.reloadArrowLocations()
    }

    createArrows() {
        this.createArrow("North")
        this.createArrow("East")
        this.createArrow("South")
        this.createArrow("West")
        this.createArrow("Up")
        this.createArrow("Down")
    }

    /**
     * @param {import("@minecraft/server").Direction} direction
     * @returns {Arrow}
     */
    createArrow(direction) {
        const location = this.getArrowLocation(direction)
        const rotation = SelectionGroup.directionToRotation[direction]
        const arrow = new Arrow(location, this.dimension, rotation)

        arrow.events.onMove.subscribe((data) => {
            const { editor, newLocation, prevLocation } = data
            const diff = Vector.subtract(newLocation, prevLocation)

            if (editor.customIsShifting && this.selections.length === 1) {
                this.resizeSelection(direction, diff)
            } else {
                this.moveSelections(diff)
            }
            this.reloadArrowLocations()
        })

        arrow.events.onRelease.subscribe(() => {
            this.snapToGrid()
            this.reloadArrowLocations()
        })

        this.arrows[direction] = arrow

        return arrow
    }

    snapToGrid() {
        this.displayLocation.round()

        if (this.selections.length === 1) {
            this.size.round()
            this.selections[0].size = this.size
        }

        for (const selection of this.selections) {
            selection.location.round()
        }
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @param {Vector} diff
     */
    resizeSelection(direction, diff) {
        const { min, max } = this.dimension.heightRange
        const minSize = new Vector(1, 1, 1)
        const selection = this.selections[0]

        if (direction === "Down" || direction === "West" || direction === "North") {
            const newSize = Vector.max(Vector.subtract(this.size, diff), minSize)
            const sizeChange = Vector.subtract(this.size, newSize)

            if (this.displayLocation.y + sizeChange.y < min) return

            this.displayLocation.add(sizeChange)
            selection.location.add(sizeChange)

            this.size = newSize
            selection.size = newSize
        } else {
            const newSize = Vector.max(Vector.add(this.size, diff), minSize)
            if (this.displayLocation.y + newSize.y > max) return

            this.size = newSize
            selection.size = newSize
        }
    }

    /** @param {Vector} direction */
    moveSelections(diff) {
        const location = diff.add(this.displayLocation)
        const { min, max } = this.dimension.heightRange

        location.y = Math.min(location.y, max - this.size.y)
        location.y = Math.max(location.y, min)

        const newDiff = Vector.subtract(location, this.displayLocation)

        for (const selection of this.selections) {
            selection.location.add(newDiff)
        }

        this.displayLocation = location
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

    remove() {
        for (const arrow of Object.values(this.arrows)) {
            arrow.remove()
        }

        for (const box of this.selections) {
            box.lineRGB = Selection.defaultLineRGB
        }

        delete SelectionGroup.list[this.id]
    }
}
