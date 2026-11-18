import { projectDistrictPoint } from '../domain/map/geography.ts';
import { surfaceBearingDeg } from './station-orientation.ts';
// Public OSM snapshot 2026-11-14, cross-checked against the district map from Osaka City (大阪市).
// Station interiors remain diagrammatic; this scale controls relative placement only.
export const districtFrame = {
    origin: { lat: 34.7022133, lon: 135.4955732 },
    anchor: { x: -20, z: 0 },
    metersPerUnit: 2.5,
    bearingDeg: surfaceBearingDeg
};
export const districtAnchors = { jrNorthEastDeck: { x: 59, z: -44 } } as const;
/**
 * Derive a legacy display frame from a geographic anchor while recording illustrative offsets separately.
 */
const locate = (
    lat: number,
    lon: number,
    bearingDeg: number,
    offset: {
        along?: number;
        east?: number;
        south?: number;
    } = {}
) => {
    const referenceOrigin = projectDistrictPoint(
        { lat, lon },
        districtFrame.origin,
        districtFrame.bearingDeg,
        districtFrame.metersPerUnit,
        districtFrame.anchor
    );
    const angle = (bearingDeg - districtFrame.bearingDeg) * Math.PI / 180;
    // Schematic interiors are oversized: retain the geographic anchor separately
    // from the display clearance, which must not be interpreted as surveyed metres.
    const eastAngle = districtFrame.bearingDeg * Math.PI / 180;
    const displayOffset = {
        x: Math.cos(angle) * (offset.along ?? 0) + Math.sin(eastAngle) * (offset.east ?? 0) - Math.cos(eastAngle) * (offset.south ?? 0),
        z: Math.sin(angle) * (offset.along ?? 0) + Math.cos(eastAngle) * (offset.east ?? 0) + Math.sin(eastAngle) * (offset.south ?? 0)
    };
    return {
        geo: { lat, lon },
        bearingDeg,
        referenceOrigin,
        displayOffset,
        origin: { x: referenceOrigin.x + displayOffset.x, z: referenceOrigin.z + displayOffset.z },
        angle
    };
};
const hanshinPlacement = {
    ...locate(34.7014097, 135.4971469, -121, { along: 12, east: 12, south: 53 }),
    planScale: { along: 0.74, across: 0.82 }
};
/** User's southern walking-map crop: east/right, south/down. Display calibration,
 * anchored to Hanshin (阪神), not georeferenced survey coordinates. */
export function projectSouthReference(x: number, z: number) {
    const a = districtFrame.bearingDeg * Math.PI / 180;
    const dx = (x - 450) * 0.22;
    const dz = (z - 150) * 0.22;
    return {
        x: hanshinPlacement.origin.x + dx * Math.sin(a) - dz * Math.cos(a),
        z: hanshinPlacement.origin.z + dx * Math.cos(a) + dz * Math.sin(a)
    };
}

/** 1000px crop of the supplied UMEDA CONNECT underground map: full-page
 * render crop (385,340,400,400), enlarged 2.5x. HS01 is the shared anchor. */
export const walkwayReference = {
    hanshin: { x: 310, z: 303 },
    nishi: { x: 116, z: 640 },
    kitashinchi: { x: 480, z: 885 },
    higashi: { x: 765, z: 365 }
};
/**
 * Convert legacy walkway coordinates into the shared southern reference projection.
 */
export function projectWalkwayReference(x: number, z: number) {
    return projectSouthReference(x + 140, z - 153);
}

/**
 * Fit a legacy station anchor to the shared southern walkway plan while retaining its original geographic anchor.
 */
const fitSouth = (placement: ReturnType<typeof locate>, x: number, z: number) => {
    const origin = projectWalkwayReference(x, z);
    return {
        ...placement,
        origin,
        displayOffset: { x: origin.x - placement.referenceOrigin.x, z: origin.z - placement.referenceOrigin.z }
    };
};
export const districtPlacements = {
    // OSM station nodes 3544516031 and 7811929025. +X points toward the northern end.
    hankyu: { ...locate(34.7054194, 135.4983721, -10.64, { along: 8, east: 30 }), planScale: 0.65 },
    // Area overview places M16 south of the JR east throat, along the road west of Hankyu (阪急).
    // Keep the measured heading/east clearance; move only the schematic north/south fit.
    metro: locate(34.7034131, 135.4975879, -15.64, { along: -34, east: 30 }),
    // HS01 OSM node 3632936957 and westbound rail bearing; south fit clears the
    // expanded Daimaru (大丸梅田店) / JR illustration and keeps the B2 terminal west of M16.
    hanshin: hanshinPlacement,
    // OSM station 5411378288; nearby Tanimachi Line (谷町線) track tangents are -16.5/-16.9°.
    higashi: {
        ...fitSouth(locate(34.7005946, 135.4998176, -16.7), 765, 365),
        planScale: { along: 0.4, across: 1 }
    },
    // Y11 node 7893338340; local rail tangents 3.2–3.6 degrees northward.
    // South fitting clears the already expanded Hanshin (阪神) western throat at B2.
    nishi: {
        ...fitSouth(locate(34.6994819, 135.4956500, 3.4), 116, 640),
        planScale: { along: 0.65, across: 0.8 }
    },
    // Approximate station-centre anchor, east–west axis from the supplied district map.
    kitashinchi: {
        ...fitSouth(locate(34.6983222, 135.4970361, 93.4), 480, 885),
        planScale: { along: 1, across: 0.55 }
    },
};
