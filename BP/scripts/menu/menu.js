import { StackElement, ButtonElement, Element } from "../ui/screenElements.js"
import { BlockButtonElement, BlockIntElement, KeyIntElement } from "./customElements.js"
import { system, BlockTypes, ItemStack, world } from "@minecraft/server"
import { SelectionGroup } from "../selection/selectionGroup.js"
import { Vector } from "../utils/vector.js"
import { Screen } from "../ui/screen.js"
import { Edit } from "../edit/index.js"
import { BackPanel } from "./backPanel.js"
import { SelectItem } from "../selector/selectItem.js"

SelectItem.events.click.subscribe({
    priority: (data) => {
        const { player } = data

        if (!player.customIsShifting) return Infinity

        return -1
    },
    callback: (data) => {
        const { player } = data
        const dimension = player.dimension

        world.sendMessage("hi")

        const viewDirection = Vector.multiply(player.getViewDirection(), 2.25)
        const location = Vector.add(player.getHeadLocation(), viewDirection)

        if (location.y > dimension.heightRange.max) return
        if (location.y < dimension.heightRange.min + 2) return
        if (player.interacted) return

        new Menu(player, location, dimension)
    },
})

SelectItem.events.click.subscribe({
    priority: (data) => {
        if (Screen.isPlayerLookingAtAnyScreen(data.player)) return -2
        return Infinity
    },
    callback: () => {},
})

SelectItem.events.startUse.subscribe({
    priority: (data) => {
        if (Screen.isPlayerLookingAtAnyScreen(data.player)) return -2
        return Infinity
    },
    callback: () => {},
})

export const BUTTON_WIDTH = 54
export const BUTTON_HEIGHT = 13

class Menu {
    static list = {}

    static remove(id) {
        const menu = Menu.get(id)

        if (!menu) return false

        menu.unlockItem()
        menu.savePreviousStates()
        menu.screen.remove()
        if (menu.backPanel) menu.backPanel.remove()

        delete Menu.list[id]
        return true
    }

    /** @returns {Menu} */
    static get(id) {
        return this.list[id]
    }

    /** @returns {Menu[]} */
    static getMenus() {
        return Object.values(this.list)
    }

    /**
     * @param {import("@minecraft/server").Player} player
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     */
    constructor(player, location, dimension) {
        const container = player.getComponent("inventory").container

        this.viewQuery = { name: player.name }
        this.rotation = { x: Math.trunc(player.getRotation().y + 90), y: 0 }
        this.location = location
        this.dimension = dimension
        this.slot = container.getSlot(player.selectedSlotIndex)
        this.selectionGroup = SelectionGroup.get(player.id)
        this.item = new SelectItem(this.slot)
        this.db = this.item.data
        this.player = player
        this.id = player.id
        this.previousMenus = this.db.previousMenus

        this.lockItem()
        this.initBackPanel()
        this.initScreen()
        this.runInterval()

        this.resume()

        Menu.list[this.id] = this
    }

    async update() {
        await this.screen.update()
        this.updateBackPanel()
    }

    savePreviousStates() {
        this.db.previousMenus = this.previousMenus
        this.item.save()
    }

    remove() {
        Menu.remove(this.id)
    }

    resume() {
        const [fn, ...args] = this.db.currentMenu
        this[fn](...args)
    }

    updateBackPanel() {
        const height = this.tabManager.height + 2
        const width = this.tabManager.width + 2
        const angledZOffset = -11 / 32

        const yOffset = 24.25 / 32

        const xOffset =
            angledZOffset * Math.cos(((Math.round(this.rotation.x) + 90) * Math.PI) / 180)

        const zOffset =
            angledZOffset * Math.sin(((Math.round(this.rotation.x) + 90) * Math.PI) / 180)

        const offset = new Vector(xOffset, yOffset, zOffset)

        this.screen.height = height
        this.screen.width = width

        this.screen.xOffset = -27
        this.screen.yOffset = 22 - height

        this.backPanel.teleport(Vector.add(this.location, offset))
        this.backPanel.setSize({ x: width, y: height })
    }

    runInterval() {
        const id = system.runInterval(() => {
            if (!this.player.isValid || Vector.distance(this.player.location, this.location) > 15) {
                this.remove()
                system.clearRun(id)
            }
        })
    }

