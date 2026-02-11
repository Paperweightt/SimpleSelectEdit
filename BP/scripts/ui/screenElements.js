import { world, system } from "@minecraft/server"
import { molang } from "./font/molang"
import { Vector } from "../utils/vector"
import { ItemDisplay } from "../utils/itemDisplay"

export class Element {
    resetList = []
    elements = {}
    pixels = {}
    elementMovingIndex = 0
    offset = { x: 0, y: 0 }
    absOffset
    _height = 0
    _width = 0
    /** @type import("./screen.js").Screen */
    screen

    get height() {
        return this._height
    }

    set height(int) {
        this._height = int
    }

    get width() {
        return this._width
    }

    set width(int) {
        this._width = int
    }

    getElementAmount() {
        return Object.keys(this.elements).length
    }

    setPixel(x, y, boolean) {
        if (this.pixels[[x, y]] !== boolean) {
            this.addUpdate(x, y, boolean)

            this.pixels[[x, y]] = boolean
        }
    }

    addUpdate(x, y, boolean) {
        if (!this.parentElement) return
        const abs = this.getAbsOffset()
        this.screen.addUpdate(abs.x + x, abs.y + y, boolean)
    }

    getPixel(x, y) {
        if (this.pixels[[x, y]]) return 1

        for (const element of Object.values(this.elements)) {
            if (element.getPixel(x - element.offset.x, y - element.offset.y)) return 1
        }
        return 0
    }

    removeAllPixels() {
        for (const key of Object.keys(this.pixels)) {
            let [x, y] = key.split(",").map((v) => +v)
            this.setPixel(x, y, 0)
        }
        this.pixels = {}
    }

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

    removeAllElements() {
        for (const element of Object.values(this.elements)) {
            this.removeElement(element)
        }
    }

    addElement(element, x = 0, y = 0) {
        element.offset.x += x
        element.offset.y += y
        this.elements[this.elementMovingIndex] = element
        element.id = this.elementMovingIndex
        this.elementMovingIndex++
        element.parentElement = this

        if (this.screen) {
            element.screen = this.screen
            element.update()
        }
    }

    updateChildElements() {
        for (const element of Object.values(this.elements)) {
            element.update()
            element.updateChildElements()
        }
    }

    update() {}

    refresh() {
        for (const location of Object.keys(this.pixels)) {
            const [x, y] = location.split(",").map((v) => +v)
            this.addUpdate(x, y)
        }
    }

    refreshChildElements() {
        for (const element of Object.values(this.elements)) {
            element.refresh()
            element.refreshChildElements()
        }
    }

    setScreen(screen) {
        this.screen = screen

        for (const element of Object.values(this.elements)) {
            element.setScreen(screen)
        }
    }

    getPointer(player) {
        const { x, y } = this.parentElement.getPointer(player)
        return { x: x - this.offset.x, y: y - this.offset.y }
    }

    getAbsOffset() {
        if (this.absOffset) return this.absOffset
        if (this.parentElement.getAbsOffset) {
            const { x, y } = this.parentElement.getAbsOffset()
            this.absOffset = { x: this.offset.x + x, y: this.offset.y + y }
            return this.absOffset
        }
        return this.offset
    }
}

export class TextElement extends Element {
    static getLinePixelLength(string, font = molang) {
        let length = 0
        for (let i = 0; i < string.length; i++) {
            const char = string[i]
            if (!font[char]) {
                continue
            }
            length += font[char][0].length + 1
        }
        return length
    }

    newLinePadding = 9
    justify
    maxWidth

    constructor(string = "", textOptions = {}) {
        super()
        this.string = string
        this.height = this.string.split("\n").length * this.newLinePadding
        this.font = molang

        for (const [key, value] of Object.entries(textOptions)) {
            this[key] = value
        }
    }

    update() {
        this.removeAllPixels()
        this.addStringPixels()
    }

    addStringPixels() {
        let yOffset = 0

        for (const string of this.string.split("\n")) {
            this.addLine(string, 0, yOffset)
            yOffset -= this.newLinePadding
        }
    }

