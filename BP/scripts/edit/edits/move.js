import { world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { BlockId } from "../../utils/blockId.js"

registerEdit("move", {
    async run(ctx) {
        const undoCtx = {
            type: "move",
            selections: ctx.selections,
            dimension: ctx.dimension,
            start: ctx.start,
            end: ctx.end,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const diff = Vector.subtract(ctx.start, ctx.end)
        const originalPermutations = []

        let prevId
        const addChange = (id) => {
            if (prevId === id) return

            if (!undoCtx.changes[id]) {
                undoCtx.changes[id] = [i]
            } else {
                undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location).add(diff)
                        const block = await ctx.getBlock(location)

                        originalPermutations.push(block.permutation)
                    }
                }
            }
        }

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location).add(diff)
                        const block = await ctx.getBlock(location)
                        block.setType("minecraft:air")
                        metrics.blocks++
                    }
                }
            }
        }
        let i = 0

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)
                        const newPermutation = originalPermutations[i]
                        const newPermutationId = BlockId.get(originalPermutations[i])
                        let oldPermutationId = BlockId.get(block.permutation)

                        if (newPermutationId === oldPermutationId) {
                            oldPermutationId = undefined
                        } else {
                            block.setPermutation(newPermutation)
                            metrics.blocks++
                        }

                        addChange(oldPermutationId)

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
        const originalBlocks = []
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

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)

                        originalBlocks.push(block.typeId)
                    }
                }
            }
        }

        let j = 0
        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)

                        if (indexToBlock[j]) permutation = indexToBlock[j]
                        if (permutation && permutation !== "undefined") {
                            metrics.blocks++
                            block.setPermutation(permutation)
                        }
                        j++
                    }
                }
            }
        }

        let i = 0
        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location).add(diff)
                        const block = await ctx.getBlock(location)

                        block.setType(originalBlocks[i])

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
            start: ctx.start,
            end: ctx.end,
            changes: ctx.changes,
        }

        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        return undoCtx
    },
    unzipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimension: world.getDimension(ctx.dimensionId),
            start: new Vector(ctx.start),
            end: new Vector(ctx.end),
            changes: ctx.changes,
            selections: [],
        }

        for (const snapshot of ctx.selections) {
            let selection = Selection.get(snapshot.id)

            if (!selection) {
                selection = new Selection(
                    new Vector(snapshot.location),
                    new Vector(snapshot.size),
                    undoCtx.dimension,
                )
            }

            undoCtx.selections.push(selection)
        }

        return undoCtx
    },
})
