import { system, world, BlockTypes, ItemStack } from "@minecraft/server"
import { Vector } from "../util/vector"
import { Screen } from "../ui/screen"
import { StackElement, ButtonElement, TextElement, Element } from "../ui/screenElements"
import { Edit } from "../edit/index.js"
import {
    BlockButtonElement,
    BlockIntElement,
    KeyIntElement,
    StructureIntElement,
} from "./customElements"
import { Shape } from "./shape"
import { PointTool } from "./item"
import { ModalFormData } from "@minecraft/server-ui"
import { BackPanel } from "./backPanel"

export const BUTTON_WIDTH = 54
export const BUTTON_HEIGHT = 13

export class BuildToolMenu {
    static list = {}

    static remove(id) {
        const menu = BuildToolMenu.get(id)

        if (!menu) return false

        menu.unlockItem()
        menu.savePreviousStates()
        menu.screen.remove()
        if (menu.backPanel) menu.backPanel.remove()

        delete BuildToolMenu.list[id]
        return true
    }

    /** @returns {BuildToolMenu} */
    static get(id) {
        return this.list[id]
    }

    /** @returns {BuildToolMenu[]} */
    static getMenus() {
        return Object.values(this.list)
    }

    constructor(player, location, dimension) {
        const container = player.getComponent("inventory").container

        this.viewQuery = { name: player.name }
        this.rotation = { x: Math.trunc(player.getRotation().y + 90), y: 0 }
        this.location = location
        this.dimension = dimension
        this.slot = container.getSlot(player.selectedSlotIndex)
        this.item = new PointTool(this.slot, player)
        /** @type {import("@minecraft/server").Player}*/
        this.player = player
        this.id = player.id
        this.previousMenus = this.item.previousMenus
        this.lockItem()
        this.initScreen()
        this.initBackPanel()
        this.runInterval()

        BuildToolMenu.list[this.id] = this
    }

    async update() {
        await this.screen.update()
        this.updateBackPanel()
    }

    savePreviousStates() {
        this.item.previousMenus = this.previousMenus
        this.item.save()
    }

    remove() {
        BuildToolMenu.remove(this.id)
    }

    resume() {
        const [fn, ...args] = this.item.currentMenu
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
        this.resume()
    }

    initBackPanel() {
        this.backPanel = new BackPanel(this.location.copy(), this.dimension)
        this.backPanel.setRotation({
            y: Math.round(this.rotation.y),
            x: Math.round(this.rotation.x),
        })

        this.updateBackPanel()
    }

    addMiscButtons(update = true) {
        this.miscPanel = new StackElement("vertical")
        this.tabManager.addElement(this.miscPanel)

        const closeButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "x")
        closeButton.addOnClick(() => {
            BuildToolMenu.remove(this.id)
        })
        closeButton.textElement.offset.y++
        closeButton.textElement.update()
        this.miscPanel.addElement(closeButton)

