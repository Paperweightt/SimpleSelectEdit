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
            direction: ctx.direction,
            dimension: ctx.dimension,
        }
        // only pass data to undo since resize occurs constantly as the player drags an arrow

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

        for (const selection of ctx.selections) {
            if (
                ctx.direction === "Down" ||
                ctx.direction === "West" ||
                ctx.direction === "North"
            ) {
                const newSize = Vector.add(selection.size, ctx.vector)
                const sizeChange = Vector.subtract(selection.size, newSize)

                selection.location.add(sizeChange)
                selection.size = newSize
            } else {
                const newSize = Vector.subtract(selection.size, ctx.vector)
                selection.size = newSize
            }
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            vector: ctx.vector,
            direction: ctx.direction,
            dimensionId: ctx.dimension.id,
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
