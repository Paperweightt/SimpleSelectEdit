/** @import * as Types from "./types.js" */

export const EditRegistry = new Map()

/**
 * @param {string} name
 * @param {Types.EditDefinition} params
 */
export function registerEdit(name, params) {
    EditRegistry.set(name, params)
}

/**
 * @param {Types.EditNames} name
 * @returns {Types.EditDefinition}
 */
export function getEdit(name) {
    return EditRegistry.get(name)
}
