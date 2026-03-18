import { system } from "@minecraft/server"
import { Vector } from "../../utils/vector"
import { SelectItem } from "../selector/selectItem"
import { TYPE_IDS } from "../../constants"
import { PlayerUtils } from "../../utils/player"

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { viewDirection, viewStart, player } = data

        const rayResult = player.dimension.getEntitiesFromRay(viewStart, viewDirection, {
            ignoreBlockCollision: true,
            excludeTypes: [
                TYPE_IDS.ARROW,
                TYPE_IDS.CORE,
                TYPE_IDS.BACK_PANEL,
                TYPE_IDS.TICKING_ENTITY,
                TYPE_IDS.ITEM_DISPLAY,
                TYPE_IDS.PANEL,
            ],
            excludeNames: [player.name],
        })

        if (!rayResult.length) return Infinity

        return rayResult[0].distance
    },
    callback: (data) => {
        const { viewDirection, viewStart, player } = data

        const rayResult = player.dimension.getEntitiesFromRay(viewStart, viewDirection, {
            ignoreBlockCollision: true,
            excludeTypes: [
                TYPE_IDS.ARROW,
                TYPE_IDS.CORE,
                TYPE_IDS.BACK_PANEL,
                TYPE_IDS.TICKING_ENTITY,
                TYPE_IDS.ITEM_DISPLAY,
                TYPE_IDS.PANEL,
            ],
            excludeNames: [player.name],
        })

        new EntityDrag(rayResult[0].entity).setEditor(player)
    },
})

SelectItem.events.releaseUse.subscribe((data) => {
    const { player } = data

    EntityDrag.removeEditor(player)
})

export class EntityDrag {
    /**
     * @type {Record<number,EntityDrag>}
     */
    static list = {}

    /**
     * @param {number} id
     * @returns {EntityDrag|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {EntityDrag[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {EntityDrag} drag
     */
    static remove(drag) {
        delete this.list[drag.id]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {boolean}
     */
    static removeEditor(player) {
        for (const drag of this.getAll()) {
            if (drag.editor?.id === player.id) {
                drag.removeEditor()
                return true
            }
        }
        return false
    }

    static innit() {
        system.runInterval(() => {
            for (const drag of this.getAll()) {
                if (!drag.editor || !drag.editor.isValid) continue

                drag.move()
            }
        })
    }

    /** @type {number} */
    distance

    /** @type {import("@minecraft/server").Player} */
    editor
    size = new Vector(0.5)

    /**
     * @param {import("@minecraft/server").Entity}
     */
    constructor(entity) {
        this.entity = entity
        this.dimension = entity.dimension
        this.id = this.entity.id

        EntityDrag.list[this.id] = this
    }

    move() {
        this.teleport(this.getPointer())
    }

    /**
     * @param {Vector}
     */
    teleport(location) {
        this.entity.teleport(location)
        this.location = location
    }

    getPointer() {
        return Vector.multiply(this.editor.getViewDirection(), this.distance).add(
            PlayerUtils.getEyeLocation(this.editor),
        )
    }

    /** @param {import("@minecraft/server").Player} */
    setEditor(player) {
        this.editor = player

        this.distance = Vector.distance(
            this.entity.location,
            PlayerUtils.getEyeLocation(player),
        )
    }

    removeEditor() {
        this.originalLocation = this.location.copy()

        EntityDrag.remove(this)
    }

    remove() {
        this.entity.remove()
        Core.remove(this)
    }
}

EntityDrag.innit()
