import { system, world, Player } from "@minecraft/server"
import { PROPERTIES, TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"
import { Vector } from "../utils/vector"

world.afterEvents.itemStartUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    const ray = source.getEntitiesFromViewDirection({ ignoreBlockCollision: true })

    if (!ray.length) return

    const arrow = Arrow.get(ray[0].entity.id)

    if (!arrow) return

    arrow.setEditor(source)
})

world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    world.sendMessage("release")

    Arrow.removeEditor(source)
})

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((data) => {
    Arrow.removeEditor(data.player)
})

world.afterEvents.entitySpawn.subscribe((data) => {
    const { entity } = data

    if (!(entity instanceof Player)) return

    Arrow.removeEditor(data.player)
})

export class Arrow {
    /**
     * @type {Object<number,Arrow>}
     */
    static list = {}

    /**
     * @param {number} id
     * @returns {Arrow|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {Arrow[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {Arrow} arrow
     */
    static remove(arrow) {
        delete list[arrow.id]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {boolean}
     */
    static removeEditor(player) {
        for (const arrow of this.getAll()) {
            if (arrow.editor?.id === player.id) {
                arrow.removeEditor()
                return true
            }
        }
        return false
    }

    static innit() {
        system.runInterval(() => {
            for (const arrow of this.getAll()) {
                if (!arrow.editor || !arrow.editor.isValid) continue

                arrow.move()
            }
        })
    }

    events = {
        onMove: new Event(),
        onRelease: new Event(),
        onSelect: new Event(),
    }

    /** @type {"x"|"y"|"z"} */
    axis

    /** @type {import("@minecraft/server").Player} */
    editor

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").Vector2} rotation
     */
    constructor(location, dimension, rotation = { x: 0, y: 0 }) {
        this.entity = dimension.spawnEntity(TYPE_IDS.ARROW, location)
        this.location = location
        this.dimension = dimension
        this.rotation = rotation
        this.id = this.entity.id

        this.setAxis(rotation)
        this.setRotation(this.axis)
        this.setEntityRotation()

        DeathOnReload.addEntity(this.entity)

        Arrow.list[this.id] = this
    }

    setRotation(axis) {
        switch (axis) {
            case "x":
                this.planeRotation = { x: 270, y: 0 }
                break
            case "z":
                this.planeRotation = { x: 0, y: 0 }
                break
            case "y":
                this.planeRotation = { x: 0, y: 0 }
                break
        }
    }

    setEntityRotation() {
        this.entity.setProperty(PROPERTIES.HEAD_X_ROTATION, this.rotation.x)
        this.entity.setProperty(PROPERTIES.HEAD_Y_ROTATION, this.rotation.y)
    }

    setAxis(rotation) {
        if (rotation.y) {
            this.axis = "y"
            return
        }
        // prettier-ignore
        switch (rotation.x) {
            case 0: this.axis = "z"; break
            case 90: this.axis = "x"; break 
            case 180: this.axis = "z"; break 
            case 270: this.axis = "x"; break 
        }
    }

    move() {
        const newLocation = this.getPointer().add(this.location)

        this.entity.teleport(newLocation)

        this.events.onMove.emit({
            prevLocation: this.location.copy(),
            newLocation: newLocation,
            editor: this.editor,
        })

        this.location = newLocation
    }

    /**
     * @param {Vector}
     */
    teleport(location) {
        this.entity.teleport(location)
        this.location = location
    }

    getPointer() {
        const inverseRotation = {
            y: (-this.planeRotation.y * Math.PI) / 180,
            p: (-this.planeRotation.x * Math.PI) / 180,
            r: 0,
        }
        const relPlayerLocation = Vector.subtract(getEyeLocation(this.editor), this.location)
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(this.editor.getViewDirection(), inverseRotation)

        const dir = nViewDirection.normalize()
        const t = -nPlayerLocation.x / dir.x

        const hitY = nPlayerLocation.y + t * dir.y
        const hitZ = nPlayerLocation.z + t * dir.z

        switch (this.axis) {
            case "x":
                return new Vector(hitZ, 0, 0)
            case "y":
                return new Vector(0, hitY, 0)
            case "z":
                return new Vector(0, 0, hitZ)
        }
    }

    /** @param {import("@minecraft/server").Player} */
    setEditor(player) {
        this.editor = player

        this.events.onSelect.emit(this)
    }

    removeEditor() {
        delete this.editor

        this.events.onRelease.emit(this)
    }
}

Arrow.innit()

class Event {
    constructor() {
        this.listeners = new Set()
    }

    subscribe(fn) {
        this.listeners.add(fn)
    }

    unsubscribe(fn) {
        this.listeners.delete(fn)
    }

    emit(...args) {
        for (const fn of this.listeners) {
            fn(...args)
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
