import { world, BlockVolume } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { PACK_ID } from "../../constants.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"

/**
 * @param {Vector} location
 * @param {Vector} pivot
 * @param {0 | 90 | 180 | 270} rotation
 * @returns {Vector}
 */
function rotate(location, pivot, rotation) {
    location.subtract(pivot)

    switch (rotation) {
        case 90:
            location.setAxisOrder("zyx")
            location.x *= -1
            break
        case 180:
            location.x *= -1
            location.z *= -1
            break
        case 270:
            location.setAxisOrder("zyx")
            location.z *= -1
            break
    }

    return location.add(pivot)
}

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
            rotation: (360 + ctx.rotation) % 360,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation)
        const groupPivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)

        // delete structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const id = structureId + "_" + i
            world.structureManager.delete(id)
        }

        // create structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const id = structureId + "_" + i

            world.structureManager.createFromWorld(id, ctx.dimension, start, end, {
                includeEntities: false,
                saveMode: "Memory",
            })
        }

        for (const selection of ctx.selections) {
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const volume = new BlockVolume(start, end).getBlockLocationIterator()

            for (const location of volume) {
                const block = await ctx.getBlock(location)
                block.setType("minecraft:air")
                metrics.blocks++
            }
        }

        // rotate structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const id = structureId + "_" + i
            const offset = new Vector(0)
            const pivot = Vector.subtract(selection.size, 1)
                .divide(2)
                .add(selection.location)

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

                selection.location.add(offset)
                selection.size.round()
            }

            selection.location
                .subtract(
                    Vector.subtract(
                        pivot,
                        rotate(pivot.copy(), groupPivot, ctx.rotation),
                    ),
                )
                .ceil()

            world.structureManager.place(id, ctx.dimension, selection.location, {
                rotation: ctx.rotation === 0 ? "None" : "Rotate" + ctx.rotation,
            })
        }

        // delete structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const id = structureId + "_" + i
            world.structureManager.delete(id)
        }

        return { undoCtx, metrics }
    },
    async undo(ctx) {
        const structureId = PACK_ID + ":edit_temp"
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation)
        const groupPivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)

        // delete structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const id = structureId + "_" + i
            world.structureManager.delete(id)
        }

        // create structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const id = structureId + "_" + i

            world.structureManager.createFromWorld(id, ctx.dimension, start, end, {
                includeEntities: false,
                saveMode: "Memory",
            })
        }

        for (const selection of ctx.selections) {
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const volume = new BlockVolume(start, end).getBlockLocationIterator()

            for (const location of volume) {
                const block = await ctx.getBlock(location)
                block.setType("minecraft:air")
                metrics.blocks++
            }
        }

        // rotate structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const id = structureId + "_" + i
            const offset = new Vector(0)
            const pivot = Vector.subtract(selection.size, 1)
                .divide(2)
                .add(selection.location)

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

                selection.location.add(offset)
                selection.size.round()
            }

            selection.location
                .subtract(
                    Vector.subtract(
                        pivot,
                        rotate(pivot.copy(), groupPivot, ctx.rotation),
                    ),
                )
                .floor()

            world.structureManager.place(id, ctx.dimension, selection.location, {
                rotation: ctx.rotation === 0 ? "None" : "Rotate" + ctx.rotation,
            })
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
            dimension: dimension,
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
