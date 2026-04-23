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
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        for (let i = 0; i < amount; i++) {
            const result = await Edit.playerUndoRecent(id)

            const group = SelectionGroup.get(id)

            if (group) group.reloadEntityLocations()

            metrics.blocks += result.blocks
            metrics.ticks += result.ticks
        }

        Edit.log(sourceEntity, metrics)

        return { status: 0 }
    },
})

Commands.register({
    name: "pause",
    description: "pause",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data) => {
        const { sourceEntity } = data

        if (sourceEntity.job?.isValid) sourceEntity.job.pause()

        return { status: 0 }
    },
})

Commands.register({
    name: "resume",
    description: "resume",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data) => {
        const { sourceEntity } = data

        if (sourceEntity.job?.isValid) sourceEntity.job.resume()

        return { status: 0 }
    },
})

Commands.register({
    name: "cancel",
    description: "cancel",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data) => {
        const { sourceEntity } = data

        if (sourceEntity.job?.isValid) sourceEntity.job.cancel()

        return { status: 0 }
    },
})
