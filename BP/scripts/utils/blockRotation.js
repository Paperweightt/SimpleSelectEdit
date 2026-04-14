/**
 * @param {import('@minecraft/server').BlockPermutation} permutation
 * @param {number} rotation
 * @return {import('@minecraft/server').BlockPermutation}
 */
export function rotateY(permutation, rotation) {
    for (const [key, value] of Object.entries(permutation.getAllStates())) {
        const fn = BlockStateSuperset[key]
        if (!fn) continue
        permutation = fn(key, value, permutation, (180 + rotation) % 360)
    }
    return permutation
}

/**
 * @param {import('@minecraft/server').BlockPermutation} permutation
 * @param {number} rotation
 * @return {import('@minecraft/server').BlockPermutation}
 */
export function rotateX(permutation) {}

/**
 * @param {import('@minecraft/server').BlockPermutation} permutation
 * @param {number} rotation
 * @return {import('@minecraft/server').BlockPermutation}
 */
export function rotateZ(permutation) {}

const BlockStateSuperset = {
    ["coral_direction"]: rotate3201,
    ["direction"](key, value, permutation, rotation) {
        const rotations = rotation / 90

        function rotate(value) {
            //prettier-ignore
            switch (value) {
                case 0: return 3
                case 1: return 0
                case 2: return 1
                case 3: return 2
                default: return value
            }
        }

        for (let i = 0; i < rotations; i++) {
            value = rotate(value)
        }

        return permutation.withState(key, value)
    },
    ["facing_direction"](key, value, permutation, rotation) {
        const rotations = rotation / 90

        function rotate(value) {
            //prettier-ignore
            switch (value) {
                case 2: return 4
                case 3: return 0
                case 4: return 3
                case 5: return 2
                default: return value
            }
        }

        for (let i = 0; i < rotations; i++) {
            value = rotate(value)
        }

        return permutation.withState(key, value)
    },
    ["lever_direction"](key, value, permutation, rotation) {
        const index = value.indexOf("_")

        if (index !== -1) {
            const yDirection = value.slice(0, index)
            let cardinal = value.substring(index + 1)
            const rotations = (rotation / 90) % 2

            function rotate(value) {
                //prettier-ignore
                switch (value) {
                    case "north_south": return "east_west"
                    case "east_west": return "north_south"
                    default: return value
                }
            }

            for (let i = 0; i < rotations; i++) {
                cardinal = rotate(cardinal)
            }

            value = yDirection + "_" + cardinal

            return permutation.withState(key, value)
        } else {
            const rotations = rotation / 90

            function rotate(value) {
                //prettier-ignore
                switch (value) {
                    case "north": return "west"
                    case "east": return "north"
                    case "south": return "east"
                    case "west": return "south"
                    default: return value
                }
            }

            for (let i = 0; i < rotations; i++) {
                value = rotate(value)
            }
            return permutation.withState(key, value)
        }
    },
    ["minecraft:block_face"]: rotateNESWUD,
    ["minecraft:cardinal_direction"]: rotateNESWUD,
    // observer
    ["minecraft:facing_direction"]: rotateNESWUD,
    // skulk vein and 2 others (resin and something)
    ["multi_face_direction_bits"](key, value, permutation, rotation) {
        const rotations = rotation / 90
        const bits = value.toString(2).padStart(6, "0")
        const topAndBottomBits = bits.substring(4)
        let cardinalBits = bits.slice(0, 4)

        function rotate(value) {
            return value.charAt(value.length - 1) + value.slice(0, value.length - 1)
        }

        for (let i = 0; i < rotations; i++) {
            cardinalBits = rotate(cardinalBits)
        }

        value = parseInt(cardinalBits + topAndBottomBits, 2)

        return permutation.withState(key, value)
    },
    // crafter
    ["orientation"](key, value, permutation, rotation) {
        const rotations = rotation / 90

        function rotate(value) {
            //prettier-ignore
            switch (value) {
                case "north_up": return "west_up"
                case "east_up": return "north_up"
                case "south_up": return "east_up"
                case "west_up": return "south_up"

                case "up_north": return "up_west"
                case "up_east": return "up_north"
                case "up_south": return "up_east"
                case "up_west": return "up_south"

                case "down_north": return "down_west"
                case "down_east": return "down_north"
                case "down_south": return "down_east"
                case "down_west": return "down_south"
                default: return value
            }
        }

        for (let i = 0; i < rotations; i++) {
            value = rotate(value)
        }

        return permutation.withState(key, value)
    },
    ["pillar_axis"](key, value, permutation, rotation) {
        const rotations = (rotation / 90) % 2

        function rotate(value) {
            //prettier-ignore
            switch (value) {
                case "x": return "z"
                case "z": return "x"
                default: return value
            }
        }

        for (let i = 0; i < rotations; i++) {
            value = rotate(value)
        }

        return permutation.withState(key, value)
    },
    // FIX: block updates kill portal
    // ["portal_axis"]() {},
    // FIX: block updates rotate rails
    // ["rail_direction"]() { },

    // used by jigsaw block
    ["rotation"]() {},
    ["weirdo_direction"]: rotate3201,
}

function rotateNESWUD(key, value, permutation, rotation) {
    const rotations = rotation / 90

    function rotate(value) {
        //prettier-ignore
        switch (value) {
            case "north": return "west"
            case "east": return "north"
            case "south": return "east"
            case "west": return "south"
            default: return value
        }
    }

    for (let i = 0; i < rotations; i++) {
        value = rotate(value)
    }

    return permutation.withState(key, value)
}

function rotate3201(key, value, permutation, rotation) {
    const rotations = rotation / 90

    function rotate(value) {
        //prettier-ignore
        switch (value) {
            case 0: return 3
            case 1: return 2
            case 2: return 0
            case 3: return 1
            default: return value
        }
    }

    for (let i = 0; i < rotations; i++) {
        value = rotate(value)
    }

    return permutation.withState(key, value)
}