    addLine(string, xOffset, yOffset) {
        if (this.maxWidth) {
            let newString = ""
            let newXOffset = xOffset
            for (let i = 0; i < string.length; i++) {
                const char = string[i]
                if (!this.font[char]) continue

                newXOffset += this.font[char][0].length + 1
                newString += char

                if (newXOffset > this.maxWidth) {
                    while (newXOffset + 6 > this.maxWidth) {
                        const lastChar = newString[newString.length - 1]
                        newXOffset -= this.font[lastChar][0].length + 1
                        newString = newString.slice(0, -1)
                    }
                    string = newString + "..."
                    break
                }
            }
        }

        switch (this.justify) {
            case "center":
                xOffset -= Math.floor(TextElement.getLinePixelLength(string, this.font) / 2) - 1
                break
            case "right":
                xOffset -= Math.floor(TextElement.getLinePixelLength(string, this.font)) - 1
                break
        }

        for (let i = 0; i < string.length; i++) {
            const char = string[i]
            if (!this.font[char]) continue

            this.addChar(char, xOffset, yOffset)
            xOffset += this.font[char][0].length + 1
        }
    }

    addChar(char, xOffset, yOffset) {
        const width = this.font[char][0].length
        const height = this.font[char].length

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (this.font[char][y][x]) this.setPixel(x + xOffset, height - y + yOffset, 1)
            }
        }
    }
}

export class ShapeElement extends Element {
    constructor(shape, x1, y1, x2, y2) {
        super()
        this.shape = shape
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    update() {
        this[this.shape](this.x1, this.y1, this.x2, this.y2)
    }

    line(x1, y1, x2, y2) {
        const slope = (y2 - y1) / (x2 - x1)
        const b = y1 - slope * x1

        if (x2 - x1 === 0) {
            for (let i = y1; i < y2; i++) {
                this.setPixel(x1, i, 1)
            }
            return
        }

        if (slope <= 1) {
            for (let i = x1; i < x2; i++) {
                const y = Math.floor(slope * i + b)
                this.setPixel(i, y, 1)
            }
            return
        } else {
            for (let i = y1; i < y2; i++) {
                const x = Math.floor((i - b) / slope)
                this.setPixel(x, i, 1)
            }
        }
    }

    box(x1, y1, x2, y2) {
        this.line(x1, y1 + 1, x1, y2) // left
        this.line(x2, y1 + 1, x2, y2) // right
        this.line(x1, y2, x2 + 1, y2) // top
        this.line(x1, y1, x2 + 1, y1) // bottom
    }
}

export class ButtonElement extends Element {
    clickEvents = []
    hoverEvents = []
    hover = false
    runHover = true

    constructor(width, height, string, font = molang) {
        super()
        this.string = string
        this.font = font
        this.width = width
        this.height = height
        this.textElement = new TextElement(this.string, { justify: "center", font: molang })
    }

    update() {
        this.addBox()
        this.addString()
        this.runInterval()
    }

    addOnClick(callback) {
        world.sendMessage("hi")
        const id = world.afterEvents.playerInteractWithEntity.subscribe((data) => {
            const player = data.player

            if (!player.matches(this.screen.interactQuery)) return
            const pointer = this.getPointer(player)
            if (!pointer) return
            const { x, y } = pointer
            if (x < 0 || y < 0 || y > this.height || x > this.width) return

            callback({ player, location: { x, y } })

            this.endHoverEffect()
            player.playSound("random.click")

            this.hover = false
            this.runHover = false

            system.runTimeout(() => {
                this.runHover = true
            }, 1)
        })

        this.resetList.push(() => {
            world.afterEvents.playerInteractWithEntity.unsubscribe(id)
        })
    }

    runInterval() {
        const { x: xOffset, y: yOffset } = this.getAbsOffset()
        const id = this.screen.addHoverCallback((data) => {
            const { x, y } = data.pointer

            if (!this.runHover) return

            let bool = false

            if (
                x >= xOffset &&
                y >= yOffset &&
                y <= this.height + yOffset &&
                x <= this.width + xOffset
            ) {
                bool = true
            }

            if (bool) {
                if (!this.hover) {
                    this.startHoverEffect()
                    this.hover = true
                }
            } else if (this.hover) {
                this.endHoverEffect()
                this.hover = false
            }
        })

        this.resetList.push(() => {
            this.screen.removeHoverCallback(id)
        })
    }

