import { MolangVariableMap } from "@minecraft/server"
import { Vector } from "./vector"
import { Create } from "./create"

/**
 * @typedef {Object} Mesh
 * @property {Array<[number, number, number]>} points
 * @property {Array<number[]>} faces
 */

export class Particle {
    static defaultRGBA = {
        red: 1,
        green: 1,
        blue: 1,
        alpha: 0.2,
    }

    /**
     * @param {string} particle
     * @param {Vector} start
     * @param {Vector} end
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {number} [lifetime=0.11]
     * @param {number} [width=0.05]
     * @param {import("@minecraft/server").RGBA} [rgba]
     * @param {{y:0,p:0,r:0}} rotation
     * @param {Vector} pivot
     */
    static line(
        particle,
        start,
        end,
        dimension,
        lifetime = 0.11,
        width = 0.05,
        rgb = Particle.defaultRGBA,
        rotation = { y: 0, p: 0, r: 0 },
        pivot = new Vector(0),
    ) {
        if (rotation.y !== 0 || rotation.p !== 0 || rotation.r !== 0) {
            const iPivot = Vector.add(pivot, 0.5)
            start = Vector.rotate(start.subtract(iPivot), rotation).add(iPivot)
            end = Vector.rotate(end.subtract(iPivot), rotation).add(iPivot)
        }

        const diff = Vector.subtract(start, end)
        const middle = Vector.divide(diff, 2).add(end)
        const direction = Vector.normalize(diff)
        const length = Math.hypot(diff.x / 2, diff.y / 2, diff.z / 2)
        const molang = new MolangVariableMap()

        molang.setColorRGB("color", rgb)

        molang.setFloat("dir_x", direction.x)
        molang.setFloat("dir_y", direction.y)
        molang.setFloat("dir_z", direction.z)
        molang.setFloat("width", width)
        molang.setFloat("length", length)
        molang.setFloat("lifetime", lifetime)

        dimension.spawnParticle(particle, middle, molang)
    }

    /**
     * @param {string} particle
     * @param {Vector} start
     * @param {Vector} end
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {number} [lifetime=0.11]
     * @param {number} [width=0.05]
     * @param {import("@minecraft/server").RGBA} [rgba]
     * @param {{y:0,p:0,r:0}} [rotation]
     * @param {Vector} [pivot]
     */
    static boxEdges(
        particle,
        location,
        size,
        dimension,
        lifetime = 0.11,
        width = 0.05,
        rgba = this.defaultRGBA,
        rotation = { y: 0, p: 0, r: 0 },
        pivot = new Vector(0),
    ) {
        const line = (start, offset) => {
            start.add(location)
            offset.add(start)
            try {
                this.line(
                    particle,
                    start,
                    offset,
                    dimension,
                    lifetime,
                    width,
                    rgba,
                    rotation,
                    pivot,
                )
            } catch (error) {}
        }

        line(new Vector(0, 0, 0), new Vector(0, size.y, 0))
        line(new Vector(size.x, 0, 0), new Vector(0, size.y, 0))
        line(new Vector(0, 0, size.z), new Vector(0, size.y, 0))
        line(new Vector(size.x, 0, size.z), new Vector(0, size.y, 0))

        line(new Vector(0, 0, 0), new Vector(0, 0, size.z))
        line(new Vector(size.x, 0, 0), new Vector(0, 0, size.z))
        line(new Vector(0, size.y, 0), new Vector(0, 0, size.z))
        line(new Vector(size.x, size.y, 0), new Vector(0, 0, size.z))

        line(new Vector(0, 0, 0), new Vector(size.x, 0, 0))
        line(new Vector(0, size.y, 0), new Vector(size.x, 0, 0))
        line(new Vector(0, 0, size.z), new Vector(size.x, 0, 0))
        line(new Vector(0, size.y, size.z), new Vector(size.x, 0, 0))
    }

    /**
     * @param {{x:string,y:string,z:string}} particleVector
     * @param {Vector} start
     * @param {Vector} end
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").RGBA} [rgba]
     */
    static face(particleVector, start, end, dimension, rgba = this.defaultRGBA) {
        const diff = Vector.subtract(start, end)
        const absDiff = Vector.abs(diff).divide(2)
        const middle = Vector.divide(diff, 2).add(end)
        const molang = new MolangVariableMap()
        const mainAxis = Object.entries(diff).find((v) => v[1] === 0)[0]

        if (!mainAxis) {
            throw new Error(
                "invalid start and end, start and end must have one common value",
            )
        }

        const particle = particleVector[mainAxis]

        molang.setColorRGBA("color", rgba)
        molang.setFloat("dir_x", mainAxis === "x" ? 1 : 0)
        molang.setFloat("dir_y", mainAxis === "y" ? 1 : 0)
        molang.setFloat("dir_z", mainAxis === "z" ? 1 : 0)

        switch (mainAxis) {
            case "x":
                molang.setFloat("length", absDiff.z)
                molang.setFloat("height", absDiff.y)
                break
            case "y":
                molang.setFloat("length", absDiff.x)
                molang.setFloat("height", absDiff.z)

                break
            case "z":
                molang.setFloat("length", absDiff.x)
                molang.setFloat("height", absDiff.y)
                break
            default:
                break
        }

        dimension.spawnParticle(particle, middle, molang)
    }

    /**
     * @param {{x:string,y:string,z:string}} particleVector
     * @param {Vector} location
     * @param {Vector} size
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {import("@minecraft/server").RGBA} [rgba]
     */
    static boxFaces(particleVector, location, size, dimension, rgba = this.defaultRGBA) {
        const face = (start, offset) => {
            start.add(location)
            offset.add(start)

            try {
                this.face(particleVector, start, offset, dimension, rgba)
            } catch (error) {}
        }
        const zFight = 0.0625

        face(new Vector(-zFight, 0, 0), new Vector(0, size.y, size.z))
        face(new Vector(size.x + zFight, 0, 0), new Vector(0, size.y, size.z))

        face(new Vector(0, -zFight, 0), new Vector(size.x, 0, size.z))
        face(new Vector(0, size.y + zFight, 0), new Vector(size.x, 0, size.z))

        face(new Vector(0, 0, -zFight), new Vector(size.x, size.y, 0))
        face(new Vector(0, 0, size.z + zFight), new Vector(size.x, size.y, 0))
    }

    /**
     * @param {string} particle
     * @param {Mesh} mesh
     * @param {import("@minecraft/server").Dimension} dimension
     * @param {number} [lifetime=0.11]
     * @param {number} [width=0.05]
     * @param {import("@minecraft/server").RGBA} [rgba]
     */
    static meshEdges(particle, mesh, dimension, lifetime, width, rgba) {
        const line = (start, end) => {
            try {
                this.line(particle, start, end, dimension, lifetime, width, rgba)
            } catch (error) {}
        }

        for (const face of mesh.faces) {
            const points = face
                .map((index) => mesh.points[index])
                .map((point) => new Vector(point[0], point[1], point[2]))

            if (points.length === 2) {
                line(points[0], points[1])
                return
            }

            if (points.length === 3) {
                line(points[0], points[1])
                line(points[0], points[2])
                line(points[2], points[1])
            }

            if (points.length > 3) {
                const sortedPoints = Create.sortConvexPoints(points)

                for (let i = 0; i < points.length - 2; i++) {
                    line(sortedPoints[0], sortedPoints[i + 1])
                }

                line(sortedPoints[0], sortedPoints[sortedPoints.length - 1])
            }
        }
    }
}
