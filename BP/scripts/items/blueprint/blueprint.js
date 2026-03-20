import { ItemStack, system, world } from "@minecraft/server"
import { BLOCK_PARTICLE, PACK_ID, TYPE_IDS } from "../../constants"
import { Vector } from "../../utils/vector"
import { Particle } from "../../utils/particle"
import { BlockId } from "../../utils/blockId.js"
import { Edit } from "../../edit/index.js"

/** @import { SelectionGroup } from "../../selection/selectionGroup.js"  */

world.afterEvents.itemUse.subscribe((data) => {
    const { itemStack, source } = data
    if (itemStack.typeId !== TYPE_IDS.BLUEPRINT_ITEM) return

    const rayHit = source.getBlockFromViewDirection()

    if (!rayHit) return

    const offset = Blueprint.getOffset(itemStack, rayHit.block.location, rayHit.face)

    Blueprint.place(itemStack, source, offset)
})

export class Blueprint extends ItemStack {
    static runInterval() {
        for (const player of world.getAllPlayers()) {
            const container = player.getComponent("inventory").container
            const itemStack = container.getItem(player.selectedSlotIndex)
            const dimension = player.dimension

            if (itemStack?.typeId !== TYPE_IDS.BLUEPRINT_ITEM) continue

            const selections = Blueprint.parseSelections(itemStack)
            const rayHit = player.getBlockFromViewDirection()

            if (!rayHit) continue

            const offset = Blueprint.getOffset(
                itemStack,
                rayHit.block.location,
                rayHit.face,
            )

            for (const selection of selections) {
                const location = Vector.add(offset, selection.location).round()
                const size = selection.size
                Particle.boxEdges(TYPE_IDS.LINE, location, size, dimension)
                Particle.boxFaces(BLOCK_PARTICLE, location, size, dimension)
            }
        }
    }

    /**
     * @param {import("@minecraft/server").ItemStack} itemStack
     * @param {Vector} location
     * @param {import("@minecraft/server").Direction} direction
     */
    static getOffset(itemStack, location, direction) {
        const size = new Vector(Blueprint.parseSize(itemStack))
        const faceVector = Vector.stringToVector(direction)
        const offset = Vector.add(location, Vector.multiply(faceVector, size).divide(2))

        if (faceVector.coordinateSum() === 1) {
            offset.add(faceVector)
        }

        return offset
    }

    /**
     * @param {import("@minecraft/server").ItemStack} itemStack
     * @param {import("@minecraft/server").Player} player
     * @param {Vector} offest
     */
    static async place(itemStack, player, offset) {
        const propertyId = PACK_ID + ":blocks"
        const encodedPermutations = JSON.parse(
            itemStack.getDynamicProperty(propertyId) || "{}",
        )

        const runResult = await Edit.playerRunAndSave(player.id, "placeBlueprint", {
            encodedPermutations: encodedPermutations,
            dimension: player.dimension,
            selections: this.parseSelections(itemStack),
            location: offset,
        })

        player.sendMessage(`${runResult.metrics.blocks} blocks filled`)
    }

    /**
     * @param {import("@minecraft/server").ItemStack} itemStack
     * @return {{location:Vector,size:Vector}[]}
     */
    static parseSelections(itemStack) {
        const propertyId = PACK_ID + ":selections"
        const snapshots = JSON.parse(
            itemStack.getDynamicProperty(propertyId) || "[]",
        ).map(([location, size]) => {
            return { location, size }
        })

        return snapshots
    }

    /**
     * @param {import("@minecraft/server").ItemStack} itemStack
     * @return {Vector}
     */
    static parseSize(itemStack) {
        const propertyId = PACK_ID + ":size"
        return itemStack.getDynamicProperty(propertyId)
    }

    /** @param {SelectionGroup} selectionGroup */
    constructor(selectionGroup, name) {
        super(TYPE_IDS.BLUEPRINT_ITEM, 1)

        this.dimension = selectionGroup.dimension
        this.selectionGroup = selectionGroup
        this.selections = selectionGroup.selections

        this.setSelections()
        this.setSize()
        this.setBlocks()

        this.nameTag = `§rBlueprint (${name})`
    }

    setSelections() {
        const center = this.selectionGroup.getCenter()
        const snapshots = this.selections.map((selection) => [
            Vector.subtract(selection.location, center),
            selection.size,
        ])

        this.setDynamicProperty(PACK_ID + ":selections", JSON.stringify(snapshots))
    }

    setSize() {
        this.setDynamicProperty(PACK_ID + ":size", this.selectionGroup.getSize())
    }

    setBlocks() {
        this.setDynamicProperty(PACK_ID + ":blocks", JSON.stringify(this.getBlocksZip()))
    }

    /** @return {Iterator.<import("@minecraft/server").Block>} */
    *getBlockIterator() {
        for (const selection of this.selections) {
            for (let x = 0; x < selection.size.x; x++) {
                for (let y = 0; y < selection.size.y; y++) {
                    for (let z = 0; z < selection.size.z; z++) {
                        const location = new Vector(x, y, z).add(selection.location)

                        yield this.dimension.getBlock(location)
                    }
                }
            }
        }
    }

    getBlocksZip() {
        const changes = {}
        let i = 0

        let prevId
        const addChange = (id, i) => {
            if (prevId === id) return

            if (!changes[id]) {
                changes[id] = [i]
            } else {
                changes[id].push(i)
            }

            prevId = id
        }

        for (const block of this.getBlockIterator()) {
            let oldPermutationId = BlockId.get(block.permutation)

            addChange(oldPermutationId, i++)
        }

        return changes
    }
}

system.runInterval(Blueprint.runInterval)
