import type { Evidence, Point2, StationPartition } from '../../../domain/map/model.ts';

export const southConcourse = {
    gate: -56,
    stairEdge: -38,
    shaftNorth: -29,
    halfWidth: 13.5,
    stairHalfWidth: 4.5,
};

export const ekimoB1Evidence: Evidence = {
    source: 'metro',
    pages: [1],
    urls: [
        'https://subway.osakametro.co.jp/station_guide/station/M16_%E6%A2%85%E7%94%B0_%E6%A7%8B%E5%86%85%E5%9B%B3_1.pdf',
        'https://www.tokyu-land.co.jp/urban/shopping/list/055.html',
        'https://www.openstreetmap.org/way/1010195574'
    ],
    detail: 'The Midosuji Line (御堂筋線) diagram and property listing place the public passage alongside ekimo Umeda (エキモ梅田) on B1. The route is fitted alongside the calibrated paid hall, clear of the E/J openings.'
};

/** Keep the gate end and paid stair mouths open in the cutaway enclosure. */
export function southConcoursePartitions(point: (along: number, across: number) => Point2): StationPartition[] {
    const { gate, stairEdge, shaftNorth, halfWidth, stairHalfWidth } = southConcourse;
    const segments: [string, Point2, Point2][] = [
        ['east', point(gate, halfWidth), point(shaftNorth, halfWidth)],
        ['west', point(gate, -halfWidth), point(stairEdge, -halfWidth)],
        ['stair-east', point(stairEdge, stairHalfWidth), point(stairEdge, halfWidth)],
        ['stair-west', point(stairEdge, -halfWidth), point(stairEdge, -stairHalfWidth)],
    ];
    return segments.map(([suffix, from, to]) => ({
        id: 'metro-umeda-south-partition-' + suffix,
        level: 'metro-hall',
        from,
        to,
        height: 2.3,
        thickness: .25,
        evidence: {
            ...ekimoB1Evidence,
            detail: 'The operator diagram separates the paid south hall and E/J shafts from the B1 public side. Cutaway wall position, height and thickness are schematic.'
        },
    }));
}
