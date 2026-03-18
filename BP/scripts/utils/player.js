/** @param {import("@minecraft/server").Player} */

import { system, world } from "@minecraft/server"
import { PACK_ID } from "../constants"

export class PlayerUtils {
    /**
     * @param {import("@minecraft/server").Player}
     * @returns {import("@minecraft/server").Vector3}
     */
    static getEyeLocation(player) {
        const headModelSize = 8
        const headHeight = headModelSize / 32
        const location = player.getHeadLocation()

        location.y += headHeight / 2 - 0.022

        return location
    }

    static id = PlayerId
}

export class PlayerId {
    /** @type {Record<string,string>} */
    static idToName = {}

    static propertyIdentifier = PACK_ID + ":player_id_to_name"

    /**
     * @param {string}
     * @returns {string|undefined}
     */
    static getName(playerId) {
        return this.idToName[playerId]
    }

    static save() {
        world.setDynamicProperty(this.propertyIdentifier, JSON.stringify(this.idToName))
    }

    static innit() {
        this.idToName = JSON.parse(
            world.getDynamicProperty(this.propertyIdentifier) || "{}",
        )
    }
}

world.afterEvents.playerJoin.subscribe((data) => {
    const { playerId, playerName } = data

    Id.idToName[playerId] = playerName
    Id.save()
})

system.run(() => {
    Id.innit()
})
