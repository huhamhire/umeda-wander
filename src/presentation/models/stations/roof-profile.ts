import roof from '../../../../data/geography/buildings/jr-roof.json' with { type: 'json' };

export const geographicRoofPlan = roof;
/** Relative to the 26 m scene base; LOD1 does not supply the sloping surface. */
export function geographicRoofHeightAt(z: number): number {
    return roof.southHeight - 26 + (36 - z) * (roof.northHeight - roof.southHeight) / 72
        + Math.sin((z + 36) / 72 * Math.PI) * 1.2;
}

/**
 * Map a local roof parameter point into the independently calibrated district roof envelope.
 */
export function geographicRoofPoint(x: number, z: number) {
    const a = roof.angle;
    const along = x * roof.width / 126;
    const across = z * roof.depth / 72;
    return {
        x: roof.center.x + along * Math.cos(a) - across * Math.sin(a),
        z: roof.center.z + along * Math.sin(a) + across * Math.cos(a),
    };
}
