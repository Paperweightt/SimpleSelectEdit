import { world, Player } from "@minecraft/server"

Player.prototype.customIsShifting = false

world.afterEvents.playerButtonInput.subscribe((data) => {
    const { button, newButtonState, player } = data

    if (player.clientSystemInfo.platformType === "Desktop") {
        if (button === "Sneak") {
            if (newButtonState === "Released") player.customIsShifting = false
            if (newButtonState === "Pressed") player.customIsShifting = true
        }
    } else {
        if (player.isFlying) {
            if (button === "Sneak") {
                if (newButtonState === "Released") player.customIsShifting = false
                if (newButtonState === "Pressed") player.customIsShifting = true
            }
        } else {
            player.customIsShifting = player.isSneaking
        }
    }
})