    addString() {
        const x = Math.floor((this.width - 1) / 2)
        const y = Math.floor((this.height - 1 - this.textElement.height) / 2)
        this.addElement(this.textElement, x, y)
    }

    addBox() {
        this.addElement(new ShapeElement("box", 0, 0, this.width - 1, this.height - 1))
    }

    startHoverEffect() {
        this.hoverBox = [
            new ShapeElement("line", 2, 1, this.width - 2, 1),
            new ShapeElement("line", 2, this.height - 2, this.width - 2, this.height - 2),
            new ShapeElement("line", 1, 2, 1, this.height - 2),
            new ShapeElement("line", this.width - 2, 2, this.width - 2, this.height - 2),
        ]
        for (const element of this.hoverBox) {
            this.addElement(element)
        }
        this.screen.update()
    }

    endHoverEffect() {
        if (!this.hoverBox) return
        for (const element of this.hoverBox) {
            this.removeElement(element)
        }
        this.screen.update()
    }
}

export class StackElement extends Element {
    get width() {
        let width = 0

        for (const element of Object.values(this.elements)) {
            if (this.direction === "horizontal") {
                width += element.width + this.stackOffset + 2
            } else if (element.width > width) {
                width = element.width
            }
        }

        return width
    }

    get height() {
        let height = 0

        for (const element of Object.values(this.elements)) {
            if (this.direction === "vertical") {
                height += element.height + this.stackOffset + 2
            } else if (element.height > height) {
                height = element.height
            }
        }

        return height
    }

    constructor(direction, stackOffset = 0) {
        super()
        this.direction = direction
        this.stackOffset = stackOffset
    }

    addElement(element) {
        if (this.direction === "horizontal") {
            super.addElement(element, this.width, 0)
        } else {
            super.addElement(element, 0, -this.height)
        }
    }

    removeElementsAfter(element) {
        const axis = this.direction === "horizontal" ? "x" : "y"
        for (const childElement of Object.values(this.elements)) {
            if (axis === "x" && childElement.offset[axis] > element.offset[axis]) {
                this.removeElement(childElement)
            }
            if (axis === "y" && childElement.offset[axis] < element.offset[axis]) {
                this.removeElement(childElement)
            }
        }
    }

    sliceElements(start, amount = 1) {
        const axis = this.direction === "horizontal" ? "x" : "y"
        const size = this.direction === "horizontal" ? "width" : "height"
        let offset = 0

        const elements = Object.values(this.elements).sort((a, b) => {
            return a.offset[axis] > b.offset[axis]
        })

        for (let i = start; i < amount + start; i++) {
            offset += elements[i][size] + 2 + this.stackOffset
            this.removeElement(elements[i])
        }

        for (let i = amount + start; i < this.getElementAmount() + 1; i++) {
            elements[i].offset[axis] -= offset
            elements[i].refreshChildElements()
        }
    }
}

export class ItemElement extends Element {
    constructor(item, size = 1, xRotation = 0, width = 0, height = 0) {
        super()
        this.xRotation = xRotation
        this.size = size
        this.item = item
        this.height = height
        this.width = width
    }

    update() {
        let { x, y } = this.getAbsOffset()

        const location = new Vector(0, y / (64 * this.screen.scale), x / (64 * this.screen.scale))
            .rotate({
                y: (this.screen.rotation.y * Math.PI) / 180,
                p: (this.screen.rotation.x * Math.PI) / 180,
                r: 0,
            })
            .add(this.screen.location)

        const display = new ItemDisplay(location, this.screen.dimension, this.item)

        display.rotation = {
            y: this.screen.rotation.x + this.xRotation - 90,
            x: this.screen.rotation.y,
        }
        display.size = this.size
        display.load()

        this.resetList.push(() => display.remove())
    }
}
