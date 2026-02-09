import { system, world } from "@minecraft/server"

export class DeathOnReload {
    /** @param {import("@minecraft/server").Entity} entity */
    static addEntity(entity) {
        entity.setDynamicProperty("deathOnReload", this.deathNumber * -1)
    }

    static innit() {
        this.deathNumber *= -1
        world.setDynamicProperty("deathNumber", this.deathNumber)

        const overworld = world.getDimension("overworld")
        const nether = world.getDimension("nether")
        const theEnd = world.getDimension("the_end")

        const entities = [
            ...overworld.getEntities(),
            ...nether.getEntities(),
            ...theEnd.getEntities(),
        ]

        for (const entity of entities) {
            if (entity.getDynamicProperty("deathOnReload") === this.deathNumber) {
                entity.remove()
            }
        }

        world.afterEvents.entityLoad.subscribe((data) => {
            const entity = data.entity

            if (!entity.isValid) return
            if (entity.getDynamicProperty("deathOnReload") === DeathOnReload.deathNumber) {
                entity.remove()
            }
        })
    }
}

system.run(() => {
    DeathOnReload.deathNumber = world.getDynamicProperty("deathNumber") || -1
    DeathOnReload.innit()
})
