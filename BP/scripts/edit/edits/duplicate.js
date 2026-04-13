import { world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { BlockId } from "../../utils/blockId.js"

registerEdit("duplicate", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "duplicate",
            selections: ctx.selections,
            dimension: ctx.dimension,
            vector: ctx.vector,
            blocks: 0,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        let i = 0
        let prevId
        const addChange = (id) => {
            if (prevId === id) return

            if (!ctx.undoCtx.changes[id]) {
                ctx.undoCtx.changes[id] = [i]
            } else {
                ctx.undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        const finishedSelections = []
        const direction = Vector.abs(ctx.vector)
            .divide(ctx.vector)
            .map((v) => (isNaN(v) ? 1 : v))
            .multiply(-1)

        for (const selection of ctx.selections) {
            let iterator = selection.getIterator(direction)

            setblock: for (const endLocation of iterator) {
                for (const [start, end] of finishedSelections) {
                    if (Vector.isBetweenInclusive(endLocation, start, end))
                        continue setblock
                }

                const startLocation = Vector.subtract(endLocation, ctx.vector)
                const block = yield ctx.getBlock(startLocation)
                const copy = yield ctx.getBlock(endLocation)

                metrics.blocks++
                ctx.undoCtx.blocks++

                addChange(BlockId.get(copy.permutation))
                i++

                copy.setPermutation(block.permutation)
            }
            const { start, end } = selection.getStartEnd()

            finishedSelections.push([start, end])
        }

        return metrics
    },
    *undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const indexToBlock = {}
        let permutation

        for (const [key, values] of Object.entries(ctx.changes)) {
            let permutation = "undefined"

            if (key !== "undefined") {
                permutation = BlockId.toPermutation(key)
            }

            for (const value of values) {
                indexToBlock[value] = permutation
            }
        }

        let i = 0
        const finishedSelections = []
        const direction = Vector.abs(ctx.vector)
            .divide(ctx.vector)
            .map((v) => (isNaN(v) ? 1 : v))
            .multiply(-1)

        for (const selection of ctx.selections) {
            const iterator = selection.getIterator(direction)

            setblock: for (const startLocation of iterator) {
                for (const [start, end] of finishedSelections) {
                    if (Vector.isBetweenInclusive(startLocation, start, end))
                        continue setblock
                }

                const block = yield ctx.getBlock(startLocation)

                if (!ctx.blocks--) {
                    for (const selection of ctx.selections) {
                        selection.location.subtract(ctx.vector)
                        selection.displayLocation = selection.location
                    }
                    return metrics
                }

                if (indexToBlock[i]) permutation = indexToBlock[i]

                block.setPermutation(permutation)

                metrics.blocks++

                i++
            }
            const { start, end } = selection.getStartEnd()

            finishedSelections.push([start, end])
        }

        for (const selection of ctx.selections) {
            selection.location.subtract(ctx.vector)
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            vector: ctx.vector,
            blocks: ctx.blocks,
            changes: ctx.changes,
        }

        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            dimension: dimension,
            vector: new Vector(ctx.vector),
            changes: ctx.changes,
            blocks: ctx.blocks,
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
