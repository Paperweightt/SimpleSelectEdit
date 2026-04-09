import { CustomCommandParamType, CommandPermissionLevel } from "@minecraft/server"
import { Edit } from "../../edit/index.js"
import { SelectionGroup } from "../../selection/selectionGroup"
import { Commands } from "../commands.js"

Commands.register({
    name: "undo",
    description: "undo",
    optionalParameters: [
        { name: "amount", type: CustomCommandParamType.Integer },
        { name: "victim", type: CustomCommandParamType.PlayerSelector },
    ],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, amount = 1, victim) => {
        const { sourceEntity } = data

        const id = victim?.id || sourceEntity.id

        for (let i = 0; i < amount; i++) {
            const result = await Edit.playerUndoRecent(id)

            const group = SelectionGroup.get(id)

            if (group) {
                group.reloadEntityLocations()
                group.updateEntityValues()
            }

            if (result.blocks !== 0) {
                sourceEntity.sendMessage(result.blocks + " blocks filled")
            }
        }

        return { status: 0 }
    },
})

Commands.register({
    name: "pause",
    description: "pause",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data) => {
        const { sourceEntity } = data

        if (sourceEntity.job.isValid) sourceEntity.job.pause()

        return { status: 0 }
    },
})

Commands.register({
    name: "resume",
    description: "resume",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data) => {
        const { sourceEntity } = data

        if (sourceEntity.job.isValid) sourceEntity.job.resume()

        return { status: 0 }
    },
})
