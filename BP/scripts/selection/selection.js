import { system, world } from "@minecraft/server"
import { Arrow } from "./arrow.js"
import { Vector } from "../utils/vector.js"

system.run(() => {
    const dim = world.getDimension("overworld")
    const location = new Vector(3, -63, -7).add(0.5)
    const rotation = { x: 0, y: 90 }

    new Arrow(location, dim, rotation)
})