    lockItem() {
        this.slot.lockMode = "slot"
    }

    unlockItem() {
        this.slot.lockMode = "none"
    }

    initScreen() {
        const panel = new Element()
        const r = this.player.getDynamicProperty("textColorr") ?? 255
        const g = this.player.getDynamicProperty("textColorg") ?? 255
        const b = this.player.getDynamicProperty("textColorb") ?? 255

        this.screen = new Screen(
            this.location,
            this.dimension,
            this.rotation,
            this.viewQuery,
            this.viewQuery,
        )

        this.screen.setColor({ r, g, b })
        this.tabManager = new StackElement("horizontal")

        panel.addElement(this.tabManager)

        this.screen.addElement(panel, -25, 10)

        this.addMiscButtons(false)
    }

    initBackPanel() {
        this.backPanel = new BackPanel(this.location.copy(), this.dimension)

        this.backPanel.setRotation({
            y: Math.round(this.rotation.y),
            x: Math.round(this.rotation.x),
        })
    }

    addMiscButtons(update = true) {
        this.miscPanel = new StackElement("vertical")
        this.tabManager.addElement(this.miscPanel)

        const closeButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "x")
        closeButton.addOnClick(async () => {
            await system.waitTicks(2)
            Menu.remove(this.id)
        })
        closeButton.textElement.offset.y++
        closeButton.textElement.update()
        this.miscPanel.addElement(closeButton)

