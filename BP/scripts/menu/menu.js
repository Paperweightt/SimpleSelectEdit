import { StackElement, ButtonElement, TextElement } from "../ui/screenElements.js"
import { BlockButtonElement, BlockIntElement, KeyIntElement } from "./customElements.js"
import { system, BlockTypes, ItemStack } from "@minecraft/server"
import { ModalFormData } from "@minecraft/server-ui"
import { SelectionGroup } from "../selection/selectionGroup.js"
import { Vector } from "../utils/vector.js"
import { Screen } from "../ui/screen.js"
import { Edit } from "../edit/index.js"
import { BackPanel } from "./backPanel.js"
import { SelectItem } from "../items/selector/selectItem.js"
import { Blueprint } from "../items/blueprint/blueprint.js"

// disable clicks while viewing screen
SelectItem.events.click.subscribe({
    priority: (data) => {
        if (Screen.isPlayerLookingAtAnyScreen(data.player)) return -Infinity
        return Infinity
    },
    callback: () => {},
})

// disable drag while viewing screen
SelectItem.events.startUse.subscribe({
    priority: (data) => {
        if (Screen.isPlayerLookingAtAnyScreen(data.player)) return -Infinity
        return Infinity
    },
    callback: () => {},
})

export const BUTTON_WIDTH = 54
export const BUTTON_HEIGHT = 13

export class Menu {
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

    /** @param {Menu} */
    static addMenu(menu) {
        this.get(menu.id)?.remove()

        this.list[menu.id] = menu
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
        this.item = new SelectItem(this.slot)
        this.db = this.item.data
        this.player = player
        this.id = player.id
        this.previousMenus = this.db.previousMenus

        this.lockItem()
        this.initScreen()
        this.runInterval()

        this.resume()
        this.initBackPanel()

        Menu.addMenu(this)
    }

    async update() {
        await this.screen.update()
        this.updateBackPanel()
    }

    /** @param {string} */
    setTitle(string = "") {
        if (!this.title) {
            this.title = new TextElement(string)
            this.screen.addElement(this.title, -10, 22)
        }

        this.title.string = string

        this.title.update()
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
        const titleHeight = this.title.height - 1
        const height = this.tabManager.height + 2 + titleHeight
        const width = this.tabManager.width + 2

        this.screen.height = height
        this.screen.width = width

        this.screen.xOffset = -27
        this.screen.yOffset = 22 - height

        this.backPanel.setSize({ x: width, y: height })
    }

    initBackPanel() {
        this.backPanel = new BackPanel(this.getBackPanelLocation(), this.dimension)

        this.backPanel.setRotation({
            y: Math.round(this.rotation.y),
            x: Math.round(this.rotation.x),
        })
    }

    /** @returns {Vector} */
    getBackPanelLocation() {
        const titleHeight = this.title.height - 1
        const angledZOffset = -11 / 32

        const yOffset = (24.25 + titleHeight) / 32

        const xOffset =
            angledZOffset * Math.cos(((Math.round(this.rotation.x) + 90) * Math.PI) / 180)

        const zOffset =
            angledZOffset * Math.sin(((Math.round(this.rotation.x) + 90) * Math.PI) / 180)

        const offset = new Vector(xOffset, yOffset, zOffset)

        return Vector.add(this.location, offset)
    }

    runInterval() {
        const id = system.runInterval(() => {
            if (
                !this.player.isValid ||
                Vector.distance(this.player.location, this.location) > 15
            ) {
                this.remove()
                system.clearRun(id)
            }
        }, 10)
    }

    /** @returns {SelectionGroup} */
    getSelectionGroup() {
        return SelectionGroup.get(this.player.id)
    }

    lockItem() {
        this.slot.lockMode = "slot"
    }

    unlockItem() {
        this.slot.lockMode = "none"
    }

    initScreen() {
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
        this.screen.addElement(this.tabManager, -25, 10)

        this.addMiscButtons(false)
    }

    addMiscButtons(update = true) {
        this.miscPanel = new StackElement("vertical")
        this.tabManager.addElement(this.miscPanel)

        const closeButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "x")
        closeButton.addOnClick(async () => {
            Menu.remove(this.id)
        })
        closeButton.textElement.offset.y++
        closeButton.textElement.update()
        this.miscPanel.addElement(closeButton)

        // const undoButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "u")
        // undoButton.addOnClick(async ({ player }) => {
        //     const { blocks } = await Edit.playerUndoRecent(player.id)
        //     const group = this.getSelectionGroup()
        //
        //     if (group) {
        //         group.reloadArrowLocations()
        //         group.reloadCoreLocation()
        //         group.updateOriginalLocations()
        //     }
        //
        //     if (blocks > 1000) {
        //         player.sendMessage(blocks + " blocks filled")
        //     }
        // })
        // undoButton.textElement.offset.y++
        // undoButton.textElement.update()
        // this.miscPanel.addElement(undoButton)

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

        this.setTitle("Main Menu")
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

