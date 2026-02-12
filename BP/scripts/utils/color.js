export class Color {
    /**
     * @param {import('@minecraft/server').Player} player
     * @returns {import("@minecraft/server").RGB}
     */
    static player(player, saturation, lightness) {
        const hue = Color.hashPlayerName(player) * 360

        return this.hslToRGB(hue, saturation, lightness)
    }

    /**
     * @param {number} h
     * @param {number} s
     * @param {number} l
     * @returns {import("@minecraft/server").RGB}
     */
    static hslToRGB(h, s, l) {
        h = h / 360
        s = s / 100
        l = l / 100

        function f(n) {
            const k = (n + h * 12) % 12
            const a = s * Math.min(l, 1 - l)
            return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
        }

        const red = f(0)
        const green = f(8)
        const blue = f(4)

        return { red, green, blue }
    }

    /**
     * @param {import('@minecraft/server').Player} player
     * @returns {number}
     */
    static hashPlayerName(player) {
        const str = player.name
        let seed = 0

        for (let i = 0; i < str.length; i++) {
            seed += str.charCodeAt(i) * (i + 1) ** 2
        }

        let state = seed % 2147483647

        state = (state * 16807) % 2147483647
        state = (state * 16807) % 2147483647
        state = (state * 16807) % 2147483647
        state = (state * 16807) % 2147483647

        return (state - 1) / 2147483646
    }
}

console.log(Color.hashPlayerName({ name: "Paperweightt192" }))
