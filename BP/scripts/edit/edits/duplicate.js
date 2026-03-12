import { world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { BlockId } from "../../utils/blockId.js"

registerEdit("duplicate", {
    async run(ctx) {
        const undoCtx = {
            type: "duplicate",
            selections: ctx.selections,
            dimension: ctx.dimension,
            vector: ctx.vector,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
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
                        const location = new Vector(x, y, z)
                            .add(selection.location)
                            .subtract(ctx.vector)
                        const block = await ctx.getBlock(location)

                        originalPermutations.push(block.permutation)
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
            selection.location.subtract(ctx.vector)
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            vector: ctx.vector,
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
