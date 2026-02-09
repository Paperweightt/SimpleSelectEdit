/**
 * @typedef {"smooth"|"fill"|"extrude"|"structure"} EditNames
 */

/**
 * @typedef {Object} EditMetrics
 * @property {number} ticks
 * @property {number} blocks
 */

/**
 * @typedef {Object} UndoCtx
 * @property {EditNames} type
 * @property {import("@minecraft/server").Dimension} dimension
 * @property {Vector} location
 * @property {any} [key: string] Extra arbitrary fields
 */

/**
 * @typedef {Object} ZippedUndoCtx
 * @property {string} dimensionId
 * @property {Vector} location
 * @property {any} [key: string] Extra arbitrary fields
 */

/**
 * @typedef {Object} EditCtx
 * @property {function(Vector):Promise<import("@minecraft/server").Block>} getBlock
 * @property {function(Vector):boolean} locationIsValid
 * @property {import("@minecraft/server").Dimension} dimension
 * @property {Filter} filter
 * @property {Vector} location
 * @property {any} [key: string] Extra arbitrary fields
 */

/**
 * @typedef {Object} RunResult
 * @property {UndoCtx} undoCtx
 * @property {EditMetrics} metrics
 */

/**
 * @typedef {Object} EditDefinition
 * @property {function(EditCtx):Promise<EditMetrics>} undo
 * @property {function(EditCtx):Promise<RunResult>} run
 * @property {function(UndoCtx):Object} zip
 * @property {function(Object):UndoCtx} unzip
 */
