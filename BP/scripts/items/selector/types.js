/** @import * as Server from "@minecraft/server" */

/**
 * @typedef {Object} SelectorStartUseData
 * @property {Server.Player} player
 * @property {Server.Vector3} initialViewDirection
 * @property {Server.Vector3} viewStart
 * @property {Server.ItemStack} itemStack
 * @property {Server.BlockRaycastHit} blockRaycast
 */

/**
 * @typedef {Object} SelectorReleaseData
 * @property {Server.Player} player
 */

/**
 * @typedef {Object} SelectorClickData
 * @property {Server.Player} player
 * @property {Server.ItemStack} itemStack
 * @property {Server.BlockRaycastHit} blockRaycast
 * @property {Server.EntityRaycastHit} entityRaycast
 */

/**
 * @typedef {Object} SelectorPunchData
 * @property {Server.Player} player
 * @property {Server.ItemStack} itemStack
 */

export {}
