export class Color {
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {number} saturation - [[0 - 1]]
     * @param {number} lightness - [[0 - 1]]
     * @returns {import("@minecraft/server").RGB}
     */
    static playerHSL(player, saturation, lightness) {
        const hue = Color.hashPlayerName(player) * 360

        return this.hslToRGB(hue, saturation, lightness)
    }

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {number} chroma - saturation [[0 - ~0.3]]
     * @param {number} lightness - [[0 - 1]]
     * @returns {import("@minecraft/server").RGB}
     */
    static playerOklab(player, chroma, lightness) {
        const angle = Color.hashPlayerName(player) * 360

        return this.oklchToRgb(lightness, chroma, angle)
    }

    /**
     * @param {number} h - [[0 - 1]]
     * @param {number} s - [[0 - 1]]
     * @param {number} l - [[0 - 1]]
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

    /**
     * @param {number} L - lightness [[0 - 1]]
     * @param {number} C - chroma | saturation [[0- ~0.3]]
     * @param {number} h - hue angle [[0-360]]
     */
    static oklchToRgb(L, C, h) {
        const rad = (h * Math.PI) / 180

        const a = C * Math.cos(rad)
        const b = C * Math.sin(rad)

        return this.oklabToRgb(L, a, b)
    }

    /**
     * @param {number} L - black to white [[0 - 1]]
     * @param {number} a - green to red [[-0.5 - 0.5]]
     * @param {number} b - blue to yellow [[-0.5 - 0.5]]
     * @returns {import("@minecraft/server").RGB}
     */
    static oklabToRgb(L, a, b) {
        // 1) Convert OKLab → LMS (nonlinear)
        const l_ = L + 0.3963377774 * a + 0.2158037573 * b
        const m_ = L - 0.1055613458 * a - 0.0638541728 * b
        const s_ = L - 0.0894841775 * a - 1.291485548 * b

        // 2) Cube
        const l = l_ * l_ * l_
        const m = m_ * m_ * m_
        const s = s_ * s_ * s_

        // 3) Convert LMS → linear RGB
        let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
        let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
        let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

        // 4) Linear RGB → sRGB
        r = linearToSrgb(r)
        g = linearToSrgb(g)
        b2 = linearToSrgb(b2)

        function linearToSrgb(c) {
            return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        }

        function clamp(x, min, max) {
            return Math.min(Math.max(x, min), max)
        }

        return { red: clamp(r, 0, 1), green: clamp(g, 0, 1), blue: clamp(b2, 0, 1) }
    }
}
