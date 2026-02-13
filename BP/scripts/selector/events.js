import { world, Player, system } from "@minecraft/server"
import { TYPE_IDS } from "../constants"
import { MinPriorityEvent, Event } from "../utils/events"
import { Screen } from "../ui/screen.js"

world.afterEvents.itemUse.subscribe(async (data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    const blockRaycast = source.getBlockFromViewDirection()
    const entityRaycast = source.getEntitiesFromViewDirection({ ignoreBlockCollision: true })

    source.release = false

    if (Screen.isPlayerLookingAtAnyScreen(source)) {
        SelectorEvents.click.emit({
            player: source,
            itemStack,
            blockRaycast,
            entityRaycast,
        })

        return
    }

    await system.waitTicks(5)

    if (source.release === true) {
        SelectorEvents.click.emit({
            player: source,
            itemStack,
            blockRaycast,
            entityRaycast,
        })
    } else {
        SelectorEvents.startUse.emit({
            player: source,
            itemStack,
            blockRaycast,
            entityRaycast,
        })
    }
})

world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    source.release = true

    SelectorEvents.releaseUse.emit({
        player: source,
        itemStack,
    })
})

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((data) => {
    const { player, previousSlotSelected } = data
    const container = player.getComponent("inventory").container
    const item = container.getItem(previousSlotSelected)

    if (item?.typeId !== TYPE_IDS.SELECT_ITEM) return

    player.release = true

    SelectorEvents.releaseUse.emit({
        player,
    })
})

world.afterEvents.entitySpawn.subscribe((data) => {
    const { entity } = data

    if (!(entity instanceof Player)) return

    entity.release = true

    SelectorEvents.releaseUse.emit({
        player: entity,
    })
})

export class SelectorEvents {
    /** @type {MinPriorityEvent<SelectorClickData>} */
    static click = new MinPriorityEvent()
    /** @type {Event<SelectorReleaseData>} */
    static releaseUse = new Event()
    /** @type {MinPriorityEvent<SelectorStartUseData>} */
    static startUse = new MinPriorityEvent()
}
