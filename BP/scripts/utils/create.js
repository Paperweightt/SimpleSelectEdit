import { Vector } from "./vector"

/**
 * @typedef {Object} Mesh
 * @property {Array<[number, number, number]>} points
 * @property {Array<number[]>} faces
 */

export class Create {
    /**
     * @param {Vector} vec1
     * @param {Vector} vec2
     * @param {"x"|"y"|"z"} x
     * @returns {Iterable<Vector>}
     */
    static *line(vec1, vec2, x) {
        const delta = Vector.subtract(vec2, vec1)
        let y = "y"
        let z = "z"

        if (!x) {
            ;[x, y, z] = Object.entries(Vector.abs(delta))
                .sort((a, b) => b[1] - a[1])
                .map((v) => v[0])
        } else if (x === "y") {
            y = "x"
        } else if (x === "z") {
            z = "x"
        }

        const cx = delta[x] > 0 ? 1 : -1
        const cy = delta[y] / Math.abs(delta[x]) || 0
        const cz = delta[z] / Math.abs(delta[x]) || 0

        let end
        const output = vec1.copy()

        if (cx === 1) {
            output[x] = Math.ceil(vec1[x])
            end = Math.floor(vec2[x])
        } else {
            output[x] = Math.floor(vec1[x])
            end = Math.ceil(vec2[x])
        }

        const floatOffset = (vec1[x] - output[x]) * -cx
        // fix start float offset so that outputs are axis aligned
        output[y] = cy * floatOffset + vec1[y]
        output[z] = cz * floatOffset + vec1[z]

        yield output.copy()
        while (cx === 1 ? output[x] < end : output[x] > end) {
            output[x] += cx
            output[y] += cy
            output[z] += cz

            yield output.copy()
        }
    }

    /**
     * @param {int} radius
     * @returns {Iterable<Vector>}
     */
    static *sphere(diameter) {
        const radius = diameter / 2
        const max = 0.7071067812 * radius + 1
        let isEven = Math.ceil(diameter) % 2 ? false : true
        let c = isEven ? 1 : 0

        if (!isEven) {
            const diameter = Math.sqrt(radius * radius) * 2
            const x = 0

            for (const { y, z } of this.circle(diameter, "x", isEven)) {
                yield new Vector(x, y, z)

                if ((Math.abs(y) < max && Math.abs(x - 1) < max) || Math.abs(z) > max) {
                    yield new Vector(z, y, x)
                }
            }
        }

        for (let x = 1; x < max; x++) {
            const diameter = (Math.sqrt(radius ** 2 - x ** 2) - c) * 2

            for (const { y, z } of this.circle(diameter, "x", isEven)) {
                yield new Vector(x - c, y, z)
                yield new Vector(-x, y, z)

                if ((Math.abs(y) < max && Math.abs(x - 1) < max) || Math.abs(z) > max) {
                    yield new Vector(z, y, x - c)
                    yield new Vector(z, y, -x)
                }
            }
        }
    }

    /**
     * @param {int} diameter
     * @param {"x"|"y"|"z"} orientation
     * @returns {Iterable<Vector>}
     */
    static *circle(diameter, orientation = "z", even = false) {
        let radius = diameter / 2
        let c = even ? 1 : 0
        let axisOrder = "xyz"
        const m = 0.5

        // prettier-ignore
        switch (orientation) {
            case "x": axisOrder = "xyz"; break
            case "y": axisOrder = "yxz"; break
            case "z": axisOrder = "zyx"; break
            default: break
        }

        if (c) radius += 2

        let x = 1
        let y = Math.sqrt(radius ** 2 - x ** 2) - 0.5

        while (x - 0.5 <= y) {
            yield new Vector(0, m + x - c, m - y).setAxisOrder(axisOrder)
            yield new Vector(0, m - x, m - y).setAxisOrder(axisOrder)
            yield new Vector(0, m + y - c, m - x).setAxisOrder(axisOrder)
            yield new Vector(0, m - y, m - x).setAxisOrder(axisOrder)

            yield new Vector(0, m + y - c, m + x - c).setAxisOrder(axisOrder)
            yield new Vector(0, m - y, m + x - c).setAxisOrder(axisOrder)
            yield new Vector(0, m + x - c, m + y - c).setAxisOrder(axisOrder)
            yield new Vector(0, m - x, m + y - c).setAxisOrder(axisOrder)

            x++
            y = Math.sqrt(radius ** 2 - x ** 2) - 0.5
        }

        if (c === 0) {
            x = 0
            y = Math.sqrt(radius ** 2 - x ** 2) - 0.5
            yield new Vector(0, m + y, m + x).setAxisOrder(axisOrder)
            yield new Vector(0, m - y, m + x).setAxisOrder(axisOrder)
            yield new Vector(0, m + x, m + y).setAxisOrder(axisOrder)
            yield new Vector(0, m + x, m - y).setAxisOrder(axisOrder)
        }
    }

