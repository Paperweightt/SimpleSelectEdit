import { PlayerUtils } from "../../utils/player.js"
import { ActionFormData } from "@minecraft/server-ui"
import { Edit } from "../../edit/index.js"
import { world, system } from "@minecraft/server"
import { SelectionGroup } from "../../selection/selectionGroup.js"

export class UndoMenu {
    static ENTRIES_PER_PAGE = 100
    static DELAY = 20

    /** @type {import("@minecraft/server").Player} */
    constructor(player) {
        this.player = player
    }

    mainMenu() {
        const form = new ActionFormData().title("Undo History")
        const playerIds = PlayerUtils.id.getAll()

        for (const { name, id } of playerIds) {
            const undoAmount = Edit.getPlayerUndoIds(id).length
            form.button(`${name} (${undoAmount})`)
        }

        const mb = Math.round(world.getDynamicPropertyTotalByteCount() / 1e4) / 100

        form.button(`§4Delete History §r(${mb}mb)`)

        form.show(this.player).then((response) => {
            if (response.canceled) return

            if (response.selection < playerIds.length) {
                this.playerUndoMenu(playerIds[response.selection])
            } else {
                Edit.deleteHistory()
            }
        })
    }

    /**
     * @param {{name:string,id:string}} playerIds
     */
    playerUndoMenu(playerIds) {
        const undoIdList = Edit.getPlayerUndoIds(playerIds.id)

        if (!undoIdList.length) return

        const undoDataList = undoIdList
            .slice(-UndoMenu.ENTRIES_PER_PAGE)
            .reverse()
            .map((id) => {
                return {
                    data: Edit.getFromHistory(id),
                    id,
                }
            })

        const form = new ActionFormData().title(playerIds.name)

        for (const { data, id } of undoDataList) {
            form.button(`${data.type} (id:${id})`)
        }

        form.show(this.player).then((response) => {
            if (response.canceled) return

            const { data, id } = undoDataList[response.selection]

            this.undoMenu(
                data,
                `${data.type} (id:${id})`,
                playerIds,
                response.selection + 1,
            )
        })
    }

    globalUndoMenu() {
        const undoIdList = Edit.getAllHistoryIds()

        if (!undoIdList.length) return

        const undoDataList = undoIdList
            .slice(-UndoMenu.ENTRIES_PER_PAGE)
            .reverse()
            .map((id) => {
                return {
                    data: Edit.getFromHistory(id),
                    id,
                }
            })

        const form = new ActionFormData().title("Global Undo Menu")

        for (const { data, id } of undoDataList) {
            form.button(`${data.type} (id:${id})`)
        }

        form.show(this.player).then((response) => {
            if (response.canceled) return

            const { data, id } = undoDataList[response.selection]

            this.undoMenu(data, data.type, id, index)
        })
    }

    /**
     * @param {import("../../edit/types.js").ZippedUndoCtx} data
     * @param {string} title
     * @param {{name:string,id:string}} playerIds
     * @param {number} undos
     */
    undoMenu(data, title, playerIds, undos) {
        const form = new ActionFormData()
            .title(title)
            .body(JSON.stringify(data, null, 2))
            .button("Confirm")

        form.show(this.player).then(async (response) => {
            if (response.canceled) return

            for (let i = 0; i < undos; i++) {
                await Edit.playerUndoRecent(playerIds.id)

                const group = SelectionGroup.get(playerIds.id)

                if (group) {
                    group.reloadArrowLocations()
                    group.reloadCoreLocation()
                    group.updateOriginalLocations()
                }

                await system.waitTicks(UndoMenu.DELAY)
            }
        })
    }
}
