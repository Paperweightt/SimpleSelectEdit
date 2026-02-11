import { SelectorEvents } from "./events"
import { PACK_ID } from "../constants"

export class SelectItem {
    static events = SelectorEvents
    static propertyId = PACK_ID + ":data"
    static defaultData = {
        previousMenus: [],
        currentMenu: ["addMainPanel"],
    }

    /**
     * @param {import("@minecraft/server").ContainerSlot} slot
     */
    constructor(slot) {
        this.slot = slot
        this.data = this.getData()
    }

    getData() {
        const data = this.slot.getDynamicProperty(SelectItem.propertyId)

        if (!data) return SelectItem.defaultData

        return JSON.parse(data)
    }

    save() {
        this.slot.setDynamicProperty(SelectItem.propertyId, JSON.stringify(this.data))
    }
}
