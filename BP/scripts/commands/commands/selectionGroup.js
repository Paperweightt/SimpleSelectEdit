import { CustomCommandParamType, CommandPermissionLevel } from "@minecraft/server"
import { Blueprint } from "../../items/blueprint/blueprint.js"
import { Selection } from "../../selection/selection.js"
import { Edit } from "../../edit/index.js"
import { SelectionGroup } from "../../selection/selectionGroup"
import { Commands } from "../commands.js"
import { Vector } from "../../utils/vector.js"

Commands.register({
    name: "rotate",
    description: "rotate",
    mandatoryParameters: [{ name: "degrees", type: CustomCommandParamType.Integer }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, rotation) => {
        const { sourceEntity } = data
        const selectionGroup = SelectionGroup.get(sourceEntity.id)

        if (rotation % 90)
            return { status: 1, message: "rotation must be 0, 90, 180, or 270" }

        const result = await Edit.playerRunAndSave(sourceEntity.id, "rotate", {
            dimension: sourceEntity.dimension,
            selections: selectionGroup.selections,
            rotation: rotation,
        })

        for (const selection of selectionGroup.selections) {
            selection.rotation = { y: 0, p: 0, r: 0 }
            selection.displayLocation = selection.location
        }

        selectionGroup.snapToGrid()
        selectionGroup.reloadEntityLocations()
        selectionGroup.updateEntityValues()

        Edit.log(sourceEntity, result.metrics)

        return { status: 0 }
    },
})

Commands.register({
    name: "move",
    description: "move",
    mandatoryParameters: [{ name: "direction", type: CustomCommandParamType.Location }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, diff) => {
        const { sourceEntity } = data
        const selectionGroup = SelectionGroup.get(sourceEntity.id)

        diff = Vector.add(diff, new Vector(-0.5, 0, -0.5))

        for (const selection of selectionGroup.selections) {
            selection.location.add(diff)
            selection.displayLocation = selection.location
        }

        const result = await Edit.playerRunAndSave(sourceEntity.id, "move", {
            dimension: sourceEntity.dimension,
            vector: diff,
            selections: selectionGroup.selections,
        })

        selectionGroup.snapToGrid()
        selectionGroup.reloadEntityLocations()
        selectionGroup.updateEntityValues()

        Edit.log(sourceEntity, result.metrics)

        return { status: 0 }
    },
})

Commands.register({
    name: "select",
    description: "select",
    mandatoryParameters: [
        { name: "from", type: CustomCommandParamType.Location },
        { name: "to", type: CustomCommandParamType.Location },
    ],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, from, to) => {
        const { sourceEntity } = data
        const selectionGroup =
            SelectionGroup.get(sourceEntity.id) ||
            new SelectionGroup(sourceEntity, sourceEntity.dimension)

        from = Vector.add(from, new Vector(-0.5, 0, -0.5))
        to = Vector.add(to, new Vector(-0.5, 0, -0.5))

        const min = Vector.min(from, to)
        const max = Vector.max(from, to).add(1)
        const size = Vector.subtract(max, min)
        const selection = new Selection(min, size, sourceEntity.dimension)

        Edit.playerRunAndSave(sourceEntity.id, "create", {
            selection: selection,
            dimension: sourceEntity.dimension,
        })

        selectionGroup.toggleSelection(selection)

        return { status: 0 }
    },
})

Commands.register({
    name: "flip",
    description: "flip",
    mandatoryParameters: [{ name: "axis", type: CustomCommandParamType.String }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, axis) => {
        const { sourceEntity } = data
        const group = SelectionGroup.get(sourceEntity.id)

        if (!["xz", "x", "z", "zx"].some((value) => value === axis)) return { status: 0 }

        if (axis === "zx") axis = "xz"

        const result = await Edit.playerRunAndSave(sourceEntity.id, "flip", {
            selections: group.selections,
            dimension: sourceEntity.dimension,
            flip: axis,
        })

        Edit.log(sourceEntity, result.metrics)

        return { status: 0 }
    },
})

Commands.register({
    name: "save_as",
    description: "save_as",
    mandatoryParameters: [{ name: "degrees", type: CustomCommandParamType.String }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, name) => {
        const { sourceEntity } = data
        const group = SelectionGroup.get(sourceEntity.id)

        if (!group) return { status: 1 }

        const container = sourceEntity.getComponent("inventory").container
        let hasSpace = false

        for (let i = 0; i < container.size; i++) {
            const itemStack = container.getItem(i)

            if (!itemStack) {
                hasSpace = true
                break
            }
        }

        if (!hasSpace) {
            sourceEntity.sendMessage("No space for blueprint in inventory")
            return { status: 1 }
        }

        const itemStack = new Blueprint(group, name)

        container.addItem(itemStack)

        return { status: 0 }
    },
})

Commands.register({
    name: "copy",
    description: "copy",
    mandatoryParameters: [{ name: "direction", type: CustomCommandParamType.Location }],
    optionalParameters: [{ name: "repeats", type: CustomCommandParamType.Integer }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, direction, repeats = 1) => {
        const { sourceEntity } = data
        const selectionGroup = SelectionGroup.get(sourceEntity.id)
        let blocks = 0

        direction = Vector.add(direction, new Vector(-0.5, 0, -0.5))

        for (let i = 0; i < repeats; i++) {
            for (const selection of selectionGroup.selections) {
                selection.location.add(direction)
                selection.displayLocation = selection.location
            }

            const result = await Edit.playerRunAndSave(sourceEntity.id, "duplicate", {
                dimension: sourceEntity.dimension,
                vector: direction,
                selections: selectionGroup.selections,
            })
            blocks += result.metrics.blocks
        }

        selectionGroup.snapToGrid()
        selectionGroup.reloadEntityLocations()
        selectionGroup.updateEntityValues()

        Edit.log(sourceEntity, result.metrics)
        return { status: 0 }
    },
})

Commands.register({
    name: "set",
    description: "set",
    mandatoryParameters: [{ name: "tileName", type: CustomCommandParamType.BlockType }],
    permissionLevel: CommandPermissionLevel.GameDirectors,
    callback: async (data, blockType) => {
        const { sourceEntity } = data
        const group = SelectionGroup.get(sourceEntity.id)

        if (!group) return

        const fillObject = {
            [blockType.id]: 1,
        }

        const result = await Edit.playerRunAndSave(sourceEntity.id, "fill", {
            blocks: fillObject,
            selections: group.selections,
            dimension: sourceEntity.dimension,
        })

        Edit.log(sourceEntity, result.metrics)
    },
})
