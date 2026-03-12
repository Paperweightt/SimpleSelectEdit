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
        const structureId = PACK_ID + ":edit_temp"
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

        world.structureManager.delete(structureId)

        for (const selection of ctx.selections) {
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const offset = new Vector(0)

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

            if (
                selection.size.x !== selection.size.z &&
                (ctx.rotation === 90 || ctx.rotation === 270)
            ) {
                if (selection.size.x > selection.size.z) {
                    offset.z -= selection.size.x / 2 - selection.size.z / 2
                    offset.x += selection.size.x / 2 - selection.size.z / 2
                } else {
                    offset.x -= selection.size.z / 2 - selection.size.x / 2
                    offset.z += selection.size.z / 2 - selection.size.x / 2
                }

                let temp = selection.size.x

                selection.size.x = selection.size.z
                selection.size.z = temp

                selection.location.add(offset).round()
                selection.size.round()
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
