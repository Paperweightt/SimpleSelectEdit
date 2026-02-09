import { BlockTypes, system, world, EnchantmentTypes } from "@minecraft/server"
import { Vector } from "./vector"
import { DeathOnReload } from "./deathOnReload"
import { TYPE_IDS, PACK_ID } from "../constants"

export class ItemDisplay {
    static animations = {
        button: {
            rotation: [70, 0, -135],
            position: [-1.1 - 2.3, -10 - 1, -1.8 - 2.5],
        },
        carpet: {
            rotation: [-20, -45, 0],
            position: [-3.4 - 6, 2 - 7.9, 0.5 + 8.5],
        },
        log: {
            rotation: [-110, -1.27, 45],
            position: [-3.8 - 7.3, -0.7 - 10, -1.68 + 4.4],
        },
        // custom_block: {
        //     rotation: [-15, -135, 0],
        //     position: [-3.8, 4.65, -6.53],
        // },
        trapdoor: {
            rotation: [-110, -1.27, 135],
            position: [-10.9, 6.9 + 4, 0.55 + 2.4],
        },
        wall: {
            rotation: [-20, -45, 0],
            position: [-4.3 - 14.8, 2 - 7, -0.3 + 3],
            scale: 0.65,
        },
        chest: {
            rotation: [-20, 45, 0],
            position: [7.15 + 3.6, 1 + 2.9, 4.5 + 6],
            scale: 1,
        },
        glass_pane: {
            rotation: [-20, 90 + 45, 0],
            position: [10.8, 4 - 0.7, 0.5 - 11.5],
            scale: 0.85,
        },
        fence: {
            rotation: [-20, 135, 0],
            position: [10.7, 3, -10.7],
            scale: 0.85,
        },
        fence_gate: {
            rotation: [-20, -45, 0],
            position: [-11, 0.1, 10.9],
        },
        block: {
            rotation: [-20, -135, 0],
            position: [-11, 3, -11],
        },
        head: {
            rotation: [-20, -135, 0],
            position: [-3.7, 5, -7.8],
            scale: 1.5,
        },
        item: {
            rotation: [-74.5, -11.5, -15],
            position: [-3, -15.3, 3.7],
            scale: 0.666,
        },
        pressure_plate: {
            rotation: [-20, -45, 0],
            position: [-4.3 - 7.5, 4.7 - 3, 1 + 8.5],
        },
        copper_golem_statue: {
            rotation: [-75, -17, 10],
            position: [-7.4, -10, 3],
            scale: 0.7,
        },
        weapon: {
            // imperfect
            rotation: [0, -90, 234],
            // rotation2: [2.5, 5, 0],
            // rotation2: [152.49955354543684, -84.41125019010956, 26.608723190535052],
            position: [1, 1, 0.3],
            scale: 0.37,
        },
        lightning_rod: {
            // rotation: [340, 315, 315],
            rotation: [-94.29424461403968, -59.58401260751233, -9.029854931284973],
            position: [-3.4, 1, 1.9],
            scale: 0.85,
        },
    }

