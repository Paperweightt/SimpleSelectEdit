import { world } from "@minecraft/server"
import { Vector } from "../../utils/vector"
import { registerEdit } from "../registry"

registerEdit("move", {
    async run(ctx) {
        const undoCtx = {
            selections: ctx.selections,
            dimension: ctx.dimension,
            start: ctx.start,
            end: ctx.end,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const diff = Vector.subtract(ctx.start, ctx.end)
        const originalBlocks = []

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location).add(diff)
                        const block = await ctx.getBlock(location)

                        originalBlocks.push(block.typeId)
                        block.setType("minecraft:air")
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

                        block.setType(originalBlocks[i])

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

        for (const selection of ctx.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)

                        originalBlocks.push(block.typeId)
                        block.setType("minecraft:air")
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

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            selections: ctx.selections,
            dimension: ctx.dimension,
            start: ctx.start,
            end: ctx.end,
        }

        return undoCtx
    },
    unzipUndo(ctx) {
        const undoCtx = {
            dimension: world.getDimension(ctx.dimensionId),
            selections: ctx.selections,
            start: new Vector(ctx.start),
            end: new Vector(ctx.end),
        }

        return undoCtx
    },
})
