import { system, world } from "@minecraft/server"
import { Panel } from "./panel"
import { Vector } from "../utils/vector"
import { PlayerUtils } from "../utils/player"

export class Screen {
    static screens = {}
    static id = 0

    /** @returns {Screen[]} */
    static getAll() {
        return Object.values(Screen.screens)
    }

    /**
     * @param {import("@minecraft/server").Player}
     * @returns {boolean}
     */
    static isPlayerLookingAtAnyScreen(player) {
        for (const screen of Screen.getAll()) {
            if (screen.playerIsLookingAtScreen(player)) {
                return true
            }
        }
        return false
    }

    pixelUpdates = {}
    /** @type {Object.<string,Panel>}*/
    panels = {}
    /** @type {Panel[]}*/
    panelUpdateSet = new Set()
    elementMovingIndex = 0
    overlap = false
    elements = {}
    detectPointer = false
    height = 0
    width = 0
    rotation = { x: 0, y: 0 }
    hoverCallbacks = []
    hoverCallbackId = 0
    viewQuery = {}
    interactQuery = {}
    scale = 1 / 2
    color = { r: 255, g: 255, b: 255 }

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {{x:number, y:number}} rotation
     * @param {import("@minecraft/server").EntityQueryOptions} [viewQuery]
     * @param {import("@minecraft/server").EntityQueryOptions} [interactQuery]
     */
    constructor(
        location,
        dimension,
        rotation = { x: 0, y: 0 },
        viewQuery = {},
        interactQuery = {},
    ) {
        this.location = location
        this.dimension = dimension
        this.setRotation(rotation)
        this.viewQuery = viewQuery
        this.interactQuery = interactQuery
        this.id = Screen.id++

        Screen.screens[this.id] = this
    }

    addHoverCallback(callback) {
        this.hoverCallbackId++
        this.hoverCallbacks[this.hoverCallbackId] = callback
        return this.hoverCallbackId
    }

    /**
     * @param {number} id
     */
    removeHoverCallback(id) {
        delete this.hoverCallbacks[id]
    }

    /**
     * @param {number} scale
     */
    setScale(scale) {
        this.scale = scale
    }

    /**
     * @param {{r:number,g:number,b:number}} query
     */
    setColor(color) {
        this.color = color

        for (const panel of Object.values(this.panels)) {
            panel.setColor(color)
        }
    }

    /**
     * @param {import("@minecraft/server").EntityQueryOptions} query
     */
    setViewQuery(query) {
        this.viewQuery = query
        for (const panel of Object.values(this.panels)) {
            panel.viewQuery = this.viewQuery
            panel.refresh()
        }
    }