        const undoButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "u")
        undoButton.addOnClick(async ({ player }) => {
            const { blocks } = await Edit.playerUndoRecent(player)

            if (this.selectionGroup?.isValid) {
                this.selectionGroup.reloadLocations()
                this.selectionGroup.reloadArrowLocations()
            }

            if (blocks > 1000) {
                player.sendMessage(blocks + " blocks filled")
            }
        })
        undoButton.textElement.offset.y++
        undoButton.textElement.update()
        this.miscPanel.addElement(undoButton)

        const backButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "<")
        backButton.addOnClick(() => {
            if (!this.previousMenus.length) return
            this.tabManager.removeElementsAfter(this.miscPanel)

            const [fn, ...args] = this.previousMenus.pop()

            this[fn](args)
        })
        backButton.textElement.offset.x--
        backButton.textElement.update()
        this.miscPanel.addElement(backButton)

        if (update) this.update()
    }

    addMainPanel() {
        const width = 58
        const panel = new StackElement("vertical")

        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addMainPanel"]
        this.item.save()

        const addButtonWithUi = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.tabManager.removeElementsAfter(this.miscPanel)
                this.previousMenus.push(["addMainPanel"])
                this[callback]()
            })
            panel.addElement(button)
        }

        const addButton = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(callback)
            panel.addElement(button)
        }

        addButtonWithUi("Transform", "addTransforms")
        addButtonWithUi("Fill", "addFillOptions")
        addButton("Duplicate")
        addButton("Delete", () => {
            if (!this.selectionGroup) return
            this.selectionGroup.removeSelections()
            this.selectionGroup.remove()
        })
        addButtonWithUi("Options", "addMoreOptions")

        this.update()
    }

    addFillOptions() {
        const panel = new StackElement("vertical")
        const width = 64

        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addFillOptions"]
        this.item.save()

        const addButtonWithUi = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(callback)
            panel.addElement(button)
            this.previousMenus.push(["addFillOptions"])
        }

        this.update()
    }

    addTransforms() {
        const panel = new StackElement("vertical")
        const width = 64

        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addTransforms"]
        this.item.save()

        const addButton = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(callback)
            panel.addElement(button)
        }

        addButton("Rotate 90°")
        addButton("Rotate -90°")
        addButton("Flip X")
        addButton("Flip Z")

        this.update()
    }

    addMoreOptions() {
        const panel = new StackElement("vertical")
        const width = 52

        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addMoreOptions"]
        this.item.save()

        const colorButton = new ButtonElement(width, BUTTON_HEIGHT, "Color")
        panel.addElement(colorButton)

        colorButton.addOnClick(() => {
            this.addColorOptions()
        })

        this.update()
    }

    addFilterOptions(mode) {
        const width = 46
        const panel = new StackElement("vertical")
        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addFilterOptions", mode]
        this.item.save()

        const addButton = (name, callback, type) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.db[mode].filter = name.toLowerCase()
                this.item.save()

                if (type) {
                    this.previousMenus.push(["addFilterOptions", mode])
                    this[callback](type, mode)
                }
            })
            panel.addElement(button)
        }

        addButton("None")
        addButton("Blacklist", "addBlockList", "blacklist")
        addButton("Whitelist", "addBlockList", "whitelist")

        this.update()
    }

    addBlockList(type, mode) {
        const width = 29
        const inputButton = new ButtonElement(width, BUTTON_HEIGHT, "input")
        const list = this.db[mode][type]
        const air = "minecraft:air"
        const panel = new StackElement("vertical")

        this.db.currentMenu = ["addBlockList", type, mode]
        this.item.save()
        this.tabManager.removeElementsAfter(this.miscPanel)
        this.tabManager.addElement(panel)
        panel.addElement(inputButton)

        const addInputs = () => {
            for (const block of this.db[mode][type]) {
                const item = block === "air" ? null : new ItemStack(block)
                addBlockButton(item)
            }
            this.update()
        }

        const addBlockButton = (item) => {
            const element = new BlockButtonElement(width, BUTTON_HEIGHT, item)
            panel.addElement(element)

            element.addOnClick(() => {
                list.splice(list.indexOf(item?.typeId ?? air), 1)

                panel.removeElementsAfter(inputButton)
                addInputs()

                this.item.save()
            })
        }

        inputButton.addOnClick(({ player }) => {
            const container = player.getComponent("inventory").container
            const item = container.getItem(player.selectedSlotIndex)

            if (item && !BlockTypes.get(item.typeId)) return

            if (!list.includes(item?.typeId ?? air)) {
                list.push(item?.typeId ?? air)
                addBlockButton(item)
                this.item.save()
            }
            this.update()
        })

        addInputs()
    }

    reName(player) {
        const form = new ModalFormData().title("Set a New Name").textField("", "name")

        form.show(player).then((formData) => {
            if (formData.canceled) return
            let name = formData.formValues[0] || undefined
            name = name ? "§r§f" + name : undefined

            this.db.slot.nameTag = name
        })
    }

    addSmoothOptions() {
        const verticalStack = new StackElement("vertical")
        this.tabManager.addElement(verticalStack)
        this.db.mode = "smooth"
        this.db.currentMenu = ["addSmoothOptions"]
        this.item.save()

        const def = this.db.smooth.diameter
        const keyIntElement = new KeyIntElement(BUTTON_WIDTH, BUTTON_HEIGHT, "d", def, 1, 25)

        verticalStack.addElement(keyIntElement)
        keyIntElement.addOnClick(() => {
            this.db.smooth.diameter = keyIntElement.value
            this.item.save()
        })

        const filterButton = new ButtonElement(BUTTON_WIDTH, BUTTON_HEIGHT, "Filter")
        filterButton.addOnClick(() => {
            this.tabManager.removeElementsAfter(this.miscPanel)
            this.addFilterOptions("smooth")
            this.previousMenus.push(["addSmoothOptions"])
            this.update()
        })
        verticalStack.addElement(filterButton)

        this.update()
    }

    addFillPanel() {
        const width = 50
        const fillPanel = new StackElement("vertical")
        this.tabManager.addElement(fillPanel)
        this.db.currentMenu = ["addFillPanel"]
        this.item.save()

        const addButton = (name, callback, menuParam) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.tabManager.removeElementsAfter(this.miscPanel)
                this[callback](menuParam)
                this.previousMenus.push(["addFillPanel"])
            })
            fillPanel.addElement(button)
        }

        addButton("Shape", "addShapeOptions")
        addButton("Rotation", "addRotationOptions")
        addButton("Texture", "addTexturePanel")
        addButton("Filter", "addFilterOptions", "fill")

        this.db.mode = "fill"
        this.item.save()

        const meshValue = this.db.fill.mesh ? "on" : "off"
        const meshButton = new ButtonElement(width, BUTTON_HEIGHT, `Mesh: ${meshValue}`)

        meshButton.addOnClick(() => {
            this.db.fill.mesh = !this.db.fill.mesh
            const value = this.db.fill.mesh ? "on" : "off"
            meshButton.textElement.string = `Mesh: ${value}`
            meshButton.textElement.update()
            this.screen.update()
            this.item.save()
        })
        fillPanel.addElement(meshButton)

        const fullValue = this.db.fill.full ? "on" : "off"
        const fullButton = new ButtonElement(width, BUTTON_HEIGHT, `Full: ${fullValue}`)

        fullButton.addOnClick(() => {
            this.db.fill.full = !this.db.fill.full
            const fullValue = this.db.fill.full ? "on" : "off"
            fullButton.textElement.string = `Full: ${fullValue}`
            fullButton.textElement.update()
            this.screen.update()
            this.item.save()
        })
        fillPanel.addElement(fullButton)

        this.update()
    }

    addShapeOptions() {
        const vertStack = new StackElement("vertical")
        this.tabManager.addElement(vertStack)
        this.db.currentMenu = ["addShapeOptions"]
        this.item.save()

        for (const name of Shape.getNames()) {
            const button = new ButtonElement(BUTTON_WIDTH, BUTTON_HEIGHT, name)

            button.addOnClick(() => {
                this.db.fill.shape = name
                this.item.save()
                this.tabManager.removeElementsAfter(this.miscPanel)
                this.previousMenus.push(["addShapeOptions"])

                this.addShapeParameterOptions(name)
            })
            vertStack.addElement(button)
        }

        this.update()
    }

    addTexturePanel() {
        const width = 37
        const panel = new StackElement("vertical")

        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addTexturePanel"]
        this.item.save()

        const inputButton = new ButtonElement(width, BUTTON_HEIGHT, "Input")
        panel.addElement(inputButton)

        const addBlockButton = (item, amount) => {
            const blockButton = new BlockIntElement(width, BUTTON_HEIGHT, item, amount)
            const type = item?.typeId || "air"
            panel.addElement(blockButton)

            blockButton.addOnClick(() => {
                if (blockButton.value === 0) {
                    panel.removeElementsAfter(inputButton)
                    delete this.db.fill.texture[type]
                    addInputs()
                } else {
                    this.db.fill.texture[type] = blockButton.value
                }

                this.item.save()
            })
        }

        const addInputs = () => {
            for (const [block, amount] of Object.entries(this.db.fill.texture)) {
                const item = block === "air" ? null : new ItemStack(block)
                addBlockButton(item, amount)
            }
            this.update()
        }
        addInputs()

        inputButton.addOnClick(({ player }) => {
            const container = player.getComponent("inventory").container
            const item = container.getItem(player.selectedSlotIndex)
            if (item && !BlockTypes.get(item.typeId)) return

            const type = item?.typeId || "air"

            if (this.db.fill.texture[type]) {
                this.db.fill.texture[type]++
                panel.removeElementsAfter(inputButton)
                addInputs()
            } else {
                addBlockButton(item, 1)
                this.db.fill.texture[type] = 1
            }

            this.update()
            this.item.save()
        })
    }

    addColorOptions() {
        const verticalStack = new StackElement("vertical")
        const colors = ["r", "g", "b"]
        const width = 53
        const panel = "textColor"

        this.tabManager.removeElementsAfter(this.miscPanel)
        this.previousMenus.push(["addMoreOptions"])
        this.tabManager.addElement(verticalStack)
        this.db.currentMenu = ["addColorOptions"]
        this.item.save()

        for (const color of colors) {
            const panelColorPartId = panel + color
            const value = this.player.getDynamicProperty(panelColorPartId) ?? 190

            const colorButton = new KeyIntElement(width, BUTTON_HEIGHT, color, value, 0, 255)
            verticalStack.addElement(colorButton)

            colorButton.addOnClick(() => {
                this.player.setDynamicProperty(panelColorPartId, colorButton.value)

                const r = this.player.getDynamicProperty(panel + "r") ?? 150
                const g = this.player.getDynamicProperty(panel + "g") ?? 150
                const b = this.player.getDynamicProperty(panel + "b") ?? 150

                this.screen.setColor({ r, g, b })
            })
        }

        this.update()
    }
}
