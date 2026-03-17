import { TYPE_IDS } from "../../constants.js"
import { Edit } from "../../edit/index.js"
import { world } from "@minecraft/server"

world.afterEvents.itemUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.UNDO_ITEM) return

    Edit.playerUndoRecent(source)
})