    static itemToAnimation = {
        // custom
        "minecraft:spore_blossom": {
            rotation: [-20, -135, 0],
            rotation2: [90, 0, 0],
            position: [-11.5, -11.5, 2],
            scale: 0.8,
        },
        "minecraft:enchanting_table": {
            rotation: [-20, -135, 0],
            position: [-4 - 7, 3, -7 - 3.9],
        },
        "minecraft:piglin_head": {
            // custom model
            rotation: [-20, -135, 0],
            position: [3.5 - 10.5, 2, -9.45 - 1.8],
            scale: 1.3,
        },
        "minecraft:dragon_head": {
            // custom model
            rotation: [-20, -135, 0],
            position: [3.5 - 10.5, 2, -6.15 - 9],
            scale: 0.9,
        },
        "minecraft:breeze_rod": {
            rotation: [0, -96, 235],
            rotation2: [6, 0, 0],
            position: [7, 1.0 - 19, -0.5],
            scale: 0.42,
        },
        "minecraft:end_rod": {
            rotation: [-20, -45, -45],
            rotation2: [-30, 0, 0],
            position: [-3.4 - 6.5, -11, 1.9 + 4.5],
            scale: 0.85,
        },
        "minecraft:pointed_dripstone": {
            rotation: [0, 94, 90],
            rotation2: [2, 185, 0],
            position: [-7, -12.2, -0.3],
            scale: 0.45,
        },
        "minecraft:grindstone": {
            // custom model
            rotation: [-20, 135, 0],
            position: [10.5, 1, -11],
        },
        "minecraft:lectern": {
            // custom model
            // position: [-11, 3, -11],
            rotation: [-20, -45, 0],
            rotation2: [0, -90, 0],
            position: [0.2 - 11.2, 3, -11],
        },
        "minecraft:anvil": {
            // custom model
            rotation: [-20, 135, 0],
            position: [10.6, 3, -11.0],
        },
        "minecraft:carved_pumpkin": {
            rotation: [-20, -45, 0],
            position: [0.2 - 11.2, 3, 10.6],
        },
        "minecraft:lit_pumpkin": {
            rotation: [-20, 135, 0],
            position: [10.6, 3, -11.0],
        },
        "minecraft:shield": {
            // skip
            rotation: [0, 90, 90],
            position: [5.8, -13, -3],
            scale: 0.25,
        },
        "minecraft:banner": {
            // skip
            rotation: [-75, 168, -10],
            position: [9, -18.5, -3.8],
            scale: 0.65,
        },
        // position: [-6, +17, +0.9],
        "minecraft:arrow": {
            rotation: [-74.5, -12, -15],
            position: [-0, -1, 1.25],
            scale: 0.8,
        },
        "minecraft:warped_fungus_on_a_stick": {
            rotation: [0, 90, 40],
            rotation2: [2.5, 5, 0],
            position: [5.5, 4, 0],
            scale: 0.45,
        },
        "minecraft:carrot_on_a_stick": {
            rotation: [0, 90, 40],
            rotation2: [2.5, 5, 0],
            position: [6.5, 4, 0],
            scale: 0.45,
        },
        "minecraft:fishing_rod": {
            rotation: [0, 90, 40],
            rotation2: [2.5, 5, 0],
            position: [6.5, 4, 0],
            scale: 0.45,
        },
        "minecraft:conduit": {
            rotation: [-20, -45, 0],
            position: [0.2 - 11.2, 4.5, 6.8],
            scale: 1.8,
        },
        "minecraft:large_amethyst_bud": {
            rotation: [-74.5, -11.5, -15],
            position: [-6, -16.5, 4.9],
            scale: 0.75,
        },
        "minecraft:medium_amethyst_bud": {
            rotation: [-74.5, -11.5, -15],
            position: [-6, -16, 4.9],
            scale: 0.75,
        },
        "minecraft:small_amethyst_bud": {
            rotation: [-74.5, -11.5, -15],
            position: [-8.5, -16, 8.2],
            scale: 0.75,
        },
        "minecraft:heavy_core": {
            rotation: [-20, -45, 0],
            position: [-4, 6, -1.7],
            scale: 0.7,
        },
        "minecraft:decorated_pot": {
            // custom
            rotation: [-28, -44, -0.8],
            rotation2: [2.55, -0.8, 0],
            position: [-13, -2, 12.5],
            scale: 0.8,
        },
        "minecraft:snow_layer": {
            rotation: [-20, -45, 0],
            position: [-3.4 - 6, 1.8, 0.4 + 9],
            scale: 0.95,
        },

        "minecraft:jukebox": this.animations.log,

        // items - armor
        "minecraft:elytra": this.animations.item,

        // item - plants - ground cover
        "minecraft:short_grass": this.animations.item,
        "minecraft:tall_grass": this.animations.item,
        "minecraft:fern": this.animations.item,
        "minecraft:large_fern": this.animations.item,

        // item - plants - shrooms
        "minecraft:brown_mushroom": this.animations.item,
        "minecraft:red_mushroom": this.animations.item,
        "minecraft:crimson_fungus": this.animations.item,
        "minecraft:warped_fungus": this.animations.item,

        // item - plants - flowers
        "minecraft:torchflower": this.animations.item,
        "minecraft:open_eyeblossom": this.animations.item,
        "minecraft:closed_eyeblossom": this.animations.item,
        "minecraft:wither_rose": this.animations.item,
        "minecraft:pink_petals": this.animations.item,
        "minecraft:pitcher_plant": this.animations.item,
        "minecraft:peony": this.animations.item,
        "minecraft:rose_bush": this.animations.item,
        "minecraft:lilac": this.animations.item,
        "minecraft:dandelion": this.animations.item,
        "minecraft:poppy": this.animations.item,
        "minecraft:blue_orchid": this.animations.item,
        "minecraft:oxeye_daisy": this.animations.item,
        "minecraft:sunflower": this.animations.item,
        "minecraft:cornflower": this.animations.item,
        "minecraft:lily_of_the_valley": this.animations.item,
        "minecraft:azure_bluet": this.animations.item,

        // item - plants - other
        "minecraft:beetroot": this.animations.item,
        "minecraft:wheat": this.animations.item,
        "minecraft:sea_pickle": this.animations.item,
        "minecraft:nether_sprouts": this.animations.item,
        "minecraft:crimson_roots": this.animations.item,
        "minecraft:kelp": this.animations.item,
        "minecraft:mangrove_propagule": this.animations.item,
        "minecraft:deadbush": this.animations.item,
        "minecraft:pale_hanging_moss": this.animations.item,
        "minecraft:hanging_roots": this.animations.item,
        "minecraft:seagrass": this.animations.item,
        "minecraft:waterlily": this.animations.item,
        "minecraft:glow_lichen": this.animations.item,
        "minecraft:resin_clump": this.animations.item,
        "minecraft:sculk_vein": this.animations.item,
        "minecraft:nether_wart": this.animations.item,

        // item - blocks - redstone
        "minecraft:redstone_torch": this.animations.item,
        "minecraft:lever": this.animations.item,
        "minecraft:tripwire_hook": this.animations.item,
        "minecraft:hopper": this.animations.item,

        // item - blocks - light
        "minecraft:soul_torch": this.animations.item,
        "minecraft:torch": this.animations.item,
        // "minecraft:soul_lantern": this.animations.item,
        // "minecraft:lantern": this.animations.item,
        "minecraft:soul_campfire": this.animations.item,
        "minecraft:campfire": this.animations.item,

        // item - blocks - other
        "minecraft:frog_spawn": this.animations.item,
        "minecraft:unknown": this.animations.item,
        "minecraft:barrier": this.animations.item,
        "minecraft:sniffer_egg": this.animations.item,
        "minecraft:amethyst_cluster": this.animations.item,
        "minecraft:frame": this.animations.item,
        "minecraft:glow_frame": this.animations.item,
        "minecraft:chain": this.animations.item,
        "minecraft:bed": this.animations.item,
        "minecraft:brewing_stand": this.animations.item,
        "minecraft:cauldron": this.animations.item,
        "minecraft:flower_pot": this.animations.item,
        "minecraft:bell": this.animations.item,
        "minecraft:ladder": this.animations.item,
        "minecraft:web": this.animations.item,
        "minecraft:turtle_egg": this.animations.item,
        "minecraft:cake": this.animations.item,

        // item - weaponish
        "minecraft:trident": this.animations.item,
        "minecraft:shears": this.animations.item,
        "minecraft:flint_and_steel": this.animations.item,
        "minecraft:bow": this.animations.item,
        "minecraft:brush": this.animations.item,

        // weapons - item
        "minecraft:stick": this.animations.weapon,
        "minecraft:bone": this.animations.weapon,
        "minecraft:blaze_rod": this.animations.weapon,
        "minecraft:bamboo": this.animations.weapon,

        // update 1.21.71
        "minecraft:firefly_bush": this.animations.item,
        "minecraft:tall_dry_grass": this.animations.item,
        "minecraft:short_dry_grass": this.animations.item,
        "minecraft:wildflowers": this.animations.item,
        "minecraft:cactus_flower": this.animations.item,
        "minecraft:bush": this.animations.item,
        "minecraft:leaf_litter": this.animations.item,
    }

