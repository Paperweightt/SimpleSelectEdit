import { CustomCommandParamType, CommandPermissionLevel, system } from "@minecraft/server"
import { PACK_ID } from "../constants.js"
import { SelectionGroup } from "../selection/selectionGroup.js"
import { Edit } from "../edit/index.js"

/** @import * as Types from "./types.js" */

export class Commands {
    static registry = []

    /**
     * @param {Types.CommandRegister} ctx
     */
    static register(ctx) {
        this.registry.push([
            {
                name: PACK_ID + ":" + ctx.name,
                cheatsRequired: ctx.cheatsRequired,
                description: ctx.description,
                mandatoryParameters: ctx.mandatoryParameters,
                optionalParameters: ctx.optionalParameters,
                permissionLevel: ctx.permissionLevel,
            },
            ctx.callback,
        ])
    }

    static innit() {
        system.beforeEvents.startup.subscribe((data) => {
            const { customCommandRegistry } = data

            for (const [command, fn] of this.registry) {
                customCommandRegistry.registerCommand(command, (data, ...params) => {
                    system.run(() => {
                        fn(data, ...params)
                    })
                })
            }
        })
    }
}