    setRotation({ x, y }) {
        this.rotation = { x: Math.trunc(x), y: Math.trunc(y) }
        for (const [xy, panel] of Object.entries(this.panels)) {
            let [x, y] = xy.split(",").map((str) => (+str * this.scale) / 16)
            const yRotation = (this.rotation.y * Math.PI) / 180
            const location = new Vector(x * Panel.WIDTH, y * Panel.HEIGHT, 0).rotate({
                y: 0,
                p: yRotation,
                r: 0,
            })

            panel.setRotation({ x, y })
            panel.entity.teleport(Vector.add(location, this.location))
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    setPixel(x, y, boolean) {
        const panel =
            this.getPanel(x, y) ||
            this.addPanel(Math.floor(x / Panel.WIDTH), Math.floor(y / Panel.HEIGHT))

        if (panel === -1) return // wtf is this

        x = x % Panel.WIDTH
        y = y % Panel.HEIGHT
        if (x < 0) x = Panel.WIDTH - Math.abs(x)
        if (y < 0) y = Panel.HEIGHT - Math.abs(y)

        panel.setPixel(x, y, boolean)

        this.panelUpdateSet.add(panel)
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {import("./panel").Panel}
     */
    addPanel(x, y) {
        const location = new Vector(
            0,
            ((y * this.scale) / 16) * Panel.HEIGHT,
            ((x * this.scale) / 16) * Panel.WIDTH,
        )
            .rotate({
                y: (this.rotation.y * Math.PI) / 180,
                p: (this.rotation.x * Math.PI) / 180,
                r: 0,
            })
            .add(this.location)

        const panel = new Panel(location, this.dimension, this)

        panel.setViewQuery(this.viewQuery)
        panel.setColor(this.color)
        panel.setRotation({
            x: this.rotation.x,
            y: this.rotation.y,
        })
        panel.setScale(this.scale)

        this.panels[[x, y]] = panel

        return this.panels[[x, y]]
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {import("./panel").Panel}
     */
    getPanel(x, y) {
        return this.panels[[Math.floor(x / Panel.WIDTH), Math.floor(y / Panel.HEIGHT)]]
    }

    /**
     * @param {import("./screenElements").Element} element
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    addElement(element, x = 0, y = 0) {
        this.elements[this.elementMovingIndex] = element
        element.id = this.elementMovingIndex
        this.elementMovingIndex++

        element.offset = { x, y }
        element.parentElement = this
        element.setScreen(this) // recursively sets the child element screen (idk)
        element.update()
        element.updateChildElements()
    }

    /**
     * @param {import("./screenElements").Element} element
     */
    removeElement(element) {
        element.removeAllPixels()
        for (const callback of element.resetList) {
            callback()
        }
        for (const childElement of Object.values(element.elements)) {
            element.removeElement(childElement)
        }
        delete this.elements[element.id]
    }

    remove() {
        for (const element of Object.values(this.elements)) {
            this.removeElement(element)
        }
        for (const panel of Object.values(this.panels)) {
            panel.remove()
        }
        delete Screen.screens[this.id]
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    getPixel(x, y) {
        for (const element of Object.values(this.elements)) {
            if (element.getPixel(x - element.offset.x, y - element.offset.y)) return true
        }
        return false
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    addUpdate(x, y, boolean) {
        this.pixelUpdates[[x, y]] = boolean
    }

    async update() {
        if (this.overlap) {
            for (const key of Object.keys(this.pixelUpdates)) {
                const [x, y] = key.split(",").map((str) => +str)
                this.setPixel(x, y, this.getPixel(x, y))
            }
        } else {
            for (const [key, value] of Object.entries(this.pixelUpdates)) {
                const [x, y] = key.split(",").map((str) => +str)
                this.setPixel(x, y, value)
            }
        }

        // causes up to 55 ms delay
        await Promise.all([...this.panelUpdateSet].map((panel) => panel.entityIsReady()))
        let players

        if (this.viewQuery) {
            players = world.getPlayers(this.viewQuery)
        }

        for (const panel of this.panelUpdateSet) {
            panel.loadPixels(players)
        }

        this.panelUpdateSet.clear()
        this.pixelUpdates = {}
    }

    /**
     * @param {import(@minecraft/server).Player} player
     * @returns {{x:number,y:number}|undefined}
     */
    getPointer(player) {
        if (player.dimension.id !== this.dimension.id) return

        const inverseRotation = {
            y: (-this.rotation.y * Math.PI) / 180,
            p: (-this.rotation.x * Math.PI) / 180,
            r: 0,
        }
        const relPlayerLocation = Vector.subtract(
            PlayerUtils.getEyeLocation(player),
            this.location,
        )
        const nPlayerLocation = Vector.rotate(relPlayerLocation, inverseRotation)
        const nViewDirection = Vector.rotate(player.getViewDirection(), inverseRotation)

        if (nViewDirection.x < 0) return

        const dir = nViewDirection.normalize()

        const t = -nPlayerLocation.x / dir.x
        if (t < 0) return

        const hitY = nPlayerLocation.y + t * dir.y
        const hitZ = nPlayerLocation.z + t * dir.z

        return {
            x: Math.round(hitZ * 32 - 0.5),
            y: Math.round(hitY * 32 - 0.5),
        }
    }

    /**
     * @param {import(@minecraft/server).Player} player
     * @returns boolean
     */
    playerIsLookingAtScreen(player) {
        const pointer = this.getPointer(player)

        if (!pointer) return false

        const { x, y } = pointer

        if (x < this.xOffset) return false
        if (y < this.yOffset) return false
        if (x > this.xOffset + this.width) return false
        if (y > this.yOffset + this.height) return false

        return true
    }
}

system.runInterval(() => {
    for (const screen of Screen.getAll()) {
        for (const player of world.getPlayers(screen.viewQuery)) {
            const pointer = screen.getPointer(player)

            if (!pointer) continue

            for (const callback of Object.values(screen.hoverCallbacks)) {
                callback({ pointer, player })
            }
        }
    }
})
