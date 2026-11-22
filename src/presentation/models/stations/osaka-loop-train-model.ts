import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loopTrainCarPitch, loopTrainCars, loopTrainFrame, loopTrainPoint, type LoopPath } from '../../../application/exploration/osaka-loop-train.ts';

/** Clip the train at the ends of the modeled railway so coupled cars enter and leave continuously. */
function trainClipPlanes(path: LoopPath): T.Plane[] {
    return [0, path.length].map((distance, index) => {
        const point = loopTrainPoint(path, distance);
        const inside = loopTrainPoint(path, distance + (index === 0 ? 1 : -1));
        const normal = new T.Vector3(inside.x - point.x, 0, inside.z - point.z).normalize();
        return new T.Plane().setFromNormalAndCoplanarPoint(normal, new T.Vector3(point.x, 0, point.z));
    });
}

const bodyProfile = [[.64, 1.25], [.97, 1.43], [3.13, 1.43], [3.46, 1.19], [3.62, .86]] as const;
const cabJoin = 8.68;

/** Interpolate the carbody cross-section from the skirt to the curved roof shoulders. */
function halfWidth(y: number): number {
    const upper = bodyProfile.findIndex(([height]) => height > y);
    if (upper <= 0) {
        return (upper === 0 ? bodyProfile[0] : bodyProfile.at(-1)!)[1];
    }
    const [loY, lo] = bodyProfile[upper - 1]!;
    const [hiY, hi] = bodyProfile[upper]!;
    return T.MathUtils.lerp(lo, hi, (y - loY) / (hiY - loY));
}

/** Sweep back the cheeks and rake the upper cab instead of using a flat box end. */
function noseX(y: number, z: number): number {
    const rake = Math.max(0, (y - 2.32) / 1.30);
    const apron = Math.max(0, (1.35 - y) / .71);
    return 9.81 - .29 * (z / 1.43) ** 2 - .51 * rake ** 1.3 - .14 * apron;
}

/** Tessellate a patch on the curved fascia, including UVs for the shared car batches. */
function cabPatch(sample: (u: number, v: number) => [number, number, number], columns: number, rows: number, reverse = false) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= columns; col++) {
            const u = col / columns;
            const v = row / rows;
            positions.push(...sample(u, v));
            uvs.push(u, v);
            if (row < rows && col < columns) {
                const a = row * (columns + 1) + col;
                const c = a + columns + 1;
                if (reverse) {
                    indices.push(a, a + 1, c, a + 1, c + 1, c);
                } else {
                    indices.push(a, c, a + 1, a + 1, c, c + 1);
                }
            }
        }
    }
    const patch = new T.BufferGeometry();
    patch.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    patch.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    patch.setIndex(indices);
    patch.computeVertexNormals();
    const triangles = patch.toNonIndexed();
    patch.dispose();
    return triangles;
}

