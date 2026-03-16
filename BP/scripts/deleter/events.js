import { world } from "@minecraft/server"
import { Selection } from "../selection/selection"
import { SelectionGroup } from "../selection/selectionGroup"
import { TYPE_IDS } from "../constants"

world.afterEvents.itemUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.DELETE_ITEM) return

    const selection = Selection.getPlayerViewBox(source)?.selection

    if (!selection) return

    if (!selection.isOwned) {
        selection.remove()
        return
    }

    const group = SelectionGroup.get(source.id)

    if (group?.hasSelection(selection)) {
        group.remove()
        selection.remove()
    }
})
