import { system, world } from "@minecraft/server"
import { Vector } from "../utils/vector"
import { DeathOnReload } from "../utils/deathOnReload"
import { TYPE_IDS, PACK_ID, PROPERTIES } from "../constants"

export class Panel {
    static WIDTH = 25
    static HEIGHT = 8
    static ids = 0
    // static SCALE = 1 / 32 // pixel compared to block
    static FIRST_RUN_TIMEOUT = 3
    /** @type {Panel[]} */
    static list = []
    static totalPixels = 105

    color = { r: 255, g: 0, b: 0 }
    scale = 1 / 64
    isLoaded = false
    pixelIndex = 0
    firstLoad = true
    pixelCache = Array.from({ length: Panel.HEIGHT }).map(() =>
        Array(Panel.WIDTH).fill(0),
    )
    /** @type {import("@minecraft/server").Entity} */
    entity
    loadedPixels = 0

    constructor(location, dimension, screen) {
        this.location = location
        /** @type {import("@minecraft/server").Dimension} */
        this.dimension = dimension
        this.screen = screen
        this.id = Panel.ids++

        this.spawnEntity()
        Panel.list.push(this)
    }

    resetCache() {
        this.pixelCache = Array.from({ length: Panel.HEIGHT }).map(() =>
            Array(Panel.WIDTH).fill(0),
        )
    }

    setViewQuery(viewQuery) {
        this.viewQuery = viewQuery
    }

    setScale(int) {
        this.scale = int
        this.entity.setProperty(PACK_ID + ":scale", int)
    }

    refreshScale() {
        this.entity.setProperty(PACK_ID + ":scale", this.scale)
    }

    setColor({ r, g, b }) {
        this.color = { r, g, b }
        this.entity.setProperty(PACK_ID + ":rcolor", this.color.r)
        this.entity.setProperty(PACK_ID + ":gcolor", this.color.g)
        this.entity.setProperty(PACK_ID + ":bcolor", this.color.b)
    }

    spawnEntity() {
        if (this.entity?.isValid) return
        this.firstLoad = true

        const { min, max } = this.dimension.heightRange

        if (this.location.y < min || this.location.y > max) {
            const spawnLocation = this.location.copy()

            spawnLocation.y = Math.min(this.location.y, max)
            spawnLocation.y = Math.max(this.location.y, min)

            this.entity = this.dimension.spawnEntity(TYPE_IDS.PANEL, spawnLocation)
            this.entity.teleport(this.location)
        } else {
            this.entity = this.dimension.spawnEntity(TYPE_IDS.PANEL, this.location)
        }

        this.entity.setProperty(PACK_ID + ":pixels", 46)
        DeathOnReload.addEntity(this.entity)
        this.resetCache()
        this.refreshScale()
    }

    reload() {
        this.removeEntity()
        this.spawnEntity()
        this.setRotation(this.rotation)
        this.setColor(this.color)

        this.firstLoad = true
    }

    animationControllers = []

    // TODO: implement this for specific players[]
    resetAnimations() {
        for (let i = 0; i < this.loadedPixels; i++) {
            try {
                this.entity.playAnimation("animation.end", { controller: `${i}` })
            } catch (e) {}
        }
        for (const controller of this.animationControllers) {
            try {
                this.entity.playAnimation("animation.end", {
                    controller: `s${controller}`,
                })
            } catch (e) {}
        }
        this.animationControllers = []
    }

    setRotation(rotation) {
        this.rotation = rotation
        this.entity.setProperty(PROPERTIES.HEAD_X_ROTATION, rotation.x + 90)
        this.entity.setProperty(PROPERTIES.HEAD_Y_ROTATION, rotation.y)
    }

    remove() {
        for (let i = 0; i < Panel.list.length; i++) {
            const panel = Panel.list[i]
            if (panel.entity.id === this.entity.id) {
                Panel.list.splice(i, 1)
            }
        }

        this.removeEntity()
    }

    removeEntity() {
        if (this.entity?.isValid) this.entity.remove()
    }