/** Create a simplified stainless-steel JR 223-series (223系) car with blue bands and a dark cab face. */
function buildCar(
    cab: boolean, pantograph: boolean,
    materials: Record<'body' | 'roof' | 'glass' | 'cabGlass' | 'frame' | 'blue' | 'pale' | 'gear' | 'lamp', T.MeshStandardMaterial>
): T.Group {
    const parts = new Map<T.Material, T.BufferGeometry[]>();
    const add = (part: T.BufferGeometry, paint: keyof typeof materials) => {
        const material = materials[paint];
        const items = parts.get(material) ?? [];
        items.push(part);
        parts.set(material, items);
    };
    /** Place a flat or box detail in the shared car-local frame. */
    const box = (paint: keyof typeof materials, x: number, y: number, z: number, length: number, height: number, width: number) => {
        const geometry = new T.BoxGeometry(length, height, width);
        add(geometry.toNonIndexed().translate(x, y, z), paint);
        geometry.dispose();
    };
    const section = new T.Shape();
    section.moveTo(-bodyProfile[0][1], bodyProfile[0][0]);
    for (const [height, width] of bodyProfile) {
        section.lineTo(width, height);
    }
    for (const [height, width] of [...bodyProfile].reverse()) {
        section.lineTo(-width, height);
    }
    section.closePath();
    const hull = new T.ExtrudeGeometry(section, {
        depth: cab ? 9.62 + cabJoin : 19.24, bevelEnabled: !cab, bevelSize: .065, bevelThickness: .16, bevelSegments: 2
    });
    hull.rotateY(Math.PI / 2).translate(-9.62, 0, 0);
    add(hull, 'body');
    if (cab) {
        /** Lay a panel against the nose using fractional width and the actual curved skin. */
        const fascia = (paint: keyof typeof materials, from: number, to: number, low: number, high: number, offset: number) => {
            add(cabPatch((u, v) => {
                const y = T.MathUtils.lerp(low, high, v);
                const z = halfWidth(y) * T.MathUtils.lerp(Math.min(from, to), Math.max(from, to), u);
                return [noseX(y, z) + offset, y, z];
            }, 18, 10), paint);
        };
        for (let i = 1; i < bodyProfile.length; i++) {
            const low = bodyProfile[i - 1]![0];
            const high = bodyProfile[i]![0];
            fascia('body', -1, 1, low, high, 0);
            for (const side of [-1, 1]) {
                add(cabPatch((u, v) => {
                    const y = T.MathUtils.lerp(low, high, v);
                    const z = halfWidth(y) * side;
                    return [T.MathUtils.lerp(cabJoin, noseX(y, z), u), y, z];
                }, 1, 10, side === 1), 'body');
            }
        }
        for (const y of [bodyProfile[0][0], bodyProfile.at(-1)![0]]) {
            add(cabPatch((u, v) => {
                const z = halfWidth(y) * (u * 2 - 1);
                return [T.MathUtils.lerp(cabJoin, noseX(y, z), v), y, z];
            }, 18, 1, y === bodyProfile.at(-1)![0]), 'body');
        }
        fascia('frame', -.98, .98, 1.99, 3.37, .024);
        fascia('gear', -.235, .235, 1.45, 3.25, .04);
        fascia('frame', -.196, .196, 1.49, 3.20, .06);
        fascia('cabGlass', -.145, .145, 2.04, 2.94, .08);
        fascia('gear', -.16, .16, 3.00, 3.16, .089);
        fascia('pale', -.123, .123, 3.05, 3.09, .105);
        fascia('blue', -.99, .99, 1.58, 1.68, .042);
        fascia('roof', -.98, .98, 1.10, 1.56, .029);
        for (const side of [-1, 1]) {
            for (const [paint, low, high] of [['blue', 1.535, 1.685], ['pale', 1.71, 1.83]] as const) {
                add(cabPatch((u, v) => {
                    const y = T.MathUtils.lerp(low, high, v);
                    const z = halfWidth(y) * side;
                    return [T.MathUtils.lerp(cabJoin, noseX(y, z) + .024, u), y, z + side * .024];
                }, 1, 3, side === 1), paint);
            }
            fascia('cabGlass', side * .268, side * .929, 2.08, 3.27, .055);
            fascia('gear', side * .48, side * .88, 1.21, 1.47, .055);
            for (const z of [side * .85, side * 1.10]) {
                const geometry = new T.SphereGeometry(.077, 10, 6).scale(.42, 1, 1);
                add(geometry.toNonIndexed().translate(noseX(1.34, z) + .071, 1.34, z), 'lamp');
                geometry.dispose();
            }
            const wiperLow = new T.Vector3(noseX(2.11, side * 1.03) + .075, 2.11, side * 1.03);
            const wiperHigh = new T.Vector3(noseX(2.57, side * .55) + .075, 2.57, side * .55);
            const wiper = new T.CylinderGeometry(.021, .021, wiperLow.distanceTo(wiperHigh), 6);
            wiper.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), wiperHigh.clone().sub(wiperLow).normalize()));
            wiper.translate(...wiperLow.lerp(wiperHigh, .5).toArray());
            add(wiper.toNonIndexed(), 'gear');
            wiper.dispose();
        }
        box('gear', 9.63, .64, 0, .45, .36, 1.12);
    }
    for (const side of [-1, 1]) {
        const z = side * (cab ? 1.45 : 1.51);
        box('blue', cab ? -.39 : 0, 1.61, z, cab ? 18.38 : 19.16, .15, .035);
        box('pale', cab ? -.39 : 0, 1.77, z, cab ? 18.38 : 19.16, .12, .035);
        for (const door of [-5.4, 0, 5.4]) {
            box('roof', door, 1.94, z + side * .018, 1.24, 2.04, .04);
            box('glass', door, 2.44, z + side * .045, .94, .68, .034);
            box('gear', door, 1.94, z + side * .065, .022, 2, .022);
        }
        for (const x of [-7.9, -3.62, -1.87, 1.87, 3.62, 7.65]) {
            box('glass', x, 2.51, z, 1.46, .8, .05);
        }
    }
    for (const x of [-6.9, 6.9]) {
        box('gear', x, .48, 0, 2.7, .47, 2.16);
        for (const axle of [-.82, .82]) {
            for (const z of [-.7, .7]) {
                const wheel = new T.CylinderGeometry(.42, .42, .22, 12);
                wheel.rotateX(Math.PI / 2);
                add(wheel.toNonIndexed().translate(x + axle, .12, z), 'gear');
                wheel.dispose();
            }
        }
    }
    box('gear', 0, .55, 0, 6.4, .41, 1.85);
    box('roof', 0, 3.7, 0, 3.35, .28, 1.52);
    if (pantograph) {
        box('gear', -5.3, 3.9, 0, 1.1, .4, .7);
        box('roof', -5.3, 4.16, 0, .22, .10, 1.38);
    }
    for (const side of [-1, 1]) {
        const x = side * 9.81;
        if (!cab || side < 0) {
            box('gear', x, 1.69, 0, .12, 2, 1.07);
        }
        box('gear', side * 9.94, .48, 0, .34, .23, .41);
    }
    const car = new T.Group();
    for (const [material, geometries] of parts) {
        const mesh = new T.Mesh(mergeGeometries(geometries)!, material);
        car.add(mesh);
        geometries.forEach(geometry => geometry.dispose());
    }
    return car;
}

