import { Player, system } from "@minecraft/server"
import { BLOCK_PARTICLE, TYPE_IDS } from "../constants"
import { Vector } from "../utils/vector"
import { SelectionGroup } from "./selectionGroup"
import { Particle } from "../utils/particle"
import { Selection } from "./selection"
import { SelectItem } from "../selector/selectItem"

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { blockRaycast, player } = data

        if (!blockRaycast) return Infinity

        return Vector.distance(blockRaycast.block, player.location)
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
        const id = system.runInterval(() => {
            for (const instance of this.getAll()) {
                instance.run()
            }
        })
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

        if (minLocation.y === this.dimension.heightRange.min) minLocation.y++

        this.remove()

        return new Selection(minLocation, size, this.dimension)
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
        const relPlayerLocation = Vector.subtract(getEyeLocation(this.player), this.editLocation)
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(this.player.getViewDirection(), inverseRotation)

        const dir = nViewDirection.normalize()
        const t = -nPlayerLocation.x / dir.x

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
        let minLocation = new Vector()
        let maxLocation = new Vector()

        const pointer = this.getPointer().add(this.editLocation)
        const location = new Vector(0.5).add(this.location)

        minLocation.x = Math.min(location.x, pointer.x)
        minLocation.y = Math.min(location.y, pointer.y)
        minLocation.z = Math.min(location.z, pointer.z)

        maxLocation.x = Math.max(location.x, pointer.x)
        maxLocation.y = Math.max(location.y, pointer.y)
        maxLocation.z = Math.max(location.z, pointer.z)

        return {
            minLocation: minLocation.floor(),
            maxLocation: maxLocation.ceil(),
        }
    }
}

function getEyeLocation(player) {
    const headModelSize = 8
    const headHeight = headModelSize / 32
    const location = player.getHeadLocation()

    location.y += headHeight / 2 - 0.022

    return location
}

SelectionCreator.runInterval()
