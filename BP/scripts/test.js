import { system, BlockPermutation } from "@minecraft/server"
import { blockData } from "./generated/friendlyBlockColors.js"

system.run(() => {
    for (const block of blockData) {
        try {
            BlockPermutation.resolve(block.name)
        } catch (error) {
            console.log(block.name)
        }
    }
})
