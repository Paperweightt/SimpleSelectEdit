import { world } from "@minecraft/server"
import { Menu } from "../menu/menu.js"
import { Arrow } from "./arrow.js"
import { Core } from "./core.js"
import { Selection } from "./selection.js"
import { SelectItem } from "../selector/selectItem.js"
import { Edit } from "../edit/index.js"
import { Vector } from "../utils/vector.js"
import { Color } from "../utils/color.js"

world.afterEvents.playerLeave.subscribe((data) => {
    SelectionGroup.get(data.playerId)?.remove()
})

// click box
SelectItem.events.click.subscribe({
    priority: (data) => {
        const { player } = data
        const rayResult = Selection.getPlayerViewBox(player)

        if (!rayResult) return Infinity

        return rayResult.distance
    },
    callback: (data) => {
        const { player } = data
        const dimension = player.dimension
        const rayResult = Selection.getPlayerViewBox(player)
        const selection = rayResult.selection
        let group

        if (
            SelectionGroup.get(player.id)?.hasSelection(selection) &&
            !player.customIsShifting
        ) {
            const viewDirection = Vector.multiply(player.getViewDirection(), 2.85)
            const location = Vector.add(player.getHeadLocation(), viewDirection)

            if (
                location.y > dimension.heightRange.max ||
                location.y < dimension.heightRange.min + 2
            ) {
                player.sendMessage(
                    "[ERROR] player is either too low or too high to open menu",
                )
                return
            }

            new Menu(player, location, dimension)
            return
        }

        if (player.customIsShifting) {
            group = SelectionGroup.get(player.id) || new SelectionGroup(player, dimension)
        } else {
            group = new SelectionGroup(player, dimension)
        }

        if (!rayResult) {
            group.remove()
            return
        }

        group.toggleSelection(selection)
    },
})

// click air
SelectItem.events.click.subscribe({
    priority: Number.MAX_SAFE_INTEGER,
    callback: (data) => {
        const { player } = data
        const rayResult = Selection.getPlayerViewBox(player)
        const group = SelectionGroup.get(player.id)

        if (!rayResult && group) {
            group.remove()
            return
        }
    },
})

export class SelectionGroup {
    /**
     * @type {Object<number,SelectionGroup>}
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

    /** @type {boolean} */
    isValid = true

    /** @type {"move"|"duplicate"} */
    editMode = "move"

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(player, dimension) {
        this.dimension = dimension
        this.player = player
        this.id = player.id

        SelectionGroup.add(this)
    }

    /**
     * @param {Selection} selection
     */
    toggleSelection(selection) {
        const id = selection.id
        const index = this.selections.findIndex((selection) => selection.id === id)

        if (index === -1) {
            if (!selection.isOwned) {
                if (this.selections.length === 0 && !selection.isOwned) {
                    this.addSelection(selection)

                    this.createArrows()
                    this.createCore()
                } else {
                    this.addSelection(selection)

                    this.reloadArrowLocations()
                    this.reloadCoreLocation()
                }
            }
        } else {
            this.removeSelection(index)
        }

        this.updateOriginalLocations()
    }

    /**
     * @param {Selection} selection
     */
    addSelection(selection) {
        selection.lineRGB = Color.playerOklab(this.player, 0.2, 0.8)
        this.selections.push(selection)
        selection.isOwned = true
    }

    /**
     * @param {Selection} selection
     * @returns {boolean}
     */
    hasSelection(selection) {
        if (!selection.isOwned) return false

        for (const ownedSelection of this.selections) {
            if (ownedSelection.id === selection.id) return true
        }

        return false
    }

    /** @param {number} */
    removeSelection(index) {
        const selection = this.selections[index]

        selection.lineRGB = Selection.defaultLineRGB
        selection.isOwned = false

        this.selections.splice(index, 1)

        if (this.selections.length === 0) {
            this.remove()
        } else {
            this.reloadArrowLocations()
            this.reloadCoreLocation()
        }
    }

    /**
     * @param {Selection[]} selections
     * @return {{minLocation:Vector,maxLocation:Vector}}
     */
    static getMinMax(selections) {
        let maxLocation = new Vector(-Infinity)
        let minLocation = new Vector(Infinity)

        for (const selection of selections) {
            const selectionMax = Vector.add(selection.location, selection.size)

            minLocation = Vector.min(minLocation, selection.location)
            maxLocation = Vector.max(maxLocation, selectionMax)
        }

        return { minLocation, maxLocation }
    }

    /** @return {{minLocation:Vector,maxLocation:Vector}} */
    getMinMax() {
        return SelectionGroup.getMinMax(this.selections)
    }

    /** @return {Vector} */
    getSize() {
        const { minLocation, maxLocation } = this.getMinMax()

        return Vector.subtract(maxLocation, minLocation)
    }

    /** @return {Vector} */
    getCenter() {
        const { minLocation, maxLocation } = this.getMinMax()
        return Vector.add(minLocation, maxLocation).divide(2)
    }

