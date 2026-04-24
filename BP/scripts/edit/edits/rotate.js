import { BlockVolume, world } from "@minecraft/server"
import { Vector } from "../../utils/vector.js"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { rotateY } from "../../utils/blockUtils.js"
import { BlockId } from "../../utils/blockId.js"

registerEdit("rotate", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "rotate",
            selections: ctx.selections,
            dimension: ctx.dimension,
            rotation: ctx.rotation,
            changes: {},
            startEnds: [],
            lossedData: {},
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }
        const range = SelectionGroup.getMinMax(ctx.selections)
        const size = Vector.subtract(range.maxLocation, range.minLocation).add(1)
        const pivot = Vector.subtract(size, 1).divide(2).add(range.minLocation)
        const blockRotationY = Math.round(((ctx.rotation.p / Math.PI) * 180) / 90) * 90
        const dontClearLocations = []
        const newMinMaxs = []

        ctx.undoCtx.pivot = pivot

        let prevId
        let i = 0
        const addChange = (id, i) => {
            if (prevId === id) return

            if (!ctx.undoCtx.changes[id]) {
                ctx.undoCtx.changes[id] = [i]
            } else {
                ctx.undoCtx.changes[id].push(i)
            }

            prevId = id
        }

        function getRotationIterator(selection, rotation, pivot) {
            let min = new Vector(Infinity)
            let max = new Vector(-Infinity)

            for (let corner of selection.getCorners()) {
                corner = Vector.rotate(corner, rotation, pivot)

                min = Vector.min(corner, min)
                max = Vector.max(corner, max)
            }

            min = Vector.min(selection.location, min)
            max = Vector.max(
                Vector.add(selection.location, selection.size).subtract(1),
                max,
            )

            min.round()
            max.round()

            return new BlockVolume(min, max).getBlockLocationIterator()
        }

        const locationIsBetweenStartEnds = (location) => {
            for (const { start, end } of ctx.undoCtx.startEnds) {
                if (Vector.isBetweenInclusive(location, start, end)) return true
            }
            return false
        }

        const inverseRotation = {
            y: -ctx.rotation.y,
            p: -ctx.rotation.p,
            r: -ctx.rotation.r,
        }

        /** @typedef {Record.<string,import("@minecraft/server").BlockPermutation>} */
        const blocks = {}

        for (const selection of ctx.selections) {
            for (const location of selection.getIterator()) {
                const block = yield ctx.getBlock(location)
                blocks[location.getString()] = rotateY(block.permutation, blockRotationY)
            }
            ctx.undoCtx.startEnds.push(selection.getStartEnd())
        }

        for (const selection of ctx.selections) {
            let min = new Vector(Infinity)
            let max = new Vector(-Infinity)

            console.log(JSON.stringify([min, max]))
            console.log(JSON.stringify([Infinity, max]))

            for (const location of getRotationIterator(selection, ctx.rotation, pivot)) {
                const block = yield ctx.getBlock(location)
                const sourceLocation = Vector.rotate(
                    location,
                    inverseRotation,
                    pivot,
                ).round()

                const sourcePermutation = blocks[sourceLocation.getString()]

                if (sourcePermutation || locationIsBetweenStartEnds(location)) {
                    addChange(BlockId.get(block.permutation), i++)
                }

                if (sourcePermutation) {
                    dontClearLocations.push(location)
                    block.setPermutation(sourcePermutation)

                    if (sourcePermutation.type.id !== "minecraft:air") {
                        min = Vector.min(location, min)
                        max = Vector.max(location, max)
                    }
                }
            }

            newMinMaxs.push([min, max])
        }

        for (let i = 0; i < ctx.selections.length; i++) {
            const [min, max] = newMinMaxs[i]
            const size = Vector.subtract(max, min).add(1)
            const selection = ctx.selections[i]

            console.log("hi")

            selection.setLocation(new Vector(min))
            selection.setSize(size)
        }

        for (const location of dontClearLocations) {
            const { x, y, z } = location
            delete blocks[`${x} ${y} ${z}`]
        }

        for (const locationString of Object.keys(blocks)) {
            const [x, y, z] = locationString.split(" ").map((v) => +v)
            const block = yield ctx.getBlock({ x, y, z })

            block.setType("minecraft:air")
        }

        return metrics
    },
    *undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        const locationIsBetweenStartEnds = (location) => {
            for (const { start, end } of ctx.startEnds) {
                if (Vector.isBetweenInclusive(location, start, end)) return true
            }
            return false
        }

        function getRotationIterator(selection, rotation, pivot) {
            let min = new Vector(Infinity)
            let max = new Vector(-Infinity)

            for (let corner of selection.getCorners()) {
                corner = Vector.rotate(corner, rotation, pivot)

                min = Vector.min(corner, min)
                max = Vector.max(corner, max)
            }

            min = Vector.min(selection.location, min)
            max = Vector.max(
                Vector.add(selection.location, selection.size).subtract(1),
                max,
            )

            min.round()
            max.round()

            return new BlockVolume(min, max).getBlockLocationIterator()
        }

        const inverseRotation = {
            y: -ctx.rotation.y,
            p: -ctx.rotation.p,
            r: -ctx.rotation.r,
        }

        const indexToBlock = {}
        let i = 0
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
            for (const location of getRotationIterator(
                selection,
                inverseRotation,
                ctx.pivot,
            )) {
                const block = yield ctx.getBlock(location)
                const sourceLocation = Vector.rotate(
                    location,
                    inverseRotation,
                    ctx.pivot,
                ).round()

                if (
                    locationIsBetweenStartEnds(sourceLocation) ||
                    locationIsBetweenStartEnds(location)
                ) {
                    if (indexToBlock[i]) permutation = indexToBlock[i]

                    if (permutation && permutation !== "undefined") {
                        block.setPermutation(permutation)
                        metrics.blocks++
                        i++
                    }
                }
            }
        }

        for (let i = 0; i < ctx.selections.length; i++) {
            const { start, end } = ctx.startEnds[i]
            const size = Vector.subtract(end, start).add(1)
            const selection = ctx.selections[i]

            selection.setLocation(new Vector(start))
            selection.setSize(size)
        }

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            rotation: ctx.rotation,
            changes: ctx.changes,
            pivot: ctx.pivot,
            startEnds: ctx.startEnds,
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
            pivot: ctx.pivot,
            changes: ctx.changes,
            startEnds: ctx.startEnds,
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
