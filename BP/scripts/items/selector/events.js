import { world, system, Player } from "@minecraft/server"
import { TYPE_IDS, USE_DURATION } from "../../constants"
import { MinPriorityEvent, Event } from "../../utils/events"
import { Screen } from "../../ui/screen.js"
import { Vector } from "../../utils/vector.js"
import { PlayerUtils } from "../../utils/player.js"

world.afterEvents.itemUse.subscribe(async (data) => {
    const { source, itemStack } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    const blockRaycast = source.getBlockFromViewDirection()
    const initialViewDirection = source.getViewDirection()
    const viewStart = PlayerUtils.getEyeLocation(source)

    if (Screen.isPlayerLookingAtAnyScreen(source)) {
        SelectorEvents.click.emit({
            player: source,
            viewDirection: initialViewDirection,
            viewStart: viewStart,
            itemStack,
            blockRaycast,
        })

        source.onRelease = "cancel"

        return
    }

    source.onRelease = "click"

    const e = 0.05
    let ticks = 0
    source.dragId = system.runInterval(() => {
        const viewDirection = source.getViewDirection()
        const diff = Vector.distance(viewDirection, initialViewDirection)
        const velocity = new Vector(source.getVelocity()).abs().coordinateSum()

        if (diff > e || (velocity > e && ticks > 4)) {
            SelectorEvents.startUse.emit({
                player: source,
                viewDirection: initialViewDirection,
                viewStart: viewStart,
                itemStack,
                blockRaycast,
            })
            system.clearRun(source.dragId)
            source.onRelease = "release"
        }

        if (ticks++ > 30) {
            system.clearRun(source.dragId)
        }
    })
})

world.afterEvents.itemReleaseUse.subscribe((data) => {
    const { source, itemStack, useDuration } = data

    if (itemStack.typeId !== TYPE_IDS.SELECT_ITEM) return

    const ticks = USE_DURATION.SELECT_ITEM - useDuration

    if (source.onRelease === "cancel") return

    source.release = true

    if (ticks < 30 && source.onRelease === "click") {
        const blockRaycast = source.getBlockFromViewDirection()
        const entityRaycast = source.getEntitiesFromViewDirection({
            ignoreBlockCollision: true,
        })

        system.clearRun(source.dragId)

        SelectorEvents.click.emit({
            player: source,
            itemStack,
            blockRaycast,
            entityRaycast,
        })
    } else if (source.onRelease === "release") {
        SelectorEvents.releaseUse.emit({
            player: source,
            itemStack,
        })
    }
})

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((data) => {
    const { player, previousSlotSelected } = data
    const container = player.getComponent("inventory").container
    const item = container.getItem(previousSlotSelected)

    if (item?.typeId !== TYPE_IDS.SELECT_ITEM) return

    SelectorEvents.releaseUse.emit({
        player,
    })
})

world.afterEvents.entitySpawn.subscribe((data) => {
    const { entity } = data

    if (!(entity instanceof Player)) return

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