/** Reuse one train across cycles; each car follows the chord between its two bogies. */
export class OsakaLoopTrainModel {
    readonly group = new T.Group();
    private readonly cars: T.Group[];
    private readonly path: LoopPath;
    private readonly carBounds = new T.Sphere(new T.Vector3(), loopTrainCarPitch / 2 + 4);
    private head?: number;

    /** Assemble two coupled four-car sets for the sampled running line. */
    constructor(path: LoopPath) {
        this.path = path;
        const clippingPlanes = trainClipPlanes(path);
        /** Share the clipped paint materials between all eight cars. */
        const paint = (color: number, nightColor: number) => new T.MeshStandardMaterial({
            color, roughness: .63, metalness: .15, clippingPlanes, userData: { nightColor }
        });
        const materials = {
            body: paint(0xcbd2d2, 0x9aa9ae), roof: paint(0x9ea8ab, 0x77888e), glass: paint(0x263a43, 0x263b47),
            blue: paint(0x1e5588, 0x3e6c9d), pale: paint(0x90b7ce, 0x81a7bf), gear: paint(0x4a5255, 0x3d515a),
            frame: paint(0x24343c, 0x202b31), cabGlass: paint(0x496570, 0x35515d),
            lamp: paint(0xf9eac6, 0xf1d9ad)
        };
        const cab = buildCar(true, false, materials);
        const middle = buildCar(false, false, materials);
        const powered = buildCar(false, true, materials);
        this.cars = Array.from({ length: loopTrainCars }, (_, index) => {
            const car = new T.Group();
            car.name = `223-series-car-${index + 1}`;
            const next = [cab, powered, middle, cab][index % 4]!.clone();
            next.rotation.y = index % 4 === 3 ? Math.PI : 0;
            car.add(next);
            this.group.add(car);
            return car;
        });
        this.group.name = 'jr-osaka-loop-223-series';
        this.group.visible = false;
    }

    /** Check only cars that can be drawn, with margin before entering the viewport. */
    intersectsView(view: T.Frustum): boolean {
        return this.group.visible && this.cars.some(car => {
            if (!car.visible) {
                return false;
            }
            this.carBounds.center.setFromMatrixPosition(car.matrixWorld);
            return view.intersectsSphere(this.carBounds);
        });
    }

    /** Apply the timed pose and request frames only while motion or a later event is due. */
    update(elapsed: number, reducedMotion: boolean): number {
        if (!this.group.parent?.visible) {
            this.group.visible = false;
            return Infinity;
        }
        const { head, wait } = loopTrainFrame(this.path, elapsed, reducedMotion);
        this.group.visible = head !== undefined;
        if (head === undefined || head === this.head) {
            return wait;
        }
        this.head = head;
        for (const [index, car] of this.cars.entries()) {
            const center = head - (index + .5) * loopTrainCarPitch;
            // Fully clipped cars need neither new matrices nor a draw call.
            car.visible = center + loopTrainCarPitch / 2 > 0 && center - loopTrainCarPitch / 2 < this.path.length;
            if (!car.visible) {
                continue;
            }
            const rear = loopTrainPoint(this.path, center - 6.9);
            const front = loopTrainPoint(this.path, center + 6.9);
            car.position.set((rear.x + front.x) / 2, -.06, (rear.z + front.z) / 2);
            car.rotation.y = -Math.atan2(front.z - rear.z, front.x - rear.x);
        }
        this.group.traverseVisible(object => object.updateWorldMatrix(false, false));
        return wait;
    }
}