    static entityTypeId = TYPE_IDS.ITEM_DISPLAY

    /** @param {import('@minecraft/server').ItemStack} item */
    static getAnimation(item) {
        const typeId = item.typeId
        let animation = this.animations.item

        if (this.itemToAnimation[typeId]) {
            return this.itemToAnimation[typeId]
        }

        if (typeId.startsWith("minecraft:")) {
            if (BlockTypes.get(item.typeId)) {
                if (typeId.endsWith("chest")) return this.animations.chest
                animation = this.animations.block
            }
            if (typeId.endsWith("coral")) return this.animations.item
            if (typeId.endsWith("coral_fan")) return this.animations.item
            if (typeId.endsWith("sapling")) return this.animations.item
            if (typeId.endsWith("tulip")) return this.animations.item
            if (typeId.includes("vine")) return this.animations.item

            if (typeId.endsWith("wall")) return this.animations.wall
            if (typeId.includes("pane")) return this.animations.glass_pane
            if (typeId.endsWith("head") || typeId.endsWith("skull")) return this.animations.head
            if (typeId.endsWith("rail")) return this.animations.item

            if (typeId.endsWith("carpet") && !typeId.endsWith("moss_carpet"))
                return this.animations.carpet

            if (typeId.startsWith("light_block")) return this.animations.item
            if (typeId.endsWith("candle")) return this.animations.item

            if (typeId.endsWith("log")) return this.animations.log
            if (typeId.endsWith("hanging_sign")) return this.animations.item
            if (typeId.endsWith("lightning_rod")) return this.animations.lightning_rod
            if (typeId.endsWith("fence_gate")) return this.animations.fence_gate
            if (typeId.endsWith("fence")) return this.animations.fence
            if (typeId.endsWith("trapdoor")) return this.animations.trapdoor
            if (typeId.endsWith("_door")) return this.animations.item
            if (typeId.endsWith("button")) return this.animations.button
            if (typeId.endsWith("pressure_plate")) return this.animations.pressure_plate

            if (typeId.endsWith("lantern")) return this.animations.item
            if (typeId.endsWith("_bars")) return this.animations.item
            if (typeId.endsWith("_chain")) return this.animations.item
            if (typeId.endsWith("copper_golem_statue")) return this.animations.copper_golem_statue
        } else if (typeId.startsWith(PACK_ID + ":")) {
            if (item.typeId === PACK_ID + ":schematic_engraver") return this.animations.block
            if (item.typeId === PACK_ID + ":recipe_processor") return this.animations.block
            if (BlockTypes.get(item.typeId)) return this.animations.custom_block
        }

        /** @type {import('@minecraft/server').ItemEnchantableComponent} */

        const enchantable = item.getComponent("enchantable")
        if (!enchantable) return animation

        const unbreaking = EnchantmentTypes.get("unbreaking")
        const protection = EnchantmentTypes.get("protection")

        if (enchantable.canAddEnchantment({ level: 1, type: unbreaking })) {
            animation = this.animations.weapon
        }

        if (enchantable.canAddEnchantment({ level: 1, type: protection })) {
            animation = this.animations.item
        }

        return animation
    }

