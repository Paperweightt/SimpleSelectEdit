import { system } from "@minecraft/server"
import { PROPERTIES, TYPE_IDS } from "../constants"
import { DeathOnReload } from "../utils/deathOnReload"
import { Vector } from "../utils/vector"
import { Event } from "../utils/events"
import { SelectItem } from "../items/selector/selectItem"
import { PlayerUtils } from "../utils/player"

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        const { viewDirection, viewStart } = data
        const arrowRay = Arrow.getInteractableArrow(viewStart, viewDirection)

        if (!arrowRay) {
            return Infinity
        }

        return arrowRay.distance
    },
    callback: (data) => {
        const { viewDirection, viewStart, player } = data
        const arrow = Arrow.getInteractableArrow(viewStart, viewDirection).arrow

        arrow.setEditor(player)
    },
})

SelectItem.events.releaseUse.subscribe((data) => {
    const { player } = data

    Arrow.removeEditor(player)
})

export class Arrow {
    /**
     * @type {Object<number,Arrow>}
     */
    static list = {}

    /**
     * @param {number} id
     * @returns {Arrow|undefined}
     */
    static get(id) {
        return this.list[id]
    }

    /**
     * @returns {Arrow[]}
     */
    static getAll() {
        return Object.values(this.list)
    }

    /**
     * @param {Arrow} arrow
     */
    static remove(arrow) {
        delete this.list[arrow.id]
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @returns {boolean}
     */
    static removeEditor(player) {
        for (const arrow of this.getAll()) {
            if (arrow.editor?.id === player.id) {
                arrow.removeEditor()
                return true
            }
        }
        return false
    }

    /**
     * @param {Vector} viewStart
     * @param {Vector} viewDirection
     * @returns {{distance:number,arrow:Arrow}|undefined}
     */
    static getInteractableArrow(viewStart, viewDirection) {
        let output

        for (const arrow of this.getAll()) {
            const rayResult = arrow.rayIntersectsAABB(viewStart, viewDirection)

            if (!rayResult) continue

            if (!output || rayResult.distance < output.distance) {
                output = rayResult
            }
        }

        return output
    }

    static innit() {
        system.runInterval(() => {
            for (const arrow of this.getAll()) {
                if (!arrow.editor || !arrow.editor.isValid) continue

                arrow.move()
            }
        })
    }

    events = {
        /** @type {Event<ArrowOnMoveData>}*/
        onMove: new Event(),
        /** @type {Event<OnReleaseData>}*/
        onRelease: new Event(),
        /** @type {Event<OnSelectData>}*/
        onSelect: new Event(),
    }

    /** @type {"x"|"y"|"z"} */
    axis

    /** @type {import("@minecraft/server").Player} */
    editor

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").Vector2} rotation
     */
    constructor(location, dimension, rotation = { x: 0, y: 0 }) {
        const miny = dimension.heightRange.min

        if (location.y < miny) {
            const offset = location.copy().setY(miny + 1)
            this.entity = dimension.spawnEntity(TYPE_IDS.ARROW, offset)
            this.entity.teleport(location)
        } else {
            this.entity = dimension.spawnEntity(TYPE_IDS.ARROW, location)
        }

        this.location = location
        this.originalLocation = location.copy()
        this.dimension = dimension
        this.rotation = rotation
        this.id = this.entity.id

        this.setAxis(rotation)
        this.setSize(this.axis)
        this.setEntityRotation()
        this.setColor(this.axis)

        DeathOnReload.addEntity(this.entity)

        Arrow.list[this.id] = this
    }

    /**
     * @param {"x"|"y"|"z"} axis
     */
    setColor(axis) {
        if (axis === "x") {
            this.entity.setProperty(PROPERTIES.AXIS, 0)
        } else if (axis === "y") {
            this.entity.setProperty(PROPERTIES.AXIS, 1)
        } else if (axis === "z") {
            this.entity.setProperty(PROPERTIES.AXIS, 2)
        }
    }

    /**
     * @param {Vector} location
     * @param {Vector} direction
     * @returns {{distance:number,arrow:Arrow}|undefined}
     */
    rayIntersectsAABB(location, direction) {
        const playerDistance = Vector.distance(location, this.location)
        const arrowLocation = this.getVisibleLocation(playerDistance)
        const halfSize = Vector.divide(this.getVisibleSize(playerDistance), 2)
        const min = Vector.subtract(arrowLocation, halfSize)
        const max = Vector.add(arrowLocation, halfSize)

        let tmin = -Infinity
        let tmax = Infinity

        for (const axis of ["x", "y", "z"]) {
            if (Math.abs(direction[axis]) < 1e-8) {
                // Ray is parallel to this axis — reject if origin is outside the slab
                if (location[axis] < min[axis] || location[axis] > max[axis]) {
                    return null
                }
            } else {
                const invD = 1 / direction[axis]
                let t1 = (min[axis] - location[axis]) * invD
                let t2 = (max[axis] - location[axis]) * invD

                if (t1 > t2) [t1, t2] = [t2, t1] // swap

                tmin = Math.max(tmin, t1)
                tmax = Math.min(tmax, t2)

                if (tmin > tmax) return null // no hit
            }
        }

        if (tmax < 0) return null // box is behind the ray

        const distance = tmin >= 0 ? tmin : tmax
        return {
            distance,
            arrow: this,
        }
    }

    getVisibleSize(distance) {
        const scale = distance / 15.5 + 1

        return Vector.multiply(this.size, scale)
    }

    getVisibleLocation(distance) {
        const direction = new Vector(0)

        if (this.rotation.y) {
            if (this.rotation.y === 90) direction.y = -1
            if (this.rotation.y === 270) direction.y = 1
        } else {
            // prettier-ignore
            switch (this.rotation.x) {
                case 0: direction.z = -1; break
                case 90: direction.x = 1; break 
                case 180: direction.z = 1; break 
                case 270: direction.x = -1;; break 
            }
        }

        // return this.location.copy()
        const offset = Vector.multiply(direction, distance / 22 + 1)

        offset.subtract(Vector.multiply(this.size, direction))

        return offset.add(this.location)
    }

    setSize(axis) {
        const size = new Vector(0.25, 0.75, 1)
        switch (axis) {
            case "x":
                this.size = size.copy().setAxisOrder("zyx")
                break
            case "z":
                this.size = size
                break
            case "y":
                this.size = size.copy().setAxisOrder("xzy")
                break
        }
    }

    setEntityRotation() {
        this.entity.setProperty(PROPERTIES.HEAD_X_ROTATION, this.rotation.x)
        this.entity.setProperty(PROPERTIES.HEAD_Y_ROTATION, this.rotation.y)
    }

    setAxis(rotation) {
        if (rotation.y) {
            this.axis = "y"
            return
        }
        // prettier-ignore
        switch (rotation.x) {
            case 0: this.axis = "z"; break
            case 90: this.axis = "x"; break 
            case 180: this.axis = "z"; break 
            case 270: this.axis = "x"; break 
        }
    }

    move() {
        const newLocation = this.getPointer().add(this.location)

        const data = {
            prevLocation: this.location.copy(),
            newLocation: newLocation,
            editor: this.editor,
        }

        this.events.onMove.emit(data)
    }

    /**
     * @param {Vector}
     * @param {Boolean}
     */
    teleport(location) {
        this.entity.teleport(location)
        this.location = location
    }

    updateOriginalLocation() {
        this.originalLocation = this.location.copy()
    }

    /** @returns {Vector} */
    getPointer() {
        const eye = PlayerUtils.getEyeLocation(this.editor)
        const rayDir = Vector.normalize(this.editor.getViewDirection())
        const origin = this.location

        // 1. Define the movement axis
        const axis =
            this.axis === "x"
                ? new Vector(1, 0, 0)
                : this.axis === "y"
                  ? new Vector(0, 1, 0)
                  : new Vector(0, 0, 1)

        // 2. Calculate a Plane Normal that faces the camera
        // We want a plane that contains the 'axis' and is as perpendicular
        // to the camera view as possible.
        const eyeToOrigin = Vector.subtract(origin, eye).normalize()
        const perpendicular = Vector.crossProduct(axis, eyeToOrigin).normalize()
        const planeNormal = Vector.crossProduct(perpendicular, axis).normalize()

        // 3. Ray-Plane Intersection Math
        const denom = Vector.dotProduct(rayDir, planeNormal)

        // If ray is parallel to the plane, we can't intersect
        if (Math.abs(denom) < 1e-6) return new Vector(0, 0, 0)

        const t = Vector.dotProduct(Vector.subtract(origin, eye), planeNormal) / denom

        // Intersection is behind the camera
        if (t < 0) return new Vector(0, 0, 0)

        // 4. Calculate hit point and project onto axis
        const hitPoint = Vector.add(eye, Vector.multiply(rayDir, t))
        const offset = Vector.subtract(hitPoint, origin)

        // How far along the axis are we?
        const distanceAlongAxis = Vector.dotProduct(offset, axis)

        // Return the constrained 3D point
        return Vector.multiply(axis, distanceAlongAxis)
    }

    /** @param {import("@minecraft/server").Player} */
    setEditor(player) {
        this.editor = player

        this.events.onSelect.emit({
            location: this.location.copy(),
            editor: player,
        })
    }

    removeEditor() {
        this.events.onRelease.emit({
            location: this.location,
            prevLocation: this.originalLocation.copy(),
            editor: this.editor,
        })

        this.originalLocation = this.location.copy()

        delete this.editor
    }

    remove() {
        if (this.entity.isValid) this.entity.remove()
        Arrow.remove(this)
    }
}

Arrow.innit()