    /**
     * @param {Vector} v1
     * @param {Vector} v2
     * @param {Vector} v3
     * @returns {Iterable<Vector>}
     */
    static *triangle(v1, v2, v3) {
        const ab = Vector.subtract(v2, v1)
        const ac = Vector.subtract(v3, v1)
        const n = Vector.crossProduct(ab, ac)

        if (Math.abs(n.x) < Math.abs(n.z)) {
            yield* this.triangleX(v1, v2, v3)
        } else {
            yield* this.triangleZ(v1, v2, v3)
        }

        yield* this.line(v1, v2)
        yield* this.line(v1, v3)
        yield* this.line(v3, v2)
    }

    /**
     * @private
     * @param {Vector} v1
     * @param {Vector} v2
     * @param {Vector} v3
     * @returns {Iterable<Vector>}
     */
    static *triangleZ(v1, v2, v3) {
        ;[v1, v2, v3] = [v1, v2, v3].sort((a, b) => a.z - b.z)

        if (v2.z === v3.z) {
            yield* this.flatTriangle(v1, v2, v3, "z")
            return
        }

        if (v1.z === v2.z) {
            yield* this.flatTriangle(v3, v2, v1, "z")
            return
        }

        const x = v1.x - ((v1.x - v3.x) / (v1.z - v3.z)) * (v1.z - v2.z)
        const y = v1.y - ((v1.y - v3.y) / (v1.z - v3.z)) * (v1.z - v2.z)
        const z = v2.z
        const v4 = new Vector(x, y, z)

        yield* this.line(v2, v4)
        yield* this.flatTriangle(v1, v2, v4, "z")
        yield* this.flatTriangle(v3, v4, v2, "z")
    }

    /**
     * @private
     * @param {Vector} v1
     * @param {Vector} v2
     * @param {Vector} v3
     * @returns {Iterable<Vector>}
     */
    static *triangleX(v1, v2, v3) {
        ;[v1, v2, v3] = [v1, v2, v3].sort((a, b) => a.x - b.x)

        if (v2.x === v3.x) {
            yield* this.flatTriangle(v1, v2, v3, "x")
            return
        }

        if (v1.x === v2.x) {
            yield* this.flatTriangle(v3, v2, v1, "x")
            return
        }

        const x = v2.x
        const y = v1.y - ((v1.y - v3.y) / (v1.x - v3.x)) * (v1.x - v2.x)
        const z = v1.z - ((v1.z - v3.z) / (v1.x - v3.x)) * (v1.x - v2.x)
        const v4 = new Vector(x, y, z)

        yield* this.line(v2, v4)
        yield* this.flatTriangle(v1, v2, v4, "x")
        yield* this.flatTriangle(v3, v4, v2, "x")
    }