    loadPixels(players = undefined) {
        const visited = Array.from(
            { length: Panel.HEIGHT },
            () => new Uint8Array(Panel.WIDTH),
        )
        const refCache = this.pixelCache
        let pixels = 0

        if (!this.entity.isValid) return
        this.resetAnimations()

        for (let y = 0; y < Panel.HEIGHT; y++) {
            for (let x = 0; x < Panel.WIDTH; x++) {
                if (!refCache[y][x] || visited[y][x]) continue

                let pixelWidth = 1
                let pixelHeight = 1

                if (refCache[y] && refCache[y][x + 1]) {
                    let newx = x + 1
                    while (refCache[y] && refCache[y][newx]) {
                        visited[y][newx] = true
                        pixelWidth++
                        newx++
                    }
                } else if (refCache[y + 1] && refCache[y + 1][x]) {
                    let newy = y + 1
                    while (refCache[newy] && refCache[newy][x]) {
                        visited[newy][x] = true
                        pixelHeight++
                        newy++
                    }
                }

                this.addPixel(x, y, pixelWidth, pixelHeight, pixels, players)
                pixels++
            }
        }

        this.loadedPixels = pixels

        if (pixels) {
            this.entity.setProperty(PACK_ID + ":pixels", 46)
            // this.entity.setProperty(PACK_ID + ":pixels", pixels - 1)
        } else {
            this.entity.setProperty(PACK_ID + ":pixels", 0)
        }
    }

    entityIsReady() {
        if (!this.firstLoad) return Promise.resolve()

        if (this._isReadyPromise) return this._isReadyPromise

        this._isReadyPromise = new Promise((resolve) => {
            system.runTimeout(() => {
                resolve()
                this.firstLoad = false
            }, Panel.FIRST_RUN_TIMEOUT)
        })

        return this._isReadyPromise
    }

    // TODO: implement specific for specific player[]
    addPixel(x, y, xSize, ySize, pixelId, players) {
        const animation = `animation.panel.pixel_${pixelId}.${x}_${y}`
        const controller = `${pixelId}`
        /** @type {import("@minecraft/server").PlayAnimationOptions} */
        const options = {
            controller,
            stopExpression: "false",
        }

        this.playAnimation(animation, options)

        if (ySize > 1) {
            const animation = `animation.panel.pixel_${pixelId}.scale_y.${ySize}`
            const controller = `s${pixelId}`
            this.animationControllers.push(pixelId)
            /** @type {import("@minecraft/server").PlayAnimationOptions} */
            const options = {
                controller,
                stopExpression: "false",
            }

            this.playAnimation(animation, options)
        } else if (xSize > 1) {
            const animation = `animation.panel.pixel_${pixelId}.scale_x.${xSize}`
            const controller = `s${pixelId}`
            this.animationControllers.push(pixelId)
            /** @type {import("@minecraft/server").PlayAnimationOptions} */
            const options = {
                controller,
                stopExpression: "false",
            }

            this.playAnimation(animation, options)
        }
    }

    playAnimation(animation, options) {
        try {
            this.entity.playAnimation(animation, options)
        } catch (error) {}
    }

    setPixel(x, y, boolean, force = false) {
        if (!this.entity.isValid && boolean) {
            this.spawnEntity()
        }

        if (!force && this.pixelCache[y][x] === boolean) return
        this.pixelCache[y][x] = boolean
    }
}

let onCooldown = false

world.afterEvents.pistonActivate.subscribe((data) => {
    const { dimension } = data

    if (onCooldown) return
    onCooldown = true
    system.runTimeout(() => {
        onCooldown = false
    }, 1)

    const removeList = []
    for (const panel of Panel.list) {
        if (panel.dimension.id !== dimension.id) continue

        const distance = Vector.distance(panel.location, panel.entity.location)
        if (distance < 0.0001) continue

        removeList.push(panel)
    }

    for (const panel of removeList) {
        panel.screen.remove()
    }
})

system.runInterval(() => {
    const players = world.getPlayers()

    for (const player of players) {
        for (const panel of Panel.list) {
            if (panel.isLoaded) continue
            if (Vector.distance(panel.location, player.location) > 40) continue
            if (
                player.prevLocation &&
                Vector.distance(panel.location, player.prevLocation) < 40
            )
                continue
            panel.isLoaded = true
            panel.loadPixels()
        }
        player.prevLocation = player.location
    }

    for (const panel of Panel.list) {
        panel.isLoaded = false
    }
}, 50)

world.beforeEvents.effectAdd.subscribe((data) => {
    const { entity } = data
    if (entity.typeId === TYPE_IDS.PANEL) data.cancel = true
})
