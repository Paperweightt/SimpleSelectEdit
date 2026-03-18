import { TYPE_IDS } from "../../constants.js"
import { Edit } from "../../edit/index.js"
import { world } from "@minecraft/server"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { UndoMenu } from "./form.js"

world.afterEvents.itemUse.subscribe(async (data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.UNDO_ITEM) return

    if (!source.customIsShifting) {
        const { blocks } = await Edit.playerUndoRecent(source.id)

        const group = SelectionGroup.get(source.id)

        if (group) {
            group.reloadArrowLocations()
            group.reloadCoreLocation()
            group.updateOriginalLocations()
        }

        if (blocks > 1000) {
            player.sendMessage(blocks + " blocks filled")
        }
    } else {
        new UndoMenu(source).mainMenu()
    }
})
