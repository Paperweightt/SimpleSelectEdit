/**
 * @typedef {Object} SelectorStartUseData
 * @property {import("@minecraft/server").Player} player
 * @property {import("@minecraft/server").Vector3} initialViewDirection
 * @property {import("@minecraft/server").Vector3} viewStart
 * @property {import("@minecraft/server").ItemStack} itemStack
 * @property {import("@minecraft/server").BlockRaycastHit} blockRaycast
 */

/**
 * @typedef {Object} SelectorReleaseData
 * @property {import("@minecraft/server").Player} player
 */

/**
 * @typedef {Object} SelectorClickData
 * @property {import("@minecraft/server").Player} player
 * @property {import("@minecraft/server").ItemStack} itemStack
 * @property {import("@minecraft/server").BlockRaycastHit} blockRaycast
 * @property {import("@minecraft/server").EntityRaycastHit} entityRaycast
 */