        addButton("Duplicate", () => {
            const group = this.getSelectionGroup()
            if (!group) return
            group.arrowMode = "duplicate"
            this.remove()
        })

        addButton("Flip X", async () => {
            const group = this.getSelectionGroup()
            if (!group) return

            const result = await Edit.playerRunAndSave(this.player.id, "flip", {
                selections: group.selections,
                dimension: this.dimension,
                flip: "x",
            })

            this.player.sendMessage(`${result.metrics.blocks} blocks filled`)
        })

        addButton("Flip Z", async () => {
            const group = this.getSelectionGroup()
            if (!group) return

            const result = await Edit.playerRunAndSave(this.player.id, "flip", {
                selections: group.selections,
                dimension: this.dimension,
                flip: "z",
            })

            this.player.sendMessage(`${result.metrics.blocks} blocks filled`)
        })

        // addButton("Delete", () => {
        //     const group = this.getSelectionGroup()
        //
        //     if (!group) return
        //
        //     group.removeSelections()
        //     group.remove()
        //
        //     this.remove()
        // })

        //TODO: set this back to replace once its done
        addButtonWithUi("Fill", "addFillOptions")

        addButton("Save As", () => {
            const group = this.getSelectionGroup()

            if (!group) return

            const form = new ModalFormData()
                .title("Save to Blueprint")
                .textField("", "name")

            form.show(this.player).then((formData) => {
                if (formData.canceled) return
                const container = this.player.getComponent("inventory").container
                let name = formData.formValues[0] || undefined
                const itemStack = new Blueprint(group, name)

                container.addItem(itemStack)

                this.remove()
            })
        })

        addButtonWithUi("Options", "addMoreOptions")

        this.update()
    }

    addFillOptions() {
        const panel = new StackElement("vertical")
        const width = 38

        //TODO: set this back to replace once its done
        this.setTitle("Fill")
        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addFillOptions"]
        this.item.save()

        const addButton = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(callback)
            panel.addElement(button)

            return button
        }

        addButton("Apply", async () => {
            const group = this.getSelectionGroup()

            if (!group) return

            const result = await Edit.playerRunAndSave(this.player.id, "fill", {
                blocks: this.db.fill.blocks,
                selections: group.selections,
                dimension: this.dimension,
            })

            this.player.sendMessage(`${result.metrics.blocks} blocks filled`)
        })

        const inputButton = addButton("Input", ({ player }) => {
            const container = player.getComponent("inventory").container
            const item = container.getItem(player.selectedSlotIndex)
            if (item && !BlockTypes.get(item.typeId)) return

            const type = item?.typeId || "air"

            if (this.db.fill.blocks[type]) {
                this.db.fill.blocks[type]++
                panel.removeElementsAfter(inputButton)
                addInputs()
            } else {
                addBlockButton(item, 1)
                this.db.fill.blocks[type] = 1
            }

            this.update()
            this.item.save()
        })

        const addBlockButton = (item, amount) => {
            const blockButton = new BlockIntElement(width, BUTTON_HEIGHT, item, amount)
            const type = item?.typeId || "air"
            panel.addElement(blockButton)

            blockButton.addOnClick(() => {
                if (blockButton.value === 0) {
                    panel.removeElementsAfter(inputButton)
                    delete this.db.fill.blocks[type]
                    addInputs()
                } else {
                    this.db.fill.blocks[type] = blockButton.value
                }

                this.item.save()
            })
        }

        const addInputs = () => {
            for (const [block, amount] of Object.entries(this.db.fill.blocks)) {
                const item = block === "air" ? null : new ItemStack(block)
                addBlockButton(item, amount)
            }
            this.update()
        }
        addInputs()

        this.update()
    }

    addMoreOptions() {
        const panel = new StackElement("vertical")
        const width = 35

        this.setTitle("Options")
        this.tabManager.addElement(panel)
        this.db.currentMenu = ["addMoreOptions"]
        this.item.save()

        const colorButton = new ButtonElement(width, BUTTON_HEIGHT, "Color")
        panel.addElement(colorButton)

        colorButton.addOnClick(() => {
            this.previousMenus.push(["addMoreOptions"])
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

        this.setTitle("Color")
        this.tabManager.removeElementsAfter(this.miscPanel)
        this.tabManager.addElement(verticalStack)
        this.db.currentMenu = ["addColorOptions"]
        this.item.save()

        for (const color of colors) {
            const panelColorPartId = panel + color
            const value = this.player.getDynamicProperty(panelColorPartId) ?? 190

            const colorButton = new KeyIntElement(
                width,
                BUTTON_HEIGHT,
                color,
                value,
                0,
                255,
            )
            verticalStack.addElement(colorButton)

            colorButton.addOnClick(() => {
                this.player.setDynamicProperty(panelColorPartId, colorButton.value)

                const r = this.player.getDynamicProperty(panel + "r") ?? 255
                const g = this.player.getDynamicProperty(panel + "g") ?? 255
                const b = this.player.getDynamicProperty(panel + "b") ?? 255

                this.screen.setColor({ r, g, b })
            })
        }

        this.update()
    }
}
