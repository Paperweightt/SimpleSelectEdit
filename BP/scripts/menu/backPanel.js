import { world } from "@minecraft/server"
import { PROPERTIES, TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"

export class BackPanel {
    firstLoad = true
    rotation = { x: 0, y: 0 }
    size = { x: 0, y: 0 }

    /**
     * @param {import("../utils/vector").Vector} location
     * @param {import("@minecraft/server").Dimension)} dimension
     * @param {import("@minecraft/server").EntityQueryOptions} viewQuery
     */
    constructor(location, dimension, viewQuery) {
        this.location = location
        this.dimension = dimension
        this.viewQuery = viewQuery

        this.load()
    }

    load() {
        const { min, max } = this.dimension.heightRange

        if (this.location.y < min || this.location.y > max) {
            const spawnLocation = this.location.copy()

            spawnLocation.y = Math.min(this.location.y, max)
            spawnLocation.y = Math.max(this.location.y, min)

            this.entity = this.dimension.spawnEntity(TYPE_IDS.BACK_PANEL, spawnLocation)
            this.entity.teleport(this.location)
        } else {
            this.entity = this.dimension.spawnEntity(TYPE_IDS.BACK_PANEL, this.location)
        }

        this.setRotation(this.rotation)
        this.setSize(this.size)

        DeathOnReload.addEntity(this.entity)

        if (this.reloadId) world.afterEvents.entityDie.unsubscribe(this.reloadId)
        this.reloadId = world.afterEvents.entityDie.subscribe((data) => {
            if (data.deadEntity.id === this.entity.id) this.load()
        })
    }

    /**
     * @param {import("../utils/vector").Vector} location
     */
    teleport(location) {
        this.location = location
        this.entity.teleport(location)
    }

    /**
     * @param {{y:number,p:number,r:number}} rotation
     */
    setRotation(rotation) {
        this.rotation = rotation
        this.entity.setProperty(PROPERTIES.HEAD_X_ROTATION, rotation.x + 90)
        this.entity.setProperty(PROPERTIES.HEAD_Y_ROTATION, rotation.y)
    }

    /**
     * @param {{x:number,y:number}}
     */
    setSize({ x, y }) {
        this.size = { x, y }
        this.entity.setProperty(PROPERTIES.HEAD_X_SIZE, x)
        this.entity.setProperty(PROPERTIES.HEAD_Y_SIZE, y)
    }

    remove() {
        if (this.entity?.isValid) this.entity.remove()
    }
}
