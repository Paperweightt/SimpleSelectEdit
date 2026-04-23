import { TYPE_IDS } from "../../constants.js"
import { Edit } from "../../edit/index.js"
import { world } from "@minecraft/server"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { UndoMenu } from "./form.js"
import { Menu } from "../../menu/menu.js"

world.afterEvents.itemUse.subscribe(async (data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.UNDO_ITEM) return

    const menu = Menu.get(source.id)

    if (!source.customIsShifting) {
        if (menu) menu.remove()

        const result = await Edit.playerUndoRecent(source.id)
        const group = SelectionGroup.get(source.id)

        if (group) group.reloadEntityLocations()

        Edit.log(source, result)
    } else {
        new UndoMenu(source).mainMenu()
    }
})
