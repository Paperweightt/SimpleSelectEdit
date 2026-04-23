import { BlockVolume, world } from "@minecraft/server"
import { registerEdit } from "../registry.js"
import { Selection } from "../../selection/selection.js"
import { SelectionGroup } from "../../selection/selectionGroup.js"
import { Vector } from "../../utils/vector.js"

registerEdit("create", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "create",
            selection: ctx.selection,
            dimension: ctx.dimension,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        // creation is handled outside

        return metrics
    },
    *undo(ctx) {
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        if (ctx.selection.isOwned) {
            for (const group of SelectionGroup.getAll()) {
                const index = group.getSelectionIndex(ctx.selection)
                if (index !== -1) {
                    group.removeSelection(index)

                    if (group.selections.length > 0) {
                        group.reloadEntityLocations()
                    }

                    break
                }
            }
        }

        ctx.selection.remove()

        return metrics
    },
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            snapshot: ctx.selection.snapshot(),
        }

        return undoCtx
    },
    unzipUndo(ctx) {
        const dimension = world.getDimension(ctx.dimensionId)
        const undoCtx = {
            type: ctx.type,
            selection:
                Selection.get(ctx.snapshot[0]) ||
                Selection.parseSnapshot(ctx.snapshot, dimension),
        }

        return undoCtx
    },
})

registerEdit("magicSelect", {
    *run(ctx) {
        ctx.undoCtx = {
            type: "create",
            selection: ctx.selection,
            dimension: ctx.dimension,
        }
        const metrics = {
            blocks: 0,
            ticks: 0,
        }

        let min = new Vector(ctx.selection.location)
        let max = new Vector(ctx.selection.location)
        let done = false

        const updateSelection = () => {
            const size = Vector.subtract(max, min).add(1)

            if (!ctx.selection.isValid) return

            ctx.selection.setLocation(min)
            ctx.selection.setSize(size)
            done = false
        }
        const volumes = [
            [
                new Vector(1, 0, 0),
                () => new BlockVolume(max, new Vector(min).setX(max.x)),
            ],
            [
                new Vector(0, 1, 0),
                () => new BlockVolume(max, new Vector(min).setY(max.y)),
            ],
            [
                new Vector(0, 0, 1),
                () => new BlockVolume(max, new Vector(min).setZ(max.z)),
            ],
            [
                new Vector(-1, 0, 0),
                () => new BlockVolume(min, new Vector(max).setX(min.x)),
            ],
            [
                new Vector(0, -1, 0),
                () => new BlockVolume(min, new Vector(max).setY(min.y)),
            ],
            [
                new Vector(0, 0, -1),
                () => new BlockVolume(min, new Vector(max).setZ(min.z)),
            ],
        ]

        while (!done) {
            done = true

            for (const [offset, volume] of volumes) {
                let foundBlock = true

                while (foundBlock) {
                    foundBlock = false

                    for (const location of volume().getBlockLocationIterator()) {
                        const block = yield ctx.getBlock(Vector.add(location, offset))

                        if (block.isAir) continue

                        if (offset.coordinateSum() > 0) {
                            max.add(offset)
                        } else {
                            min.add(offset)
                        }

                        foundBlock = true

                        updateSelection()
                        break
                    }
                }
            }
        }

        return metrics
    },
    *undo() {},
    zipUndo(ctx) {
        const undoCtx = {
            type: ctx.type,
            dimensionId: ctx.dimension.id,
            snapshot: ctx.selection.snapshot(),
        }

        return undoCtx
    },
    unzipUndo() {},
})
