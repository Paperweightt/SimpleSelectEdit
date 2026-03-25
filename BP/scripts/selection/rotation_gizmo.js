import { system } from "@minecraft/server"
import { TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"
import { Vector } from "../utils/vector"
import { Event } from "../utils/events"
import { PlayerUtils } from "../utils/player"
import { SelectItem } from "../items/selector/selectItem"

/** @import * as Types from "./types.js" */

// TODO: remove original location for original rotation

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { viewDirection, viewStart } = data

        const gizmoRay = Gizmo.getInteractable(viewStart, viewDirection)

        if (!gizmoRay) {
            return Infinity
        }

        return gizmoRay.distance
    },
    callback: (data) => {
        const { viewDirection, viewStart, player } = data
        const gizmo = Gizmo.getInteractable(viewStart, viewDirection).gizmo

        gizmo.setEditor(player)
    },
})

SelectItem.events.releaseUse.subscribe((data) => {
    const { player } = data

    Gizmo.removeEditor(player)
})

export class Gizmo {
    /**
     * @type {Record<number,Gizmo>}
     */
    static list = {}

    /**
     * @param {number} id
     * @returns {Gizmo|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {Gizmo[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {Gizmo} gizmo
     */
    static remove(gizmo) {
        delete this.list[gizmo.id]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {boolean}
     */
    static removeEditor(player) {
        for (const gizmo of this.getAll()) {
            if (gizmo.editor?.id === player.id) {
                gizmo.removeEditor()
                return true
            }
        }
        return false
    }

    /**
     * @param {Vector} viewStart
     * @param {Vector} viewDirection
     * @returns {{distance:number,arrow:Gizmo}|undefined}
     */
    static getInteractable(viewStart, viewDirection) {
        let output

        for (const gizmo of this.getAll()) {
            const rayResult = gizmo.rayIntersects(viewStart, viewDirection)

            if (!rayResult) continue

            if (!output || rayResult.distance < output.distance) {
                output = rayResult
            }
        }

        return output
    }

    static innit() {
        system.runInterval(() => {
            for (const gizmo of this.getAll()) {
                if (!gizmo.editor || !gizmo.editor.isValid) continue

                gizmo.rotate()
            }
        })
    }

    events = {
        /** @type {Event<Types.GizmoOnMoveData>}*/
        onRotate: new Event(),
        /** @type {Event<Types.OnReleaseData>}*/
        onRelease: new Event(),
        /** @type {Event<Types.OnSelectData>}*/
        onSelect: new Event(),
    }

    /** @type {number} */
    distance

    /** @type {import("@minecraft/server").Player} */
    editor
    radius = 1.2

    innerRadius = 0.85
    outerRadius = 1.3

    size = new Vector(this.radius * 2, 0.2, this.radius * 2)

    rotation = { x: 0, y: 0 }

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").Vector2} rotation
     */
    constructor(location, dimension, axis) {
        const miny = dimension.heightRange.min

        if (location.y < miny) {
            const offset = location.copy().setY(miny + 1)
            this.entity = dimension.spawnEntity(TYPE_IDS.GIZMO, offset)
            this.entity.teleport(location)
        } else {
            this.entity = dimension.spawnEntity(TYPE_IDS.GIZMO, location)
        }

        this.location = location
        this.dimension = dimension
        this.id = this.entity.id
        this.axis = axis

        this.setRotation(axis)

        DeathOnReload.addEntity(this.entity)

        Gizmo.list[this.id] = this
    }

    // TODO: setup x and z axis x coord
    setRotation(axis) {
        switch (axis) {
            case "x":
                this.rotation = { x: 0, y: 90 }
                return
            case "y":
                this.rotation = { x: 0, y: 0 }
                return
            case "z":
                this.rotation = { x: 0, y: 90 }
                return
        }
    }

    /**
     * @param {Vector} location
     * @param {Vector} direction
     * @returns {{distance:number,gizmo:Gizmo}|undefined}
     */
    rayIntersects(location, direction) {
        const playerDistance = Vector.distance(location, this.location)
        const radius = this.getVisibleRadiusMinMax(playerDistance)

        const inverseRotation = {
            y: (-this.rotation.y * Math.PI) / 180,
            p: (-this.rotation.x * Math.PI) / 180,
            r: 0,
        }
        const relPlayerLocation = Vector.subtract(location, this.location)
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(direction, inverseRotation)

        const dir = nViewDirection.normalize()
        const t = -nPlayerLocation.y / dir.y

        const hitX = nPlayerLocation.x + t * dir.x
        const hitZ = nPlayerLocation.z + t * dir.z

        let pointerLocation

        // TODO: set this to return atan something
        // prettier-ignore
        switch (this.axis) {
            // case "x": pointerLocation = new Vector(0, hitY, hitZ); break
            case "y": pointerLocation = new Vector(hitX, 0, hitZ); break
            // case "z": pointerLocation = new Vector(hitZ, hitY, 0); break
        }

        const distance = Vector.distance(pointerLocation, new Vector(0))

        if (distance < radius.min || distance > radius.max) return

        return {
            distance: Vector.distance(
                Vector.add(pointerLocation, this.location),
                location,
            ),
            gizmo: this,
        }
    }

    /** @returns {min:number,max:number} */
    getVisibleRadiusMinMax(distance) {
        const scale = distance / 15.5 + 1

        return {
            min: this.innerRadius * scale,
            max: this.outerRadius * scale,
        }
    }

    rotate() {
        const rotation = this.getPointerRotation()

        const data = {
            prevRotation: this.startRotation,
            newRotation: rotation,
            editor: this.editor,
        }

        this.entity.setRotation(rotation)

        this.events.onRotate.emit(data)
    }

    /**
     * @param {Vector}
     */
    teleport(location) {
        this.entity.teleport(location)
        this.location = location
    }

    /** @returns {{x:number,y:number}} */
    getPointerRotation() {
        const inverseRotation = {
            y: (-this.rotation.y * Math.PI) / 180,
            p: (-this.rotation.x * Math.PI) / 180,
            r: 0,
        }
        const relPlayerLocation = Vector.subtract(
            PlayerUtils.getEyeLocation(this.editor),
            this.location,
        )
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(
            this.editor.getViewDirection(),
            inverseRotation,
        )

        const dir = nViewDirection.normalize()
        const t = -nPlayerLocation.y / dir.y

        const hitX = nPlayerLocation.x + t * dir.x
        const hitZ = nPlayerLocation.z + t * dir.z

        switch (this.axis) {
            // case "x": pointerLocation = new Vector(0, hitY, hitZ); break
            case "y":
                return { y: (Math.atan2(hitZ, hitX) * 180) / Math.PI, x: 0 }
            // case "z": pointerLocation = new Vector(hitZ, hitY, 0); break
        }
    }

    /** @param {import("@minecraft/server").Player} */
    setEditor(player) {
        this.editor = player
        this.distance = Vector.distance(this.location, PlayerUtils.getEyeLocation(player))

        const rotation = this.getPointerRotation()

        this.events.onSelect.emit({
            rotation: rotation,
            editor: player,
        })

        this.startRotation = rotation
    }

    removeEditor() {
        const rotation = this.getPointerRotation()

        this.events.onRelease.emit({
            newRotation: rotation,
            prevRotation: this.startRotation,
            editor: this.editor,
        })

        delete this.distance
        delete this.editor
    }

    remove() {
        if (this.entity.isValid) this.entity.remove()
        Gizmo.remove(this)
    }
}

Gizmo.innit()
