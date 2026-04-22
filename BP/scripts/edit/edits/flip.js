import { world, BlockVolume } from "@minecraft/server"
import { Transform } from "../../utils/blockUtils.js"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
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

    if (flip.includes("x")) newLocation.x *= -1
    if (flip.includes("y")) newLocation.y *= -1
    if (flip.includes("z")) newLocation.z *= -1

    return newLocation.add(pivot)
}

registerEdit("flip", {
    *run(ctx) {
        ctx.undoCtx = {
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
        const pivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)
        const finishedSelections = []

        let i = 0
        let prevId
        const addChange = (id, i) => {
            if (prevId === id) return

            if (!ctx.undoCtx.changes[id]) {
                ctx.undoCtx.changes[id] = [i]
            } else {
                ctx.undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        function locationIsBetweenSelections(location) {
            for (const selection of ctx.selections) {
                const { start, end } = selection.getStartEnd()
                if (Vector.isBetweenInclusive(location, start, end)) return true
            }
            return false
        }

        function getFlipIterator(selection, pivot) {
            let { start, end } = selection.getStartEnd()
            const center = selection.getPivot()

            if (center[ctx.flip] > pivot[ctx.flip]) {
                ;[start, end] = [flip(end, pivot, ctx.flip), flip(start, pivot, ctx.flip)]
            }

            if (end[ctx.flip] > pivot[ctx.flip]) {
                end[ctx.flip] = pivot[ctx.flip]
            }

            return new BlockVolume(start, end).getBlockLocationIterator()
        }

        for (const selection of ctx.selections) {
            const { start, end } = selection.getStartEnd()
            let iterator = getFlipIterator(selection, pivot)

            setblock: for (const location of iterator) {
                const mirrorLocation = flip(location, pivot, ctx.flip)

                for (const [start, end] of finishedSelections) {
                    if (
                        Vector.isBetweenInclusive(location, start, end) ||
                        Vector.isBetweenInclusive(mirrorLocation, start, end)
                    )
                        continue setblock
                }

                const startBlock = yield ctx.getBlock(location)
                const mirrorBlock = yield ctx.getBlock(mirrorLocation)
                const mirrorPermutation = mirrorBlock.permutation
                const startPermutation = startBlock.permutation

                metrics.blocks += 2
                // ctx.undoCtx.blocks++

                if (locationIsBetweenSelections(mirrorBlock)) {
                    startBlock.setPermutation(Transform.flip(mirrorPermutation, ctx.flip))
                } else {
                    addChange(BlockId.get(mirrorPermutation), i++)
                    startBlock.setType("minecraft:air")
                }

                if (locationIsBetweenSelections(location)) {
                    mirrorBlock.setPermutation(Transform.flip(startPermutation, ctx.flip))
                } else {
                    addChange(BlockId.get(startPermutation), i++)
                    mirrorBlock.setType("minecraft:air")
                }
            }

            selection.location.subtract(
                selection
                    .getPivot()
                    .subtract(flip(selection.getPivot(), pivot, ctx.flip)),
            )
            selection.displayLocation = selection.location

            finishedSelections.push([start, end])
        }

        return metrics
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

        function locationIsBetweenSelections(location) {
            for (const selection of ctx.selections) {
                const { start, end } = selection.getStartEnd()
                if (Vector.isBetweenInclusive(location, start, end)) return true
            }
            return false
        }

        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation).add(1)
        const pivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)
        const finishedSelections = []

        function getFlipIterator(selection, pivot) {
            let { start, end } = selection.getStartEnd()
            const center = selection.getPivot()

            for (const axis of ctx.flip) {
                if (center[axis] > pivot[axis]) {
                    ;[start, end] = [
                        flip(end, pivot, ctx.flip),
                        flip(start, pivot, ctx.flip),
                    ]
                }

                if (end[axis] > pivot[axis]) {
                    end[axis] = pivot[axis]
                }
            }

            return new BlockVolume(start, end).getBlockLocationIterator()
        }

        for (const selection of ctx.selections) {
            const { start, end } = selection.getStartEnd()
            let iterator = getFlipIterator(selection, pivot)

            setblock: for (const location of iterator) {
                const mirrorLocation = flip(location, pivot, ctx.flip)

                for (const [start, end] of finishedSelections) {
                    if (
                        Vector.isBetweenInclusive(location, start, end) ||
                        Vector.isBetweenInclusive(mirrorLocation, start, end)
                    )
                        continue setblock
                }

                const startBlock = yield ctx.getBlock(location)
                const mirrorBlock = yield ctx.getBlock(mirrorLocation)

                const mirrorPermutation = mirrorBlock.permutation
                const startPermutation = startBlock.permutation

                metrics.blocks += 2
                // if (!ctx.blocks--) return metrics

                if (locationIsBetweenSelections(mirrorBlock)) {
                    startBlock.setPermutation(Transform.flip(mirrorPermutation, ctx.flip))
                } else {
                    if (indexToBlock[i]) permutation = indexToBlock[i]
                    i++

                    startBlock.setPermutation(permutation)
                }

                if (locationIsBetweenSelections(location)) {
                    mirrorBlock.setPermutation(Transform.flip(startPermutation, ctx.flip))
                } else {
                    if (indexToBlock[i]) permutation = indexToBlock[i]
                    i++

                    mirrorBlock.setPermutation(permutation)
                }
            }

            selection.location.subtract(
                selection
                    .getPivot()
                    .subtract(flip(selection.getPivot(), pivot, ctx.flip)),
            )
            selection.displayLocation = selection.location

            finishedSelections.push([start, end])
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            flip: ctx.flip,
            changes: ctx.changes,
            blocks: ctx.blocks,
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
            blocks: ctx.blocks,
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
