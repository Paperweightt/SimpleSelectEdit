/**
 * @typedef {Object} OnMoveData
 * @property {import("@minecraft/server").Player} editor
 * @property {import("../utils/vector.js").Vector} prevLocation
 * @property {import("../utils/vector.js").Vector} newLocation
 */

/**
 * @typedef {Object} GizmoOnMoveData
 * @property {import("@minecraft/server").Player} editor
 * @property {import("@minecraft/server").Vector2} prevRotation
 * @property {import("@minecraft/server").Vector2} newRotation
 */

/**
 * @typedef {Object} OnSelectData
 * @property {import("@minecraft/server").Player} editor
 * @property {import("../utils/vector.js").Vector} location
 * @property {import("../utils/vector.js").Vector} prevLocation
 */

/**
 * @typedef {Object} OnReleaseData
 * @property {import("@minecraft/server").Player} editor
 * @property {import("../utils/vector.js").Vector} location
 */

export {}
