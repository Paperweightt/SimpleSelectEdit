import { ItemStack } from "@minecraft/server"
import {
    ButtonElement,
    Element,
    ItemElement,
    ShapeElement,
    TextElement,
} from "../ui/screenElements"

export class CustomButton extends ButtonElement {
    constructor(width, height, string) {
        super(width, height, string)
    }

    addBox() {}
    startHoverEffect() {}
    endHoverEffect() {}
}

export class KeyIntElement extends Element {
    onClickCallbacks = []

    constructor(width, height, string, value = 0, min = 0, max = 999) {
        super()
        this.height = height
        this.width = width
        this.string = string
        this.value = value
        this.min = min
        this.max = max
    }

    update() {
        this.addElement(new ShapeElement("box", 0, 0, this.width - 1, this.height - 1))
        this.addButtons()
        this.addText()
    }

    addButtons() {
        const dec = new CustomButton(5, 9, "<")
        const incr = new CustomButton(5, 9, ">")
        const dec10 = new CustomButton(5, 9, "<")
        const incr10 = new CustomButton(5, 9, ">")
        const offset = this.width - 21

        dec.addOnClick((data) => {
            if (this.value > this.min) this.value--
            this.updateText()
            this.onClick(data)
            this.screen.update()
        })
        incr.addOnClick((data) => {
            if (this.value < this.max) this.value++
            this.updateText(data)
            this.onClick(data)
            this.screen.update()
        })
        dec10.addOnClick((data) => {
            this.value = Math.max(this.value - 10, this.min)
            this.updateText(data)
            this.onClick(data)
            this.screen.update()
        })
        incr10.addOnClick((data) => {
            this.value = Math.min(this.value + 10, this.max)
            this.updateText()
            this.onClick(data)
            this.screen.update()
        })

        this.addElement(dec10, offset, 2)
        this.addElement(dec, offset + 4, 2)
        this.addElement(incr, offset + 10, 2)
        this.addElement(incr10, offset + 14, 2)
    }

    onClick(data) {
        for (const callback of this.onClickCallbacks) {
            callback(data)
        }
    }

    addOnClick(callback) {
        this.onClickCallbacks.push(callback)
    }

    addText() {
        this.textElement = new TextElement(`${this.string}: ${this.value}`)
        this.addElement(this.textElement, 3, 1)
    }

    updateText() {
        this.textElement.string = `${this.string}: ${this.value}`
        this.textElement.update()
    }
}

export class BlockIntElement extends Element {
    onClickCallbacks = []

    constructor(width, height, item, value = 0, min = 0, max = 999) {
        super()
        this.height = height
        this.item = item
        this.width = width
        this.value = value
        this.min = min
        this.max = max
    }

    update() {
        this.addElement(new ShapeElement("box", 0, 0, this.width - 1, this.height - 1))
        this.addText()
        this.addButtons()
        this.addItem()
    }

    addItem() {
        const itemOffset = (this.height - 1) / 2
        if (!(this.item instanceof ItemStack)) return
        this.addElement(new ItemElement(this.item, 0.25), itemOffset, itemOffset)
    }

    addButtons() {
        const dec = new CustomButton(5, 9, "<")
        const incr = new CustomButton(5, 9, ">")
        const xOffset = 25

        dec.addOnClick((data) => {
            if (this.value > this.min) this.value--
            this.updateText()
            this.onClick(data)
            this.screen.update()
        })
        incr.addOnClick((data) => {
            if (this.value < this.max) this.value++
            this.updateText(data)
            this.onClick(data)
            this.screen.update()
        })

        this.addElement(dec, xOffset, 2)
        this.addElement(incr, xOffset + 5, 2)
    }

    onClick(data) {
        for (const callback of this.onClickCallbacks) {
            callback(data)
        }
    }

    addText() {
        this.textElement = new TextElement(this.value + "")
        this.addElement(this.textElement, this.height, 1)
    }

    addOnClick(callback) {
        this.onClickCallbacks.push(callback)
    }

    updateText() {
        this.textElement.string = this.value + ""
        this.textElement.update()
    }
}

export class StructureIntElement extends Element {
    onClickCallbacks = []

    constructor(width, height, string, value = 0, min = 0, max = 999) {
        super()
        this.height = height
        this.string = string
        this.width = width
        this.value = value
        this.min = min
        this.max = max
    }

    update() {
        this.addElement(new ShapeElement("box", 0, 0, this.width - 1, this.height - 1))
        this.addElement(new TextElement(this.string), 3, 1)
        this.addText()
        this.addButtons()
    }

    addButtons() {
        const dec = new CustomButton(5, 9, "<")
        const incr = new CustomButton(5, 9, ">")
        const xOffset = this.width - 12

        dec.addOnClick((data) => {
            if (this.value > this.min) this.value--
            this.updateText()
            this.onClick(data)
            this.screen.update()
        })
        incr.addOnClick((data) => {
            if (this.value < this.max) this.value++
            this.updateText(data)
            this.onClick(data)
            this.screen.update()
        })

        this.addElement(dec, xOffset, 2)
        this.addElement(incr, xOffset + 5, 2)
    }

    onClick(data) {
        for (const callback of this.onClickCallbacks) {
            callback(data)
        }
    }

    addText() {
        this.textElement = new TextElement(this.value + "")
        this.addElement(this.textElement, this.width - 23, 1)
    }

    addOnClick(callback) {
        this.onClickCallbacks.push(callback)
    }

    updateText() {
        this.textElement.string = this.value + ""
        this.textElement.update()
    }
}

export class BlockButtonElement extends Element {
    constructor(width, height, item, scale = 0.25) {
        super()
        this.width = width
        this.height = height
        this.item = item
        this.scale = scale
    }

    update() {
        this.addElement(new ShapeElement("box", 0, 0, this.width - 1, this.height - 1))
        this.addItem()
        this.button = new CustomButton(7, 7, "x")
        this.button.textElement.offset.y++
        this.button.textElement.update()
        this.addElement(this.button, 17, 3)
    }

    addItem() {
        const offset = (this.height - 1) / 2
        if (!(this.item instanceof ItemStack)) return
        this.addElement(new ItemElement(this.item, this.scale), offset + 2, offset)
    }

    addOnClick(callback) {
        this.button.addOnClick(callback)
    }
}
