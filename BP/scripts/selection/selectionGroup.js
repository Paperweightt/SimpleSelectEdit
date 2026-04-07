import { system, world } from "@minecraft/server"
import { Menu } from "../menu/menu.js"
import { Arrow } from "./arrow.js"
import { Core } from "./core.js"
import { Selection } from "./selection.js"
import { SelectItem } from "../items/selector/selectItem.js"
import { Edit } from "../edit/index.js"
import { Vector } from "../utils/vector.js"
import { Color } from "../utils/color.js"
import { CONFIG, TYPE_IDS } from "../constants.js"
import { Gizmo } from "./rotation_gizmo.js"

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
            const viewDirection = Vector.multiply(player.getViewDirection(), 4)
            const location = Vector.add(player.getHeadLocation(), viewDirection)

            new Menu(player, location, dimension)
            return
        }

        if (
            !selection.isOwned ||
            SelectionGroup.get(player.id)?.hasSelection(selection)
        ) {
            if (player.customIsShifting) {
                group =
                    SelectionGroup.get(player.id) || new SelectionGroup(player, dimension)
            } else {
                group = new SelectionGroup(player, dimension)
            }

            if (!rayResult) {
                group.remove()
            } else {
                group.toggleSelection(selection)
            }
        }
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

SelectItem.events.punch.subscribe((data) => {
    const { player } = data
    const group = SelectionGroup.get(player.id)

    if (!group) return

    group.toggleArrowMode()
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

    static innit() {
        system.runInterval(() => {
            for (const group of this.getAll()) {
                const player = group.player
                const container = player.getComponent("inventory").container
                const item = container.getItem(player.selectedSlotIndex)

                if (item?.typeId !== TYPE_IDS.SELECT_ITEM) {
                    group.removeEntities()
                } else if (!group.core) {
                    group.createArrows()
                    group.createCore()
                    group.createGizmos()

                    group.reloadArrowModel()
                }
            }
        })
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
    /** @type {Record<"x"|"y"|"z",Gizmo>} */
    gizmos = {}
    /** @type {boolean} */
    isValid = true
    /** @type {"move"|"duplicate"|"resize"|"stretch"} */
    _arrowMode = "resize"

    get arrowMode() {
        return this._arrowMode
    }

    /** @type {"move"|"duplicate"|"resize"} */
    set arrowMode(string) {
        let value

        // prettier-ignore
        switch (string){
            case "move": value = 0; break;
            case "duplicate": value = 0; break;
            case "resize": value = 1; break;
            case "stretch": value = 2; break;
        }

        for (const arrow of Object.values(this.arrows)) {
            arrow.entity.setProperty("sse:mode", value)
        }

        this._arrowMode = string
    }

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

    toggleArrowMode() {
        //prettier-ignore
        switch(this.arrowMode) {
            case "move": this.arrowMode = "stretch"; break
            case "resize": this.arrowMode = "move"; break
            case "stretch": this.arrowMode = "resize"; break
            case "duplicate": this.arrowMode = "resize"; break
        }
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
                    this.createGizmos()
                } else {
                    this.addSelection(selection)
                    this.reloadEntityLocations()
                }
            }
        } else {
            this.removeSelection(index)
        }

        this.updateEntityValues()
    }

    createGizmos() {
        this.createGizmo("y")
    }

    reloadGizmosLocation() {
        for (const gizmo of Object.values(this.gizmos)) {
            gizmo.teleport(this.getCenter())
        }
    }

    /**
     * @param {"x"|"y"|"z"} direction
     * @returns {Gizmo}
     */
    createGizmo(axis) {
        const gizmo = new Gizmo(this.getCenter(), this.dimension, axis)

        gizmo.events.onRotate.subscribe((data) => {
            const { editor, newRotation, prevRotation } = data

            if (editor.id !== this.player.id) return

            const yprRotation = {
                y: ((newRotation.x - prevRotation.x) * Math.PI) / 180,
                p: ((newRotation.y - prevRotation.y) * Math.PI) / 180,
                r: 0,
            }

            for (const selection of this.selections) {
                selection.rotation = yprRotation

                const diff = selection
                    .getPivot()
                    .subtract(
                        Vector.rotate(selection.getPivot(), yprRotation, this.getPivot()),
                    )

                selection.displayLocation = Vector.subtract(selection.location, diff)
            }
        })

        gizmo.events.onRelease.subscribe(async (data) => {
            const { editor, newRotation, prevRotation } = data
            if (editor.id !== this.player.id) return

            const rotation = {
                x: (Math.round((newRotation.x - prevRotation.x) / 90) * 90 + 360) % 360,
                y: (Math.round((newRotation.y - prevRotation.y) / 90) * 90 + 360) % 360,
            }

            for (const selection of this.selections) {
                selection.rotation = { y: 0, p: 0, r: 0 }
                selection.displayLocation = selection.location
            }

            if (rotation.y === 0) return

            const result = await Edit.playerRunAndSave(this.player.id, "rotate", {
                dimension: this.dimension,
                selections: this.selections,
                rotation: rotation.y,
            })

            this.snapToGrid()
            this.reloadEntityLocations()
            this.updateEntityValues()

            this.player.sendMessage(`${result.metrics.blocks} blocks filled`)
        })

        this.gizmos[axis] = gizmo

        return gizmo
    }

    reloadEntityLocations() {
        this.reloadArrowLocations()
        this.reloadCoreLocation()
        this.reloadGizmosLocation()
    }

    /**
     * @param {Selection} selection
     */
    addSelection(selection) {
        selection.lineRGB = Color.playerOklab(this.player, 0.16, 0.88)
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

    /**
     * @param {Selection} selection
     * @returns {number}
     */
    getSelectionIndex(selection) {
        if (!selection.isOwned) return false

        for (let i = 0; i < this.selections.length; i++) {
            const ownedSelection = this.selections[i]
            if (ownedSelection.id === selection.id) return i
        }

        return -1
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
            this.reloadEntityLocations()
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

        maxLocation.subtract(1)

        return { minLocation, maxLocation }
    }

    /** @return {{minLocation:Vector,maxLocation:Vector}} */
    getMinMax() {
        return SelectionGroup.getMinMax(this.selections)
    }

    /** @return {Vector} */
    getSize() {
        const { minLocation, maxLocation } = this.getMinMax()

        return Vector.subtract(maxLocation, minLocation).add(1)
    }

    /** @return {Vector} */
    getPivot() {
        return Vector.subtract(this.getSize(), 1)
            .divide(2)
            .add(this.getMinMax().minLocation)
    }

    /** @return {Vector} */
    getCenter() {
        const { minLocation, maxLocation } = this.getMinMax()
        return Vector.add(minLocation, maxLocation.add(1)).divide(2)
    }

    /** @returns {Core} */
    createCore() {
        this.core = new Core(this.getCenter(), this.dimension)

        this.core.events.onMove.subscribe((data) => {
            const { editor, newLocation, prevLocation } = data

            if (editor.id !== this.player.id) return

            const diff = Vector.subtract(newLocation, prevLocation)

            this.moveSelections(diff)
            this.reloadEntityLocations()
        })

        this.core.events.onRelease.subscribe(async (data) => {
            const { editor, location, prevLocation } = data
            if (editor.id !== this.player.id) return

            this.snapToGrid()
            this.reloadEntityLocations()

            const diff = Vector.subtract(location, prevLocation)

            if (Vector.equals(diff, new Vector(0))) return

            const mode = this.arrowMode === "duplicate" ? "duplicate" : "move"

            const result = await Edit.playerRunAndSave(this.player.id, mode, {
                dimension: this.dimension,
                vector: diff.round(),
                selections: this.selections,
            })

            this.player.sendMessage(`${result.metrics.blocks} blocks filled`)

            if (this.arrowMode === "duplicate") this.arrowMode = "move"

            this.updateEntityValues()
        })

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

    reloadArrowModel() {
        this.arrowMode = this.arrowMode
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

            // prettier-ignore
            switch (this.arrowMode) {
                case "resize": this.resizeSelections(direction, diff); break;
                case "move": this.moveSelections(diff); break;
                case "duplicate": this.moveSelections(diff); break;
                case "stretch": this.stretchSelections(direction, diff); break;
            }

            this.reloadEntityLocations()
        })

        arrow.events.onRelease.subscribe(async (data) => {
            const { editor, location, prevLocation } = data
            if (editor.id !== this.player.id) return

            const diff = Vector.subtract(location, prevLocation).round()

            this.snapToGrid()
            this.reloadEntityLocations()

            if (new Vector(0).equals(diff)) return

            const result = await Edit.playerRunAndSave(this.id, this.arrowMode, {
                dimension: this.dimension,
                direction: direction,
                vector: diff,
                selections: this.selections,
            })

            if (result.metrics.blocks) {
                this.player.sendMessage(`${result.metrics.blocks} blocks filled`)
            }

            if (this.arrowMode === "duplicate") this.arrowMode = "move"

            this.updateEntityValues()
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

    updateEntityValues() {
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
    resizeSelections(direction, diff) {
        const { min: yMin, max: yMax } = this.dimension.heightRange
        const minSize = new Vector(1)
        const distanceMax = CONFIG.MAX_SELECTION_DISTANCE
        const max = new Vector(this.player.location).add(distanceMax).setY(yMax)
        const min = new Vector(this.player.location).subtract(distanceMax).setY(yMin)

        for (const selection of this.selections) {
            if (direction === "Down" || direction === "West" || direction === "North") {
                diff = Vector.max(diff, Vector.subtract(min, selection.location))
            } else {
                diff = Vector.min(
                    diff,
                    Vector.subtract(max, selection.location).subtract(selection.size),
                )
            }
        }

        for (const selection of this.selections) {
            if (direction === "Down" || direction === "West" || direction === "North") {
                const newSize = Vector.max(Vector.subtract(selection.size, diff), minSize)
                const sizeChange = Vector.subtract(selection.size, newSize)

                selection.location.add(sizeChange)
                selection.displayLocation = selection.location
                selection.size = newSize
            } else {
                const newSize = Vector.max(Vector.add(selection.size, diff), minSize)
                selection.size = newSize
            }
        }

        return diff
    }

    /**
     * @param {import("@minecraft/server").Direction}
     * @param {Vector} diff
     * @returns {Vector}
     */
    stretchSelections(direction, diff) {
        const { min: yMin, max: yMax } = this.dimension.heightRange
        const distanceMax = CONFIG.MAX_SELECTION_DISTANCE
        const max = new Vector(this.player.location).add(distanceMax).setY(yMax)
        const min = new Vector(this.player.location).subtract(distanceMax).setY(yMin)
        const minSize = new Vector(1)

        for (const selection of this.selections) {
            if (direction === "Down" || direction === "West" || direction === "North") {
                diff = Vector.max(diff, Vector.subtract(min, selection.location))
                diff = Vector.min(diff, Vector.subtract(selection.size, minSize))
            } else {
                diff = Vector.min(
                    diff,
                    Vector.subtract(max, selection.location).subtract(selection.size),
                )

                diff = Vector.max(diff, Vector.subtract(minSize, selection.size))
            }
        }

        const size = this.getSize()
        const minLocation = this.getMinMax().minLocation

        for (const selection of this.selections) {
            if (direction === "Down" || direction === "West" || direction === "North") {
                const newMinLocation = Vector.add(minLocation, diff)
                const newSize = Vector.subtract(size, diff)
                const ratio = Vector.divide(newSize, size)

                selection.location = Vector.subtract(selection.location, minLocation)
                    .multiply(ratio)
                    .add(newMinLocation)

                selection.size.multiply(ratio)
                selection.displayLocation = selection.location
            } else {
                const newSize = Vector.add(size, diff)
                const ratio = Vector.divide(newSize, size)

                selection.location = Vector.subtract(selection.location, minLocation)
                    .multiply(ratio)
                    .add(minLocation)

                selection.size.multiply(ratio)

                selection.displayLocation = selection.location
            }
        }

        return diff
    }

    /**
     * @param {Vector} diff
     * @returns {Vector}
     */
    moveSelections(diff) {
        const { min: yMin, max: yMax } = this.dimension.heightRange
        const distanceMax = CONFIG.MAX_SELECTION_DISTANCE
        const max = new Vector(this.player.location).add(distanceMax).setY(yMax)
        const min = new Vector(this.player.location).subtract(distanceMax).setY(yMin)

        for (const selection of this.selections) {
            diff = Vector.max(diff, Vector.subtract(min, selection.location))
            diff = Vector.min(
                diff,
                Vector.subtract(max, selection.location).subtract(selection.size),
            )
        }

        for (const selection of this.selections) {
            selection.location.add(diff)
            selection.displayLocation = selection.location
        }

        return diff
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
        const offset = Vector.stringToVector(direction)

        return Vector.add(
            this.getCenter(),
            Vector.multiply(offset, this.getSize().divide(2)).add(offset.multiply(0.55)),
        )
    }

    removeSelections() {
        for (const box of this.selections) {
            box.remove()
        }

        this.selections = []
    }

    removeEntities() {
        for (const arrow of Object.values(this.arrows)) {
            arrow.remove()
        }

        for (const gizmo of Object.values(this.gizmos)) {
            gizmo.remove()
        }

        if (this.core) this.core.remove()

        this.arrows = {}
        this.gizmos = {}
        this.core = undefined
    }

    remove() {
        this.removeEntities()

        for (const box of this.selections) {
            box.lineRGB = Selection.defaultLineRGB
            box.isOwned = false
        }

        this.isValid = false

        delete SelectionGroup.list[this.id]
    }
}

SelectionGroup.innit()