    /**
     * @private
     * @param {Vector} v1
     * @param {Vector} v2
     * @param {Vector} v3
     * @param {"x"|"y"|"z"} axis
     */
    static *flatTriangle(v1, v2, v3, axis) {
        if (v1[axis] === v2[axis]) {
            yield* this.line(v2, v3)
            return
        }

        const gen1 = this.line(v2, v1, axis)
        const gen2 = this.line(v3, v1, axis)
        let line1, line2

        while (true) {
            line1 = gen1.next()
            line2 = gen2.next()

            if (line1.done || line2.done) break

            // yield line1.value
            // yield line2.value

            for (const point of this.line(line2.value, line1.value)) {
                yield point
            }
        }
    }

    /**
     * @param {Vector[]} points
     * @returns {Vector[]}
     */
    static sortConvexPoints(points) {
        const pointData = []
        const center = Vector.average(points)
        const { xMin, xMax, yMin, yMax, zMin, zMax } = points.reduce(
            (acc, p) => ({
                xMin: Math.min(acc.xMin, p.x),
                xMax: Math.max(acc.xMax, p.x),
                yMin: Math.min(acc.yMin, p.y),
                yMax: Math.max(acc.yMax, p.y),
                zMin: Math.min(acc.zMin, p.z),
                zMax: Math.max(acc.zMax, p.z),
            }),
            {
                xMin: Infinity,
                xMax: -Infinity,
                yMin: Infinity,
                yMax: -Infinity,
                zMin: Infinity,
                zMax: -Infinity,
            },
        )
        const spans = [
            ["x", xMax - xMin],
            ["y", yMax - yMin],
            ["z", zMax - zMin],
        ].sort((a, b) => b[1] - a[1])
        const [a2, a3] = [spans[0][0], spans[1][0]]

        for (const point of points) {
            pointData.push({
                point: point,
                angle: Math.atan2(point[a3] - center[a3], point[a2] - center[a2]),
            })
        }

        return pointData
            .sort((a, b) => {
                return a.angle - b.angle
            })
            .map((pointData) => pointData.point)
    }

    /**
     * @param {Vector[]} points
     * @returns {Iterable<Vector>}
     */
    static *convexPlane(points) {
        points = points.map((point) => point.copy().floor())
        if (points.length === 1) {
            yield points[0]
            return
        }

        if (points.length === 2) {
            yield* this.line(points[0], points[1])
            return
        }

        if (points.length === 3) {
            yield* this.triangle(points[0], points[1], points[2])
            return
        }

        const sortedPoints = this.sortConvexPoints(points)

        for (let i = 0; i < points.length - 2; i++) {
            yield* this.triangle(sortedPoints[0], sortedPoints[i + 1], sortedPoints[i + 2])
        }
    }

    /**
     * @param {Mesh} mesh
     * @returns {Iterable<Vector>}
     */
    static *meshToLocations(mesh) {
        for (const face of mesh.faces) {
            const points = face
                .map((index) => mesh.points[index])
                .map((point) => new Vector(point[0], point[1], point[2]))

            yield* this.convexPlane(points)
        }
    }

    /**
     * @param {Mesh} mesh
     * @returns {Iterable<Vector>}
     */
    static *edgeMeshToLocations(mesh) {
        const lines = mesh.faces.map(([a, b]) =>
            [mesh.points[a], mesh.points[b]]
                .map((point) => new Vector(point[0], point[1], point[2]).floor())
                .sort((a, b) => a.y - b.y),
        )

        const { yMin, yMax } = lines.reduce(
            (acc, cur) => ({
                yMin: Math.min(acc.yMin, cur[0].y),
                yMax: Math.max(acc.yMax, cur[1].y),
            }),
            { yMin: Infinity, yMax: -Infinity },
        )

        function getXZ(a, b, y) {
            const diff = Vector.subtract(a, b)

            const cx = diff.x / diff.y || 0
            const cz = diff.z / diff.y || 0
            const x = cx * y + (a.x - cx * a.y)
            const z = cz * y + (a.z - cz * a.y)

            return new Vector(x, y, z)
        }

        for (let y = yMin; y < yMax; y++) {
            yield* this.convexPlane(
                lines.filter(([a, b]) => a.y <= y && b.y > y).map(([a, b]) => getXZ(a, b, y)),
            )
        }
    }
}
