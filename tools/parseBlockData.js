import { readFile, writeFile } from "node:fs/promises"

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

    delete value.rgb
    delete value.texture
    delete value.sides

    parsedData.push(value)
}

writeFile(
    "../generated/friendBlockColors.js",
    "export const blockData = " + JSON.stringify(parsedData, null, "\t"),
)

console.log(parsedData)
