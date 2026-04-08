import { registerEdit } from "../registry.js"
import { BlockId } from "../../utils/blockId.js"
import { Vector } from "../../utils/vector.js"
import { world } from "@minecraft/server"

registerEdit("placeBlueprint", {
    *run(ctx) {
        const undoCtx = {
            type: "placeBlueprint",
            selections: ctx.selections,
            location: ctx.location,
            dimension: ctx.dimension,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        const indexToBlock = {}
        let permutation
        let i = 0

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

        for (const [key, values] of Object.entries(ctx.encodedPermutations)) {
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
                        const location = new Vector(x, y, z)
                            .add(selection.location)
                            .add(ctx.location)
                            .round()
                        const block = yield ctx.getBlock(location)

                        if (indexToBlock[i]) permutation = indexToBlock[i]

                        if (block.typeId === permutation.type.id) {
                            indexChange(undefined)
                        } else {
                            indexChange(BlockId.get(block.permutation))
                        }

                        if (permutation && permutation !== "undefined") {
                            metrics.blocks++
                            block.setPermutation(permutation)
                        }
                        i++
                    }
                }
            }
        }

        return { undoCtx, metrics }
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
        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z)
                            .add(selection.location)
                            .add(ctx.location)
                            .round()

                        const block = yield ctx.getBlock(location)

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

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            selections: ctx.selections,
            location: ctx.location,
            changes: ctx.changes,
        }

        return undoCtx
    },
    unzipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimension: world.getDimension(ctx.dimensionId),
            location: new Vector(ctx.location),
            selections: ctx.selections,
            changes: ctx.changes,
        }

        return undoCtx
    },
})
