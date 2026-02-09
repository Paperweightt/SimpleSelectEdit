import { getEdit } from "./registry"
import { Filter } from "../util/filter"
import { Vector } from "../util/vector"
import { world, system } from "@minecraft/server"
import { PACK_ID, TYPE_IDS } from "../constants"
import { DeathOnReload } from "../util/deathOnReload"

export class Edit {
    static registry = new Map()
    /** @type {number} */
    static blocksPlaced = 0
    /** @type {number} */
    static defaultBlock = "smooth_stone"
    /** @type {number} */
    static blocksPerTick = 500
    /** @type {number} */
    static seed = 123467

    static get edits() {
        return world.getDynamicProperty(PACK_ID + ":edits_amount") || 0
    }

    static set edits(i) {
        world.setDynamicProperty(PACK_ID + ":edits_amount", i)
    }

    /**
     * @param {EditNames} name
     * @param {EditCtx} ctx
     * @returns {Promise<RunResult>}
     */
    static async run(name, ctx) {
        const edit = new Edit(ctx.dimension)
        let result

        const editCtx = {
            ...ctx,
            getBlock: edit.getBlock.bind(edit),
            locationIsValid: edit.locationIsValid.bind(edit),
            filter: new Filter(ctx.filter.type, ctx.filter.typeIds),
        }

        try {
            result = await getEdit(name).run(editCtx)
        } finally {
            edit.removeTickingAreas()
        }

        return result
    }

    /**
     * @param {EditNames} name
     * @returns {Promise<EditMetrics>}
     */
    static async undo(name, ctx) {
        const edit = new Edit(ctx.dimension)
        let result

        const editCtx = {
            ...ctx,
            locationIsValid: edit.locationIsValid.bind(edit),
            getBlock: edit.getBlock.bind(edit),
        }

        try {
            result = await getEdit(name).undo(editCtx)
        } finally {
            edit.removeTickingAreas()
        }

        return result
    }

    /**
     * @param {EditNames} name
     * @param {UndoCtx} ctx
     * @returns {ZippedUndoCtx}
     */
    static zipUndo(name, ctx) {
        return getEdit(name).zipUndo(ctx)
    }

    /**
     * @param {EditNames} name
     * @param {ZippedUndoCtx} ctx
     * @returns {UndoCtx}
     */
    static unzipUndo(name, ctx) {
        return getEdit(name).unzipUndo(ctx)
    }

    /**
     * @param {ZippedUndoCtx} undoData
     * @returns {number}
     */
    static saveToHistory(undoData) {
        Edit.edits++
        const property = PACK_ID + ":fill" + Edit.edits

        world.setDynamicProperty(property, JSON.stringify(undoData))

        return Edit.edits
    }

    /**
     * @param {number} i
     * @returns {ZippedUndoCtx}
     */
    static getFromHistory(i) {
        const property = PACK_ID + ":fill" + i
        const string = world.getDynamicProperty(property)

        if (!string) throw new Error("no edit exists at index")

        return JSON.parse(string)
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {number} i
     */
    static saveToPlayer(player, i) {
        const property = PACK_ID + ":edit_list"
        const editList = JSON.parse(player.getDynamicProperty(property) || "[]")

        editList.push(i)
        player.setDynamicProperty(property, JSON.stringify(editList))
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {promise<EditMetrics>}
     */
    static async playerUndoRecent(player) {
        const undoCtx = this.playerGetRecentUndo(player)

        const editResolve = await this.undo(undoCtx.type, undoCtx)

        return editResolve
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {UndoCtx}
     */
    static playerGetRecentUndo(player) {
        const property = PACK_ID + ":edit_list"
        const fills = JSON.parse(player.getDynamicProperty(property) || "[]")

        const undoIndex = fills.pop()

        player.setDynamicProperty(property, JSON.stringify(fills))

        const zippedUndo = this.getFromHistory(undoIndex)

        const undoCtx = this.unzipUndo(zippedUndo.type, zippedUndo)

        return undoCtx
    }

    /**
     * @param {EditNames} name
     * @param {EditCtx} ctx
     * @returns {Promise<{saveId:number,runResult: RunResult}>}
     */
    static async runAndSave(name, ctx) {
        const runResult = await Edit.run(name, ctx)

        if (runResult.metrics.fail === true) return { runResult, saveId: -1 }

        const zippedUndo = Edit.zipUndo(name, runResult.undoCtx)
        const saveId = Edit.saveToHistory(zippedUndo)

        return { runResult, saveId }
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {EditNames} name
     * @param {EditCtx} ctx
     * @returns {Promise<RunResult>}
     */
    static async playerRunAndSave(player, name, ctx) {
        const { saveId, runResult } = await this.runAndSave(name, ctx)

        if (metrics.blocks > 1000) {
            player.sendMessage(metrics.blocks + " blocks changed in " + metrics.ticks + " ticks")
        }

        Edit.saveToPlayer(player, saveId)

        return runResult
    }

    /**
     * @type {import("@minecraft/server").Entity[]}
     */
    tickingEntities = []

    /**
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(dimension) {
        this.dimension = dimension
    }

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @returns {Promise<import("@minecraft/server").Block>}
     */
    async getBlock(location) {
        location = Vector.floor(location) // must be floored manually
        const block = this.dimension.getBlock(location)

        if (block) return block

        await this.addTickingArea(location, this.dimension)

        return this.dimension.getBlock(location)
    }

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @returns {Promise<undefined>}
     */
    async addTickingArea(location) {
        if (Edit._tickingAreaLock) {
            await Edit._tickingAreaLock
        }

        let releaseLock
        Edit._tickingAreaLock = new Promise((r) => (releaseLock = r))

        const id = PACK_ID + "setblockarea"
        const { x, y, z } = location

        this.dimension.runCommand(`tickingarea add circle ${x} ${y} ${z} 1 ${id}`)
        await system.waitTicks(2)

        const entity = this.dimension.spawnEntity(TYPE_IDS.TICKING_ENTITY, location)
        DeathOnReload.addEntity(entity)

        this.tickingEntities.push(entity)

        this.dimension.runCommand(`tickingarea remove ${id}`)

        system.runTimeout(() => {
            releaseLock()
            this._tickingAreaLock = null
        }, 2)
    }

    removeTickingAreas() {
        for (const entity of this.tickingEntities) {
            entity.remove()
        }
    }

    /**
     * @param {Vector} location
     * @returns {boolean}
     */
    locationIsValid(location) {
        if (location.y < this.dimension.heightRange.min) return false
        if (location.y > this.dimension.heightRange.max) return false

        return true
    }
}