    /** @returns {ItemDisplay[]} */
    static getAll() {
        return Object.values(this.displays)
    }

    /**
     * @param {number} id
     * @returns {ItemDisplay}
     */
    static get(id) {
        return this.displays[id]
    }

    static displays = {}
    static id = 0

    firstLoad = true
    rotation = { x: 0, y: 0 }
    change = true
    animationType
    _data = 0
    _size = 1
    _item

    get item() {
        return this._item
    }

    /** @param {import('@minecraft/server').ItemStack} item*/
    set item(item) {
        if (item?.typeId !== this._item?.typeId) {
            this.change = true
        } else {
            const newEnchantable = item?.getComponent("enchantable")?.getEnchantments().length
            const oldEnchantable = this._item?.getComponent("enchantable")?.getEnchantments().length

            if (!newEnchantable !== !oldEnchantable) {
                this.change = true
            }
        }

        this._item = item
    }

    /**
     * @returns {number}
     */
    get size() {
        return this._size
    }

    /** @param {number} size*/
    set size(size) {
        if (this._size !== size) this.change = true
        this._size = size
    }

    /**
     * @returns {number}
     */
    get data() {
        return this._data || 0
    }

    /** @param {number} data*/
    set data(data) {
        if (this._data !== data) this.change = true
        this._data = data
    }

    /**
     * @param {Vector} location
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").ItemStack} item
     */
    constructor(location, dimension, item) {
        this.location = location
        /** @type {import('@minecraft/server').Dimension}*/
        this.dimension = dimension
        this.item = item
        this.id = ItemDisplay.id++

        ItemDisplay.displays[this.id] = this
    }

    load() {
        this.spawnEntity()
        if (!this.change) return

        // prevents animation from effecting the previous item
        // this.removeItem()

        this.animate()
        this.giveItem()

        this.change = false
    }

