import { world } from "@minecraft/server"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { Vector } from "../../utils/vector.js"

registerEdit("resize", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "resize",
            selections: ctx.selections,
            vector: ctx.vector,
            dimension: ctx.dimension,
            previousData: [],
        }

        for (const selection of ctx.selections) {
            ctx.undoCtx.previousData.push([selection.location, selection.size])
        }

        return {
            blocks: 0,
            ticks: 0,
        }
    },
    *undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        for (let i = 0; i < ctx.selections.length; i++) {
            const [location, size] = ctx.previousData[i]
            const selection = ctx.selections[i]

            selection.setLocation(new Vector(location))
            selection.setSize(new Vector(size))
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            vector: ctx.vector,
            direction: ctx.direction,
            dimensionId: ctx.dimension.id,
            previousData: ctx.previousData,
        }
        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            vector: new Vector(ctx.vector),
            dimension: dimension,
            direction: ctx.direction,
            previousData: ctx.previousData,
            selections: ctx.selections.map((snapshot) => {
                return (
                    Selection.get(snapshot[0]) ||
                    Selection.parseSnapshot(snapshot, dimension)
                )
            }),
        }

        return undoCtx
    },
})
