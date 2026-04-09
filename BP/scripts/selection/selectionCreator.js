import { Player, system } from "@minecraft/server"
import { BLOCK_PARTICLE, CONFIG, TYPE_IDS } from "../constants"
import { Vector } from "../utils/vector"
import { SelectionGroup } from "./selectionGroup"
import { Particle } from "../utils/particle"
import { Selection } from "./selection"
import { SelectItem } from "../items/selector/selectItem"
import { PlayerUtils } from "../utils/player"
import { Edit } from "../edit/index.js"

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { blockRaycast, player } = data

        if (!blockRaycast) return Infinity

        return Vector.distance(blockRaycast.block, player.location) + 100
    },
    callback: (data) => {
        const { blockRaycast, player } = data
        const { block, face, faceLocation } = blockRaycast
        const location = Vector.add(block.location, faceLocation)

        new SelectionCreator(player, blockRaycast.block).createEdit(location, face)
    },
})

SelectItem.events.releaseUse.subscribe((data) => {
    const { player } = data
    const dimension = player.dimension
    const creator = SelectionCreator.get(player.id)
    let group

    if (!creator) return

    const selection = creator.apply()

    if (player.customIsShifting) {
        group = SelectionGroup.get(player.id) || new SelectionGroup(player, dimension)
    } else {
        group = new SelectionGroup(player, dimension)
    }

    group.toggleSelection(selection)
})

SelectItem.events.click.subscribe({
    priority: (data) => {
        const { blockRaycast, player } = data

        if (!blockRaycast) return Infinity

        const rayResult = Selection.getPlayerViewBox(player)

        if (rayResult) return Infinity

        const { faceLocation, block } = blockRaycast
        const location = Vector.add(block.location, faceLocation)

        return Vector.distance(PlayerUtils.getEyeLocation(player), location) + 0.1
    },
    callback: async (data) => {
        const { player, blockRaycast } = data
        const dimension = player.dimension
        let group = SelectionGroup.get(player.id)

        if (!blockRaycast) return

        const selection = await SelectionCreator.floodGet(
            player,
            blockRaycast.block.location,
            player.dimension,
        )

        if (!selection) {
            if (group) group.remove()
            return
        }

        if (player.customIsShifting) {
            group = group || new SelectionGroup(player, dimension)
        } else {
            group = new SelectionGroup(player, dimension)
        }

        group.toggleSelection(selection)
    },
})

class SelectionCreator {
    static list = {}

    static faceToAxisRotation = {
        Up: { axis: "y", rotation: { x: 0, y: 90 } },
        Down: { axis: "y", rotation: { x: 0, y: 90 } },
        East: { axis: "x", rotation: { x: 0, y: 0 } },
        West: { axis: "x", rotation: { x: 0, y: 0 } },
        South: { axis: "z", rotation: { x: 270, y: 0 } },
        North: { axis: "z", rotation: { x: 270, y: 0 } },
    }

    /** @returns {SelectionCreator|undefined} */
    static get(id) {
        return this.list[id]
    }

    /**
     * @param {number} id
     * @param {SelectionCreator} instance
     */
    static add(id, instance) {
        this.list[id] = instance
    }

    /** @returns {SelectionCreator[]} */
    static getAll() {
        return Object.values(this.list)
    }

    /** @param {number} id */
    static remove(id) {
        this.get(id).remove()
    }

    static runInterval() {
        system.runInterval(() => {
            for (const instance of this.getAll()) {
                instance.run()
            }
        })
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {Vector} location
     * @returns {Promise.<Selection|undefined>}
     */
    static async floodGet(player, location, dimension) {
        const selection = new Selection(new Vector(location), new Vector(1), dimension)

        await Edit.playerRunAndSave(player.id, "magicSelect", {
            selection: selection,
            dimension: dimension,
        })

        return selection
    }

    /**
     * @param {Player} player
     * @param {import("@minecraft/server").Block} block
     */
    constructor(player, block) {
        this.player = player
        this.block = block
        this.id = player.id
        this.permutation = block.permutation
        this.dimension = block.dimension
        this.location = block.location

        SelectionCreator.add(this.id, this)
    }

    run() {
        const { minLocation, maxLocation } = this.getStartEnd()
        const size = Vector.subtract(maxLocation, minLocation)

        if (system.currentTick % 4 === 0) {
            Particle.boxFaces(BLOCK_PARTICLE.BASIC, minLocation, size, this.dimension)
        }

        Particle.boxEdges(TYPE_IDS.LINE, minLocation, size, this.dimension, 0.1)

        this.player.onScreenDisplay.setActionBar("§l" + size.getString())
    }

    /** @returns {Selection} */
    apply() {
        const { minLocation, maxLocation } = this.getStartEnd()
        const size = Vector.subtract(maxLocation, minLocation)

        this.remove()

        const selection = new Selection(minLocation, size, this.dimension)

        Edit.playerRunAndSave(this.player.id, "create", {
            selection: selection,
            dimension: this.dimension,
        })

        return selection
    }

    /**
     * @returns {Vector}
     */
    getPointer() {
        const inverseRotation = {
            y: (-this.rotation.y * Math.PI) / 180,
            p: (-this.rotation.x * Math.PI) / 180,
            r: 0,
        }
        const relPlayerLocation = Vector.subtract(
            PlayerUtils.getEyeLocation(this.player),
            this.editLocation,
        )
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(
            this.player.getViewDirection(),
            inverseRotation,
        )

        const dir = nViewDirection.normalize()
        const t = -nPlayerLocation.x / dir.x

        if (t < 0) return

        const hitY = nPlayerLocation.y + t * dir.y
        const hitZ = nPlayerLocation.z + t * dir.z

        switch (this.axis) {
            case "x":
                return new Vector(0, hitY, hitZ)
            case "y":
                return new Vector(hitY, 0, hitZ)
            case "z":
                return new Vector(hitZ, hitY, 0)
        }
    }

    createEdit(location, face) {
        const { axis, rotation } = SelectionCreator.faceToAxisRotation[face]

        this.editLocation = location

        if (face === "Up" || face === "East" || face === "South") {
            const r = this.editLocation[axis] % 1
            if (r === 0) this.editLocation[axis] += 1
        }

        this.axis = axis
        this.rotation = rotation
    }

    remove() {
        delete SelectionCreator.list[this.id]
    }

    /**
     * @returns {{minLocation:Vector,maxLocation:Vector}}
     */
    getStartEnd() {
        const { min, max } = this.dimension.heightRange

        let pointer = this.getPointer()

        if (!pointer) {
            return {
                minLocation: this._minLocation,
                maxLocation: this._maxLocation,
            }
        }

        this._minLocation = new Vector()
        this._maxLocation = new Vector()

        pointer.add(this.editLocation)
        const location = new Vector(0.5).add(this.location)

        pointer.y = Math.min(Math.max(pointer.y, min), max)

        pointer = Vector.min(
            new Vector(CONFIG.MAX_SELECTION_DISTANCE).add(this.player.location),
            pointer,
        )

        pointer = Vector.max(
            new Vector(-CONFIG.MAX_SELECTION_DISTANCE).add(this.player.location),
            pointer,
        )

        this._minLocation = Vector.min(location, pointer).floor()
        this._maxLocation = Vector.max(location, pointer).ceil()

        return {
            minLocation: this._minLocation,
            maxLocation: this._maxLocation,
        }
    }
}

SelectionCreator.runInterval()
