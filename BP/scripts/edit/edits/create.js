import { world } from "@minecraft/server"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"

registerEdit("create", {
    async run(ctx) {
        const undoCtx = {
            type: "create",
            selection: ctx.selection,
            dimension: ctx.dimension,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        // creation is handled outside

        return { undoCtx, metrics }
    },
    async undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        if (ctx.selection.isOwned) {
            for (const group of SelectionGroup.getAll()) {
                const index = group.getSelectionIndex(ctx.selection)
                if (index !== -1) {
                    group.removeSelection(index)

                    if (group.selections.length > 0) {
                        group.reloadArrowLocations()
                        group.reloadCoreLocation()
                        group.updateOriginalLocations()
                    }

                    break
                }
            }
        }

        ctx.selection.remove()

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            snapshot: ctx.selection.snapshot(),
        }

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            selection:
                Selection.get(ctx.snapshot[0]) ||
                Selection.parseSnapshot(ctx.snapshot, dimension),
        }

        return undoCtx
    },
})
