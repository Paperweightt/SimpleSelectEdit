import { world } from "@minecraft/server"
import { TYPE_IDS } from "../constants"
import { DeathOnReload } from "../util/deathOnReload"

export class BackPanel {
    firstLoad = true
    rotation = { x: 0, y: 0 }
    size = { x: 0, y: 0 }

    /**
     * @param {import("../util/vector").Vector} location
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
        this.entity = this.dimension.spawnEntity(TYPE_IDS.BACK_PANEL, this.location)
        this.setRotation(this.rotation)
        this.setSize(this.size)

        DeathOnReload.addEntity(this.entity)

        if (this.reloadId) world.afterEvents.entityDie.unsubscribe(this.reloadId)
        this.reloadId = world.afterEvents.entityDie.subscribe((data) => {
            if (data.deadEntity.id === this.entity.id) this.load()
        })
    }

    /**
     * @param {import("../util/vector").Vector} location
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
        this.entity.setProperty("ptb:yrotation", rotation.y)
        this.entity.setProperty("ptb:xrotation", rotation.x + 90)
    }

    /**
     * @param {{x:number,y:number}}
     */
    setSize({ x, y }) {
        this.size = { x, y }
        this.entity.setProperty("ptb:xsize", x)
        this.entity.setProperty("ptb:ysize", y)
    }

    remove() {
        if (this.entity?.isValid) this.entity.remove()
    }
}
