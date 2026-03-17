import { Selection } from "../../selection/selection"
import { SelectionGroup } from "../../selection/selectionGroup"
import { TYPE_IDS } from "../../constants"
import { world } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"

world.afterEvents.itemUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.DELETE_ITEM) return

    const selection = Selection.getPlayerViewBox(source)?.selection

    if (!source.customIsShifting) {
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
    } else {
        // TODO: test for deletion of already deleted selection
        const selections = Selection.getAll().filter((selection) => !selection.isOwned)

        if (selections.length === 0) {
            source.sendMessage("No selections to delete")
            return
        }

        const form = new ActionFormData()
            .title("Delete Selections")
            .body(`  ${selections.length} unowned selection detected\n  Are you sure?`)
            .button("§4Delete")
            .button("Cancel")

        form.show(source).then((response) => {
            if (response.canceled) return

            if (response.selection === 0) {
                for (const selection of selections) {
                    if (!selection.isOwned) selection.remove()
                }
            }
        })
    }
})
