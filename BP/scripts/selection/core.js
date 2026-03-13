import { system } from "@minecraft/server"
import { TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"
import { Vector } from "../utils/vector"
import { Event } from "../utils/events"
import { SelectItem } from "../selector/selectItem"

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { entityRaycast } = data

        if (!entityRaycast.length) return Infinity

        const coreRay = entityRaycast.find((ray) => Core.get(ray.entity.id))

        if (!coreRay) return Infinity

        console.log("core", coreRay.distance - 10)

        return coreRay.distance - 10
    },
    callback: (data) => {
        const { entityRaycast, player } = data

        console.log("core event ran")

        const core = Core.get(
            entityRaycast.find((ray) => Core.get(ray.entity.id)).entity.id,
        )

        if (!core) return

        core.setEditor(player)
    },
})

SelectItem.events.releaseUse.subscribe((data) => {
    const { player } = data

    Core.removeEditor(player)
})

export class Core {
    /**
     * @type {Record<number,Core>}
     */
    static list = {}

    /**
     * @param {number} id
     * @returns {Core|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {Core[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {Core} core
     */
    static remove(core) {
        delete this.list[core.id]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {boolean}
     */
    static removeEditor(player) {
        for (const core of this.getAll()) {
            if (core.editor?.id === player.id) {
                core.removeEditor()
                return true
            }
        }
        return false
    }

    static innit() {
        system.runInterval(() => {
            for (const core of this.getAll()) {
                if (!core.editor || !core.editor.isValid) continue

                core.move()
            }
        })
    }

    events = {
        /** @type {Event<ArrowOnMoveData>}*/
        onMove: new Event(),
        /** @type {Event<OnReleaseData>}*/
        onRelease: new Event(),
        /** @type {Event<OnSelectData>}*/
        onSelect: new Event(),
    }

    /** @type {number} */
    distance

    /** @type {import("@minecraft/server").Player} */
    editor

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").Vector2} rotation
     */
    constructor(location, dimension) {
        const miny = dimension.heightRange.min

        if (location.y < miny) {
            const offset = location.copy().setY(miny + 1)
            this.entity = dimension.spawnEntity(TYPE_IDS.CORE, offset)
            this.entity.teleport(location)
        } else {
            this.entity = dimension.spawnEntity(TYPE_IDS.CORE, location)
        }

        this.location = location
        this.originalLocation = location.copy()
        this.dimension = dimension
        this.id = this.entity.id

        DeathOnReload.addEntity(this.entity)

        Core.list[this.id] = this
    }

    move() {
        const newLocation = this.getPointer()
        const data = {
            prevLocation: this.location.copy(),
            newLocation: newLocation,
            editor: this.editor,
        }

        this.events.onMove.emit(data)
    }

    /**
     * @param {Vector}
     */
    teleport(location) {
        this.entity.teleport(location)
        this.location = location
    }

    updateOriginalLocation() {
        this.originalLocation = this.location.copy()
    }

    getPointer() {
        return Vector.multiply(this.editor.getViewDirection(), this.distance).add(
            getEyeLocation(this.editor),
        )
    }

    /** @param {import("@minecraft/server").Player} */
    setEditor(player) {
        this.editor = player

        this.distance = Vector.distance(this.location, player.location)

        this.events.onSelect.emit({
            location: this.location.copy(),
            editor: player,
        })
    }

    removeEditor() {
        this.events.onRelease.emit({
            location: this.location,
            prevLocation: this.originalLocation.copy(),
            editor: this.editor,
        })

        this.originalLocation = this.location.copy()

        delete this.distance
        delete this.editor
    }

    remove() {
        this.entity.remove()
        Core.remove(this)
    }
}

Core.innit()

function getEyeLocation(player) {
    const headModelSize = 8
    const headHeight = headModelSize / 32
    const location = player.getHeadLocation()

    location.y += headHeight / 2 - 0.022

    return location
}
