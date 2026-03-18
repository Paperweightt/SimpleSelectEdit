import { getEdit } from "./registry"
import { Filter } from "../utils/filter"
import { Vector } from "../utils/vector"
import { world, system } from "@minecraft/server"
import { PACK_ID, TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"

/** @import * as Types from "./types.js"  */

export class Edit {
    static registry = new Map()
    /** @type {number} */
    static blocksPlaced = 0
    /** @type {number} */
    static defaultBlock = "minecraft:smooth_stone"
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
     * @param {Types.EditNames} name
     * @param {Types.EditCtx} ctx
     * @returns {Promise<Types.RunResult>}
     */
    static async run(name, ctx) {
        const edit = new Edit(ctx.dimension)
        let result

        const editCtx = {
            ...ctx,
            getBlock: edit.getBlock.bind(edit),
            locationIsValid: edit.locationIsValid.bind(edit),
        }

        if (ctx.filter?.type && ctx.filter?.typeIds) {
            editCtx.filter = new Filter(ctx.filter.type, ctx.filter.typeIds)
        }

        try {
            result = await getEdit(name).run(editCtx)
        } finally {
            edit.removeTickingAreas()
        }

        return result
    }

    /**
     * @param {Types.EditNames} name
     * @returns {Promise<Types.EditMetrics>}
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
     * @param {Types.EditNames} name
     * @param {Types.UndoCtx} ctx
     * @returns {Types.ZippedUndoCtx}
     */
    static zipUndo(name, ctx) {
        return getEdit(name).zipUndo(ctx)
    }

    /**
     * @param {Types.EditNames} name
     * @param {Types.ZippedUndoCtx} ctx
     * @returns {Types.UndoCtx}
     */
    static unzipUndo(name, ctx) {
        return getEdit(name).unzipUndo(ctx)
    }

    /**
     * @param {Types.ZippedUndoCtx} undoData
     * @returns {Types.number}
     */
    static saveToHistory(undoData) {
        Edit.edits++
        const property = PACK_ID + ":fill_" + Edit.edits

        world.setDynamicProperty(property, JSON.stringify(undoData))

        return Edit.edits
    }

    /** @returns {string[]}*/
    static getAllHistoryIds() {
        const length = (PACK_ID + ":fill_").length

        return world
            .getDynamicPropertyIds()
            .filter((id) => id.startsWith(PACK_ID + ":fill_"))
            .map((id) => id.substring(length))
    }

    /** @returns {string[]}*/
    static getAllPlayerHistory() {
        const length = (PACK_ID + ":playerList_").length

        return world
            .getDynamicPropertyIds()
            .filter((id) => id.startsWith(PACK_ID + ":playerList_"))
            .map((id) => id.substring(length))
    }

    static deleteHistory() {
        for (const id of this.getAllHistoryIds()) {
            world.setDynamicProperty(PACK_ID + ":fill_" + id)
        }

        for (const id of this.getAllPlayerHistory()) {
            world.setDynamicProperty(PACK_ID + ":playerList_" + id)
        }

        world.setDynamicProperty(PACK_ID + ":edits_amount")
    }

    /**
     * @param {number} id
     * @returns {Types.ZippedUndoCtx}
     */
    static getFromHistory(id) {
        const property = PACK_ID + ":fill_" + id
        const string = world.getDynamicProperty(property)

        if (!string) throw new Error("no edit exists at index")

        return JSON.parse(string)
    }

    /**
     * @param {playerId} playerId
     * @param {number} i
     */
    static saveToPlayer(playerId, i) {
        const editList = this.getPlayerUndoIds(playerId)

        editList.push(i)

        this.setPlayerUndoIds(playerId, editList)
    }

    /**
     * @param {string} playerId
     * @returns {promise<Types.EditMetrics>}
     */
    static async playerUndoRecent(playerId) {
        const undoCtx = this.playerGetRecentUndo(playerId)

        const editResolve = await this.undo(undoCtx.type, undoCtx)

        return editResolve
    }

    /**
     * @param {string} playerId
     * @param {number} repeats
     * @param {number} delay - measured in ticks
     * @returns {promise<Types.EditMetrics>[]}
     */
    static async playerUndoRepeat(playerId, repeats, delay) {
        const editMetrics = []

        for (let i = 0; i < repeats; i++) {
            const editResolve = await this.playerUndoRecent(playerId)
            editMetrics.push(editResolve)

            if (delay) await system.waitTicks(delay)
        }

        return editMetrics
    }

    /**
     * @param {string} playerId
     * @returns {number[]}
     */
    static getPlayerUndoIds(playerId) {
        const property = PACK_ID + ":playerList_" + playerId

        return JSON.parse(world.getDynamicProperty(property) || "[]")
    }

    /**
     * @param {string} playerId
     * @param {number[]} ids
     */
    static setPlayerUndoIds(playerId, ids) {
        const property = PACK_ID + ":playerList_" + playerId
        world.setDynamicProperty(property, JSON.stringify(ids))
    }

    /**
     * @param {playerId} playerId
     * @returns {Types.UndoCtx}
     */
    static playerGetRecentUndo(playerId) {
        const ids = this.getPlayerUndoIds(playerId)
        const undoIndex = ids.pop()

        this.setPlayerUndoIds(playerId, ids)

        const zippedUndo = this.getFromHistory(undoIndex)

        world.setDynamicProperty(PACK_ID + ":fill_" + undoIndex)

        return this.unzipUndo(zippedUndo.type, zippedUndo)
    }

    /**
     * @param {Types.EditNames} name
     * @param {Types.EditCtx} ctx
     * @returns {Promise<{saveId:number,runResult: Types.RunResult}>}
     */
    static async runAndSave(name, ctx) {
        const runResult = await Edit.run(name, ctx)

        if (runResult.metrics.fail === true) return { runResult, saveId: -1 }

        const zippedUndo = Edit.zipUndo(name, runResult.undoCtx)
        const saveId = Edit.saveToHistory(zippedUndo)

        return { runResult, saveId }
    }

    /**
     * @param {string} playerId
     * @param {Types.EditNames} name
     * @param {Types.EditCtx} ctx
     * @returns {Promise<Types.RunResult>}
     */
    static async playerRunAndSave(playerId, name, ctx) {
        const { saveId, runResult } = await this.runAndSave(name, ctx)

        if (runResult.metrics.blocks > 1000) {
            playerId.sendMessage(runResult.metrics.blocks + " blocks filled")
        }

        Edit.saveToPlayer(playerId, saveId)

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
