import { BlockVolume, world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { BlockId } from "../../utils/blockId.js"

registerEdit("stretch", {
    *run(ctx) {
        const undoCtx = {
            type: "stretch",
            selections: ctx.selections,
            dimension: ctx.dimension,
            direction: ctx.direction,
            vector: ctx.vector,
            changes: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        let prevId
        let i = 0
        const addChange = (id) => {
            if (prevId === id) {
                i++
                return
            }

            if (!undoCtx.changes[id]) {
                undoCtx.changes[id] = [i]
            } else {
                undoCtx.changes[id].push(i)
            }

            prevId = id
            i++
        }

        const direction = ctx.direction
        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation).add(1)
        let oldSize
        let oldOffset

        if (direction === "Down" || direction === "West" || direction === "North") {
            oldSize = Vector.add(size, ctx.vector)
            oldOffset = Vector.subtract(range.minLocation, ctx.vector)
        } else {
            oldSize = Vector.subtract(size, ctx.vector)
            oldOffset = range.minLocation
        }

        const ratio = Vector.divide(oldSize, size)
        const permutationCache = {}
        const ratioSum = ratio.coordinateSum() - 2

        for (const selection of ctx.selections) {
            const min = Vector.subtract(selection.location, range.minLocation)
                .multiply(ratio)
                .add(oldOffset)
            const max = Vector.multiply(selection.size, ratio).add(min).subtract(1)
            const volume = new BlockVolume(min, max).getBlockLocationIterator()

            for (const { x, y, z } of volume) {
                const block = yield ctx.getBlock({ x, y, z })
                const permutation = block.permutation
                const key = `${x} ${y} ${z}`

                if (permutationCache[key]) continue

                permutationCache[key] = permutation

                if (ratioSum < 1) continue

                const id = BlockId.get(permutation)

                addChange(id)
                block.setType("air")
            }
        }

        for (const selection of ctx.selections) {
            const max = Vector.add(selection.size, selection.location).subtract(1)
            const volume = new BlockVolume(
                selection.location,
                max,
            ).getBlockLocationIterator()

            for (const location of volume) {
                const oldLocation = Vector.subtract(location, range.minLocation)
                    .multiply(ratio)
                    .add(oldOffset)
                    .floor()

                const block = yield ctx.getBlock(location)
                const { x, y, z } = oldLocation
                const permutation = permutationCache[`${x} ${y} ${z}`]

                if (ratioSum < 1) {
                    const id = BlockId.get(block.permutation)

                    addChange(id)
                }

                block.setPermutation(permutation)
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
        let i = 0

        for (const [key, values] of Object.entries(ctx.changes)) {
            let permutation = "undefined"

            if (key !== "undefined") {
                permutation = BlockId.toPermutation(key)
            }

            for (const value of values) {
                indexToBlock[value] = permutation
            }
        }

        // for (const selection of ctx.selections) {
        //     const min = selection.location
        //     const max = Vector.add(selection.size, min).subtract(1)
        //     const locations = new BlockVolume(min, max).getBlockLocationIterator()
        //
        //     for (const location of locations) {
        //         const block = yield ctx.getBlock(location)
        //
        //         block.setType("minecraft:air")
        //     }
        // }

        const direction = ctx.direction
        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation).add(1)
        let oldSize
        let oldOffset

        if (direction === "Down" || direction === "West" || direction === "North") {
            oldSize = Vector.add(size, ctx.vector)
            oldOffset = Vector.subtract(range.minLocation, ctx.vector)
        } else {
            oldSize = Vector.subtract(size, ctx.vector)
            oldOffset = range.minLocation
        }

        const ratio = Vector.divide(oldSize, size)
        const ratioSum = ratio.coordinateSum() - 2

        for (const selection of ctx.selections) {
            if (ratioSum < 1) {
                const min = selection.location
                const max = Vector.add(selection.size, min).subtract(1)
                const locations = new BlockVolume(min, max).getBlockLocationIterator()

                for (const location of locations) {
                    const block = yield ctx.getBlock(location)

                    if (indexToBlock[i]) permutation = indexToBlock[i]
                    if (permutation && permutation !== "undefined") {
                        metrics.blocks++
                        block.setPermutation(permutation)
                    }
                    i++
                }
            }

            selection.location = Vector.subtract(selection.location, range.minLocation)
                .multiply(ratio)
                .add(oldOffset)

            selection.size.multiply(ratio)

            selection.displayLocation = selection.location

            if (ratioSum > 1) {
                const min = selection.location
                const max = Vector.add(selection.size, min).subtract(1)
                const locations = new BlockVolume(min, max).getBlockLocationIterator()

                for (const location of locations) {
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

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            vector: ctx.vector,
            direction: ctx.direction,
            selections: ctx.selections,
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
            direction: ctx.direction,
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
