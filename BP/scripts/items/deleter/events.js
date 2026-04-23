import { Selection } from "../../selection/selection"
import { SelectionGroup } from "../../selection/selectionGroup"
import { TYPE_IDS } from "../../constants"
import { world } from "@minecraft/server"
import { ActionFormData } from "@minecraft/server-ui"
import { Menu } from "../../menu/menu"

world.afterEvents.itemUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.DELETE_ITEM) return

    const selection = Selection.getPlayerViewBox(source)?.selection
    const menu = Menu.get(source.id)

    if (!source.customIsShifting) {
        if (!selection) return

        if (!selection.isOwned) {
            selection.remove()
            return
        }

        const group = SelectionGroup.get(source.id)
        const index = group.getSelectionIndex(selection)

        if (index === -1) return

        group.removeSelection(index)
        selection.remove()

        if (menu) menu.remove()
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