    removeItem() {
        this.entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 air`)
    }

    spawnEntity() {
        if (this.entity?.isValid) return
        this.entity = this.dimension.spawnEntity(ItemDisplay.entityTypeId, this.location)
        DeathOnReload.addEntity(this.entity)
    }

    getItemType() {
        let itemType = this.item?.typeId ?? "air"

        if (itemType === "minecraft:trident") {
            return PACK_ID + ":trident_display"
        } else if (itemType === "minecraft:spyglass") {
            return PACK_ID + ":spyglass_display"
        } else if (itemType === "minecraft:written_book") {
            return PACK_ID + ":written_book_display"
        } else if (itemType === "minecraft:crossbow") {
            return PACK_ID + ":crossbow_display"
        } else if (itemType === "minecraft:bow") {
            return PACK_ID + ":bow_display"
        }

        return itemType
    }

    giveItem() {
        const itemType = this.getItemType()
        let cmd

        if (itemType === "minecraft:enchanted_book") {
            cmd = `replaceitem entity @s slot.weapon.mainhand 1 ${itemType} 1 ${this.data}`
        } else if (this.item.getComponent("enchantable")?.getEnchantments().length) {
            const lootTable = `itemDisplay/enchanted_${itemType.split(":")[1]}`
            cmd = `loot replace entity @s slot.weapon.mainhand 1 loot "${lootTable}"`
        } else if (itemType.startsWith(PACK_ID + ":") && itemType.endsWith("_display")) {
            const lootTable = `itemDisplay/${itemType.split(":")[1]}`
            cmd = `loot replace entity @s slot.weapon.mainhand 1 loot "${lootTable}"`
        } else {
            cmd = `replaceitem entity @s slot.weapon.mainhand 1 ${itemType} 1 ${this.data}`
        }

        if (!this.entity.isValid) return

        try {
            this.entity.runCommand(cmd)
        } catch (e) {
            this.entity.runCommand(
                `replaceitem entity @s slot.weapon.mainhand 1 ptb:unknown_item 1`,
            )
        }
    }

    animate() {
        const anim = ItemDisplay.getAnimation(this.item)
        const sizeModifier = anim.scale ?? 1
        const size = this.size * sizeModifier

        this.entity.setProperty(PACK_ID + ":scale", size / 0.374)

        this.entity.setProperty(PACK_ID + ":rxrot", anim.rotation[0])
        this.entity.setProperty(PACK_ID + ":ryrot", anim.rotation[1])
        this.entity.setProperty(PACK_ID + ":rzrot", anim.rotation[2])

        this.entity.setProperty(PACK_ID + ":rxpos", anim.position[0] * size)
        this.entity.setProperty(PACK_ID + ":rypos", anim.position[1] * size)
        this.entity.setProperty(PACK_ID + ":rzpos", anim.position[2] * size)

        if (anim.rotation2) {
            this.entity.setProperty(PACK_ID + ":rxrot2", anim.rotation2[0])
            this.entity.setProperty(PACK_ID + ":ryrot2", anim.rotation2[1])
            this.entity.setProperty(PACK_ID + ":rzrot2", anim.rotation2[2])
        } else {
            this.entity.setProperty(PACK_ID + ":rxrot2", 0)
            this.entity.setProperty(PACK_ID + ":ryrot2", 0)
            this.entity.setProperty(PACK_ID + ":rzrot2", 0)
        }

        this.entity.setProperty(PACK_ID + ":yrot", this.rotation.y)
    }

    remove() {
        this.entity?.remove()
        delete ItemDisplay.displays[this.id]
    }
}

system.runInterval(() => {
    for (const display of ItemDisplay.getAll()) {
        const entity = display.entity
        if (!entity) continue
    }
})

world.beforeEvents.effectAdd.subscribe((data) => {
    const { entity } = data

    if (entity.typeId === ItemDisplay.entityTypeId) data.cancel = true
})

let onCooldown = false

world.afterEvents.pistonActivate.subscribe((data) => {
    const { dimension } = data

    if (onCooldown) return
    onCooldown = true
    system.runTimeout(() => {
        onCooldown = false
    }, 1)

    for (const display of ItemDisplay.getAll()) {
        if (!display.entity?.isValid) continue
        if (display.dimension.id !== dimension.id) continue
        const distance = Vector.distance(display.location, display.entity.location)
        if (distance < 0.0001) continue

        display.remove()
    }
})
