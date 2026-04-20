import { world } from "@minecraft/server"
import { LootTable } from "../../utils/lootTable.js"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { BlockId } from "../../utils/blockId.js"
import { Edit } from "../edit.js"

registerEdit("fill", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "fill",
            selections: ctx.selections,
            dimension: ctx.dimension,
            changes: {},
            blocks: 0,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        let prevId
        const indexChange = (id) => {
            if (prevId === id) return

            if (!ctx.undoCtx.changes[id]) {
                ctx.undoCtx.changes[id] = [i]
            } else {
                ctx.undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        const lootTable = new LootTable(Edit.seed)

        for (const [key, value] of Object.entries(ctx.blocks)) {
            lootTable.add(key, value)
        }

        let i = 0

        const finishedSelections = []

        for (const selection of ctx.selections) {
            setblock: for (const location of selection.getIterator()) {
                for (const [start, end] of finishedSelections) {
                    if (Vector.isBetweenInclusive(location, start, end)) continue setblock
                }
                const block = yield ctx.getBlock(location)
                const typeId = lootTable.roll(location) ?? Edit.defaultBlock

                indexChange(BlockId.get(block.permutation))
                block.setType(typeId)
                metrics.blocks++
                ctx.undoCtx.blocks++

                i++
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
        const diff = Vector.subtract(ctx.start, ctx.end)
        const indexToBlock = {}
        let permutation

        for (const [key, values] of Object.entries(ctx.changes)) {
            const permutation = BlockId.toPermutation(key)

            for (const value of values) {
                indexToBlock[value] = permutation
            }
        }

        const finishedSelections = []

        let i = 0

        for (const selection of ctx.selections) {
            setblock: for (const location of selection.getIterator()) {
                for (const [start, end] of finishedSelections) {
                    if (Vector.isBetweenInclusive(location, start, end)) continue setblock
                }
                const block = yield ctx.getBlock(location)

                if (indexToBlock[i]) permutation = indexToBlock[i]

                if (!ctx.blocks--) return metrics
                block.setPermutation(permutation)
                metrics.blocks++
                i++
            }

            const { start, end } = selection.getStartEnd()

            finishedSelections.push([start, end])
        }

        for (const selection of ctx.selections) {
            selection.location.add(diff)
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            changes: ctx.changes,
            blocks: ctx.blocks,
        }

        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            dimension: dimension,
            start: new Vector(ctx.start),
            end: new Vector(ctx.end),
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
