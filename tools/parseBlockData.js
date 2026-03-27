import { readFile, writeFile } from "node:fs/promises"

const nameChanges = {
    bricks: "brick_block",
    creaking_heart_awake: "",
    creaking_heart_dormant: "creaking_heart",
    dried_kelp: "dried_kelp_block",
    end_stone_bricks: "end_bricks",
    melon: "melon_block",
    mushroom_block_inside: "brown_mushroom_block",
    nether_bricks: "nether_brick",
    nether_quartz_ore: "quartz_ore",
    red_nether_bricks: "red_nether_brick",
    rooted_dirt: "dirt_with_roots",
    terracotta: "light_gray_terracotta",
}

async function getBlockData() {
    try {
        const data = await readFile("../generated/_blockdata.json", "utf8")
        return JSON.parse(data)
    } catch (err) {
        console.error(err)
    }
}

async function getBuildFriendlyPngs() {
    try {
        const data = await readFile("../generated/_palettes.json", "utf8")
        const lists = JSON.parse(data)
        const textures = lists[1].textures
        const newTextures = []

        for (const texture of textures) {
            if (texture.endsWith("top.png")) continue
            if (texture.endsWith("top_awake.png")) continue
            if (texture.endsWith("top_dormant.png")) continue
            if (texture.endsWith("bottom.png")) continue
            if (texture.endsWith("end.png")) continue

            newTextures.push(texture)
        }

        return newTextures
    } catch (err) {
        console.error(err)
    }
}

const [_, ...data] = await getBlockData()
const pngs = await getBuildFriendlyPngs()
const parsedData = []

for (const value of data) {
    if (!pngs.includes(value.texture)) continue

    if (value.name.endsWith("Side")) {
        value.name = value.name.slice(0, -5)
    } else if (value.name.endsWith("Side2")) {
        value.name = value.name.slice(0, -6)
    }

    value.name = value.name.toLowerCase().replaceAll(" ", "_")

    if (typeof nameChanges[value.name] === "string") {
        if (nameChanges[value.name] === "") continue
        value.name = nameChanges[value.name]
    }

    delete value.rgb
    delete value.texture
    delete value.sides

    value.lab = [+value.lab[0], +value.lab[1], +value.lab[2]]

    parsedData.push(value)
}

writeFile(
    "../BP/scripts/generated/friendlyBlockColors.js",
    "export const blockData = " + JSON.stringify(parsedData, null, "\t"),
)

console.log(parsedData.length, "blocks")