    /** @returns {Core} */
    createCore() {
        const location = this.getCenter()
        const core = new Core(location, this.dimension)

        core.events.onMove.subscribe((data) => {
            const { editor, newLocation, prevLocation } = data

            if (editor.id !== this.player.id) return

            const diff = Vector.subtract(newLocation, prevLocation)

            this.moveSelections(diff)
            this.reloadArrowLocations()
            this.reloadCoreLocation()
        })

        core.events.onRelease.subscribe((data) => {
            const { editor, location, prevLocation } = data
            if (editor.id !== this.player.id) return

            this.snapToGrid()
            this.reloadArrowLocations()
            this.reloadCoreLocation()

            const diff = Vector.subtract(location, prevLocation)

            if (Vector.equals(diff, new Vector(0))) return

            Edit.playerRunAndSave(this.player, this.editMode, {
                dimension: this.dimension,
                vector: diff.round(),
                selections: this.selections,
            })

            if (this.editMode === "duplicate") this.editMode = "move"

            this.updateOriginalLocations()
        })

        this.core = core

        return this.core
    }

    reloadCoreLocation() {
        this.core.teleport(this.getCenter())
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

            if (editor.id !== this.player.id) return

            const diff = Vector.subtract(newLocation, prevLocation)

            if (editor.customIsShifting) {
                this.resizeSelection(direction, diff)
            } else {
                this.moveSelections(diff, direction)
            }

            this.reloadArrowLocations()
            this.reloadCoreLocation()
        })

        arrow.events.onRelease.subscribe((data) => {
            const { editor, location, prevLocation } = data
            if (editor.id !== this.player.id) return

            const diff = Vector.subtract(location, prevLocation).round()

            this.snapToGrid()
            this.reloadArrowLocations()
            this.reloadCoreLocation()

            if (new Vector(0).equals(diff)) return

            if (!editor.customIsShifting) {
                Edit.playerRunAndSave(this.player, this.editMode, {
                    dimension: this.dimension,
                    vector: diff,
                    selections: this.selections,
                })
                if (this.editMode === "duplicate") this.editMode = "move"
            }

            this.updateOriginalLocations()
        })

        this.arrows[direction] = arrow

        return arrow
    }

    snapToGrid() {
        for (const selection of this.selections) {
            selection.location.round()
            selection.size.round()
        }
    }

    updateOriginalLocations() {
        for (const arrow of Object.values(this.arrows)) {
            arrow.updateOriginalLocation()
        }

        this.core.updateOriginalLocation()
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @param {Vector} diff
     * @returns {Vector}
     */
    resizeSelection(direction, diff) {
        const { min, max } = this.dimension.heightRange
        const minSize = new Vector(1, 1, 1)

        for (const selection of this.selections) {
            if (direction === "Down") {
                diff.y = Math.max(diff.y, min - selection.location.y)
            }
            if (direction === "Up") {
                diff.y = Math.min(diff.y, max - selection.location.y - selection.size.y)
            }
        }

        for (const selection of this.selections) {
            if (direction === "Down" || direction === "West" || direction === "North") {
                const newSize = Vector.max(Vector.subtract(selection.size, diff), minSize)
                const sizeChange = Vector.subtract(selection.size, newSize)

                selection.location.add(sizeChange)
                selection.size = newSize
            } else {
                const newSize = Vector.max(Vector.add(selection.size, diff), minSize)
                selection.size = newSize
            }
        }

        return diff
    }

    /**
     * @param {Vector} diff
     * @returns {Vector}
     */
    moveSelections(diff) {
        const { min, max } = this.dimension.heightRange

        for (const selection of this.selections) {
            if (diff.y < 0) {
                diff.y = Math.max(diff.y, min - selection.location.y)
            } else if (diff.y > 0) {
                diff.y = Math.min(diff.y, max - selection.location.y - selection.size.y)
            }
        }

        for (const selection of this.selections) {
            selection.location.add(diff)
        }

        return diff
    }

    reloadArrowLocations(changeOriginal = false) {
        for (const [direction, arrow] of Object.entries(this.arrows)) {
            arrow.teleport(this.getArrowLocation(direction), changeOriginal)
        }
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @returns {Vector}
     */
    getArrowLocation(direction) {
        const offset = Vector.stringToVector(direction)

        return Vector.add(
            this.getCenter(),
            Vector.multiply(offset, this.getSize().divide(2)).add(offset.multiply(0.75)),
        )
    }

    removeSelections() {
        for (const box of this.selections) {
            box.remove()
        }
    }

    remove() {
        for (const arrow of Object.values(this.arrows)) {
            arrow.remove()
        }

        this.core.remove()

        for (const box of this.selections) {
            box.lineRGB = Selection.defaultLineRGB
            box.isOwned = false
        }

        this.isValid = false

        delete SelectionGroup.list[this.id]
    }
}
