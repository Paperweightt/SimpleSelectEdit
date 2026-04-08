import { world, BlockVolume } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { PACK_ID } from "../../constants.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { BlockId } from "../../utils/blockId.js"

/**
 * @param {Vector} location
 * @param {Vector} pivot
 * @param {"x"|"z"|"xz"} flip
 * @returns {Vector}
 */
function flip(location, pivot, flip) {
    const newLocation = Vector.subtract(location, pivot)

    if (flip.includes("z")) newLocation.x *= -1
    if (flip.includes("x")) newLocation.z *= -1

    return newLocation.add(pivot)
}

registerEdit("flip", {
    /**
     * @typedef {object} flipObject
     * @property {import("../../selection/selection.js").Selection[]} selections
     */

    /**
     * @param {flipObject} ctx
     */
    *run(ctx) {
        const structureId = PACK_ID + ":edit_temp"
        const undoCtx = {
            type: "flip",
            selections: ctx.selections,
            dimension: ctx.dimension,
            flip: ctx.flip,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation).add(1)
        const groupPivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)

        let j = 0
        let prevId
        const addChange = (id, i) => {
            if (prevId === id) return

            if (!undoCtx.changes[id]) {
                undoCtx.changes[id] = [i]
            } else {
                undoCtx.changes[id].push(i)
            }

            prevId = id
        }

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

        // set air
        for (const selection of ctx.selections) {
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const volume = new BlockVolume(start, end).getBlockLocationIterator()

            for (const location of volume) {
                const block = yield ctx.getBlock(location)
                block.setType("minecraft:air")
                metrics.blocks++
            }
        }

        // save blocks
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const start = flip(selection.location, groupPivot, ctx.flip)
            let end = Vector.add(selection.location, selection.size).subtract(1)

            end = flip(end, groupPivot, ctx.flip)

            const volume = new BlockVolume(start, end).getBlockLocationIterator()

            for (const location of volume) {
                const block = yield ctx.getBlock(location)
                const id = BlockId.get(block.permutation)

                addChange(id, j++)
            }
        }

        // flip structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const id = structureId + "_" + i
            const pivot = Vector.subtract(selection.size, 1)
                .divide(2)
                .add(selection.location)

            selection.location.subtract(
                Vector.subtract(pivot, flip(pivot, groupPivot, ctx.flip)),
            )

            world.structureManager.place(id, ctx.dimension, selection.location, {
                mirror: ctx.flip.toUpperCase(),
            })
        }

        // delete structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const id = structureId + "_" + i
            world.structureManager.delete(id)
        }

        return { undoCtx, metrics }
    },
    *undo(ctx) {
        const structureId = PACK_ID + ":edit_temp"
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
                const block = yield ctx.getBlock(location)
                block.setType("minecraft:air")
                metrics.blocks++
            }
        }

        let j = 0
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const start = selection.location
            const end = Vector.add(selection.location, selection.size).subtract(1)
            const volume = new BlockVolume(start, end).getBlockLocationIterator()

            for (const location of volume) {
                const block = yield ctx.getBlock(location)

                if (indexToBlock[j]) permutation = indexToBlock[j]
                if (permutation && permutation !== "undefined") {
                    metrics.blocks++
                    block.setPermutation(permutation)
                }
                j++
            }
        }

        // flip structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const selection = ctx.selections[i]
            const id = structureId + "_" + i
            const pivot = Vector.subtract(selection.size, 1)
                .divide(2)
                .add(selection.location)

            selection.location.subtract(
                Vector.subtract(pivot, flip(pivot.copy(), groupPivot, ctx.flip)),
            )

            world.structureManager.place(id, ctx.dimension, selection.location, {
                mirror: ctx.flip.toUpperCase(),
            })
        }

        // delete structures
        for (let i = 0; i < ctx.selections.length; i++) {
            const id = structureId + "_" + i
            world.structureManager.delete(id)
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            flip: ctx.flip,
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
            flip: ctx.flip,
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
