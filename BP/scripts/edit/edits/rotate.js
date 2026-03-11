import { world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { PACK_ID } from "../../constants.js"

registerEdit("rotate", {
    /**
     * @typedef {object} rotateObject
     * @property {import("../../selection/selection.js").Selection[]} selections
     */

    /**
     * @param {rotateObject} ctx
     */
    async run(ctx) {
        const undoCtx = {
            type: "rotate",
            selections: ctx.selections,
            dimension: ctx.dimension,
            rotation: ctx.start,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const structureId = PACK_ID + ":edit_temp"

        world.structureManager.delete(structureId)

        for (const selection of ctx.selections) {
            const start = selection.location
            const end = Vector.add(selection.location, selection.size)

            world.structureManager.createFromWorld(
                structureId,
                ctx.dimension,
                start,
                end,
                {
                    includeEntities: false,
                },
            )

            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)
                        const block = await ctx.getBlock(location)
                        block.setType("minecraft:air")
                        metrics.blocks++
                    }
                }
            }

            world.structureManager.place(structureId, ctx.dimension, selection.location, {
                rotation: ctx.rotation === 0 ? "None" : "Rotate" + ctx.rotation,
            })
        }

        world.structureManager.delete(structureId)

        return { undoCtx, metrics }
    },
    async undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
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
            rotation: ctx.rotation,
        }
        undoCtx.selections = ctx.selections.map((selection) => selection.snapshot())

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            rotation: ctx.rotation,
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