        const undoButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "u")
        undoButton.addOnClick(async ({ player }) => {
            const { blocks } = await Edit.playerUndoRecent(player)

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
        const width = 48
        const panel = new StackElement("vertical")

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addMainPanel"]
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

        const addButton = (name) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.item.mode = name.toLowerCase()
                this.item.save()
            })
            panel.addElement(button)
        }

        addButtonWithUi("Fill", "addFillPanel")
        addButtonWithUi("Smooth", "addSmoothOptions")
        addButtonWithUi("Struct", "addStructureOptions")
        addButton("Teleport")
        addButtonWithUi("Extrude", "addExtrudeOptions")
        addButtonWithUi("Options", "addMoreOptions")

        this.update()
    }

    addExtrudeOptions() {
        const panel = new StackElement("vertical")
        const width = BUTTON_WIDTH

        this.tabManager.addElement(panel)
        this.item.mode = "extrude"
        this.item.currentMenu = ["addExtrudeOptions"]
        this.item.save()

        const def = this.item.extrude.maxBlocks
        const keyInt = new KeyIntElement(width, BUTTON_HEIGHT, "d", def)
        panel.addElement(keyInt)

        keyInt.addOnClick(() => {
            this.item.extrude.maxBlocks = keyInt.value
            this.item.save()
        })

        const button = new ButtonElement(width, BUTTON_HEIGHT, "Filter")
        button.addOnClick(() => {
            this.tabManager.removeElementsAfter(this.miscPanel)
            this.addFilterOptions("extrude")
            this.previousMenus.push(["addExtrudeOptions"])
        })
        panel.addElement(button)

        this.update()
    }

    addStructureOptions() {
        const panel = new StackElement("vertical")
        const width = 45

        this.tabManager.addElement(panel)
        this.item.mode = "structure"
        this.item.currentMenu = ["addStructureOptions"]
        this.item.save()

        const addButton = (name, callback) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.tabManager.removeElementsAfter(this.miscPanel)
                this[callback]()
                this.previousMenus.push(["addStructureOptions"])
            })
            panel.addElement(button)
        }

        addButton("Inputs", "addStructureInputsPanel")
        addButton("Rotation", "addStructRotationOptions")
        addButton("Mirror", "addMirrorOptions")
        addButton("Center", "addCenterOptions")

        const air = this.item.structure.air
        const value = air ? "on" : "off"
        const button = new ButtonElement(width, BUTTON_HEIGHT, `Air: ${value}`)

        panel.addElement(button)

        button.addOnClick(() => {
            this.item.structure.air = !this.item.structure.air
            const value = this.item.structure.air ? "on" : "off"
            button.textElement.string = `Air: ${value}`
            button.textElement.update()
            this.screen.update()
            this.item.save()
        })

        this.update()
    }

    addCenterOptions() {
        const panel = new StackElement("vertical")
        const width = 29

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addCenterOptions"]
        this.item.save()

        const addButton = (name) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.item.structure.center = name
                this.item.save()
            })
            panel.addElement(button)
        }

        addButton("xz")
        addButton("xyz")

        this.update()
    }

    addStructRotationOptions() {
        const panel = new StackElement("vertical")
        const width = 29

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addStructRotationOptions"]
        this.item.save()

        const addButton = (name) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.item.structure.rotation = name
                this.item.save()
            })
            panel.addElement(button)
        }

        addButton("none")
        addButton("rand")
        addButton("90")
        addButton("180")
        addButton("270")

        this.update()
    }

    addMirrorOptions() {
        const panel = new StackElement("vertical")
        const width = 29

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addMirrorOptions"]
        this.item.save()

        const addButton = (name) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.item.structure.mirror = name
                this.item.save()
            })
            panel.addElement(button)
        }

        addButton("none")
        addButton("rand")
        addButton("xz")
        addButton("x")
        addButton("z")

        this.update()
    }

    addStructureInputsPanel() {
        const panel = new StackElement("vertical")
        const structures = world.structureManager
            .getWorldStructureIds()
            .filter((id) => !id.startsWith("bastion/"))

        const width =
            structures
                .map((id) => (id.startsWith("mystructure:") ? id.substring(12) : id))
                .map((id) => TextElement.getLinePixelLength(id))
                .reduce((a, b) => Math.max(a, b), 0) + 30

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addStructureInputsPanel"]
        this.item.save()

        const addElements = () => {
            for (const id of structures) {
                const displayName = id.startsWith("mystructure:") ? id.substring(12) : id
                const structurePanel = new StackElement("horizontal")
                const int = this.item.structure.list[id] ?? 0
                const rollMenu = new StructureIntElement(width, BUTTON_HEIGHT, displayName, int)
                const removeButton = new ButtonElement(BUTTON_HEIGHT, BUTTON_HEIGHT, "x")

                removeButton.addOnClick(() => {
                    delete this.item.structure.list[id]
                    world.structureManager.delete(id)
                    panel.removeAllElements()
                    this.update()
                    addElements()
                })
                removeButton.textElement.offset.y++
                removeButton.textElement.update()

                panel.addElement(structurePanel)
                structurePanel.addElement(removeButton)
                structurePanel.addElement(rollMenu)

                rollMenu.addOnClick(() => {
                    if (!rollMenu.value) {
                        delete this.item.structure.list[id]
                    } else {
                        this.item.structure.list[id] = rollMenu.value
                    }
                    this.item.save()
                })
            }
        }
        addElements()

        this.update()
    }

    addMoreOptions() {
        const panel = new StackElement("vertical")
        const width = 52

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addMoreOptions"]
        this.item.save()

        const def = this.item.pointer.distance
        const keyInt = new KeyIntElement(width, BUTTON_HEIGHT, "d", def)
        panel.addElement(keyInt)

        keyInt.addOnClick(() => {
            this.item.pointer.distance = keyInt.value
            this.item.save()
        })

        const block = this.item.pointer.block
        const value = block ? "on" : "off"

        const button = new ButtonElement(width, BUTTON_HEIGHT, `Block: ${value}`)
        panel.addElement(button)

        button.addOnClick(() => {
            this.item.pointer.block = !this.item.pointer.block
            const value = this.item.pointer.block ? "on" : "off"
            button.textElement.string = `Block: ${value}`
            button.textElement.update()
            this.screen.update()
            this.item.save()
        })

        const renameButton = new ButtonElement(width, BUTTON_HEIGHT, "Rename")
        panel.addElement(renameButton)

        renameButton.addOnClick(({ player }) => {
            this.reName(player)
        })

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
        this.item.currentMenu = ["addFilterOptions", mode]
        this.item.save()

        const addButton = (name, callback, type) => {
            const button = new ButtonElement(width, BUTTON_HEIGHT, name)
            button.addOnClick(() => {
                this.item[mode].filter = name.toLowerCase()
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
        const list = this.item[mode][type]
        const air = "minecraft:air"
        const panel = new StackElement("vertical")

        this.item.currentMenu = ["addBlockList", type, mode]
        this.item.save()
        this.tabManager.removeElementsAfter(this.miscPanel)
        this.tabManager.addElement(panel)
        panel.addElement(inputButton)

        const addInputs = () => {
            for (const block of this.item[mode][type]) {
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

            this.item.slot.nameTag = name
        })
    }

    addSmoothOptions() {
        const verticalStack = new StackElement("vertical")
        this.tabManager.addElement(verticalStack)
        this.item.mode = "smooth"
        this.item.currentMenu = ["addSmoothOptions"]
        this.item.save()

        const def = this.item.smooth.diameter
        const keyIntElement = new KeyIntElement(BUTTON_WIDTH, BUTTON_HEIGHT, "d", def, 1, 25)

        verticalStack.addElement(keyIntElement)
        keyIntElement.addOnClick(() => {
            this.item.smooth.diameter = keyIntElement.value
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
        this.item.currentMenu = ["addFillPanel"]
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

        this.item.mode = "fill"
        this.item.save()

        const meshValue = this.item.fill.mesh ? "on" : "off"
        const meshButton = new ButtonElement(width, BUTTON_HEIGHT, `Mesh: ${meshValue}`)

        meshButton.addOnClick(() => {
            this.item.fill.mesh = !this.item.fill.mesh
            const value = this.item.fill.mesh ? "on" : "off"
            meshButton.textElement.string = `Mesh: ${value}`
            meshButton.textElement.update()
            this.screen.update()
            this.item.save()
        })
        fillPanel.addElement(meshButton)

        const fullValue = this.item.fill.full ? "on" : "off"
        const fullButton = new ButtonElement(width, BUTTON_HEIGHT, `Full: ${fullValue}`)

        fullButton.addOnClick(() => {
            this.item.fill.full = !this.item.fill.full
            const fullValue = this.item.fill.full ? "on" : "off"
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
        this.item.currentMenu = ["addShapeOptions"]
        this.item.save()

        for (const name of Shape.getNames()) {
            const button = new ButtonElement(BUTTON_WIDTH, BUTTON_HEIGHT, name)

            button.addOnClick(() => {
                this.item.fill.shape = name
                this.item.save()
                this.tabManager.removeElementsAfter(this.miscPanel)
                this.previousMenus.push(["addShapeOptions"])

                this.addShapeParameterOptions(name)
            })
            vertStack.addElement(button)
        }

        this.update()
    }

    addRotationOptions() {
        const options = ["y", "p", "r"]
        const vertStack = new StackElement("vertical")
        const width = 53

        this.tabManager.addElement(vertStack)
        this.item.currentMenu = ["addRotationOptions"]
        this.item.save()

        for (const option of options) {
            const char = option.charAt(0)
            const def = this.item.fill.rotation[option]
            const keyIntElement = new KeyIntElement(width, BUTTON_HEIGHT, char, def)

            vertStack.addElement(keyIntElement)

            keyIntElement.addOnClick(() => {
                this.item.fill.rotation[option] = keyIntElement.value
                this.item.save()
            })
        }

        this.update()
    }

    addTexturePanel() {
        const width = 37
        const panel = new StackElement("vertical")

        this.tabManager.addElement(panel)
        this.item.currentMenu = ["addTexturePanel"]
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
                    delete this.item.fill.texture[type]
                    addInputs()
                } else {
                    this.item.fill.texture[type] = blockButton.value
                }

                this.item.save()
            })
        }

        const addInputs = () => {
            for (const [block, amount] of Object.entries(this.item.fill.texture)) {
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

            if (this.item.fill.texture[type]) {
                this.item.fill.texture[type]++
                panel.removeElementsAfter(inputButton)
                addInputs()
            } else {
                addBlockButton(item, 1)
                this.item.fill.texture[type] = 1
            }

            this.update()
            this.item.save()
        })
    }

    addShapeParameterOptions(shape) {
        const verticalStack = new StackElement("vertical")
        const width = 53

        this.item.currentMenu = ["addShapeParameterOptions", shape]
        this.item.save()
        this.tabManager.addElement(verticalStack)
        if (!this.item.fill[shape]) this.item.fill[shape] = {}

        for (const parameter of Shape._shapes[shape].parameters) {
            if (this.item.fill[shape][parameter] === undefined) {
                this.item.fill[shape][parameter] = 5
                this.item.save()
            }
            const def = this.item.fill[shape][parameter]
            const char = parameter.charAt(0)
            const keyIntElement = new KeyIntElement(width, BUTTON_HEIGHT, char, def, 1)
            verticalStack.addElement(keyIntElement)

            keyIntElement.addOnClick(() => {
                this.item.fill[shape][parameter] = keyIntElement.value
                this.item.save()
            })
        }

        this.update()
    }

    addColorOptions() {
        const verticalStack = new StackElement("vertical")
        const colors = ["r", "g", "b"]
        const width = 53
        const panel = "textColor"

        this.tabManager.removeElementsAfter(this.miscPanel)
        this.previousMenus.push(["addMoreOptions"])
        this.tabManager.addElement(verticalStack)
        this.item.currentMenu = ["addColorOptions"]
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
