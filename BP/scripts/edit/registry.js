export const EditRegistry = new Map()

/**
 * @param {string} name
 * @param {EditDefinition} params
 */
export function registerEdit(name, params) {
    EditRegistry.set(name, params)
}

/**
 * @param {EditNames} name
 * @returns {EditDefinition}
 */
export function getEdit(name) {
    return EditRegistry.get(name)
}
