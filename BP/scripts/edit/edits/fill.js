import { world } from "@minecraft/server"
import { LootTable } from "../../utils/lootTable.js"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { BlockId } from "../../utils/blockId.js"
import { Edit } from "../edit.js"

registerEdit("fill", {
    async run(ctx) {
        const undoCtx = {
            type: "fill",
            selections: ctx.selections,
            dimension: ctx.dimension,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        let prevId
        const indexChange = (id) => {
            if (prevId === id) return

            if (!undoCtx.changes[id]) {
                undoCtx.changes[id] = [i]
            } else {
                undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        const lootTable = new LootTable(Edit.seed)

        for (const [key, value] of Object.entries(ctx.blocks)) {
            lootTable.add(key, value)
        }

        let i = 0
        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)
                        const typeId = lootTable.roll(location) ?? Edit.defaultBlock

                        if (block.typeId === typeId) {
                            indexChange(undefined)
                        } else {
                            indexChange(BlockId.get(block.permutation))
                            block.setType(typeId)
                            metrics.blocks++
                        }

                        i++
                    }
                }
            }
        }

        return { undoCtx, metrics }
    },
    async undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const diff = Vector.subtract(ctx.start, ctx.end)
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
        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)

                        if (indexToBlock[i]) permutation = indexToBlock[i]
                        if (permutation && permutation !== "undefined") {
                            metrics.blocks++
                            block.setPermutation(permutation)
                        }
                        i++
                    }
                }
            }
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
        }

        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        world.sendMessage(JSON.stringify(undoCtx))

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
