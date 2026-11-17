import type { StationCalibration } from '../../../domain/map/spatial-block.ts';

/** Simplified corridor around the B1 planning reservation, NOT surveyed platform. */
export const metroCalibration: StationCalibration = {
    station: 'metro-umeda',
    status: 'envelope-review',
    envelopes: [{
        id: 'm16-road-reservation',
        role: 'platform-reservation',
        certainty: 'approximate',
        outline: [{ x: 559, z: 450 }, { x: 658, z: 685 }, { x: 690, z: 669 }, { x: 591, z: 442 }],
        holes: [],
        source: 'data/geography/underground/network.ts'
    }],
    notes: ['由 B1 留位中心线简化为四边形，沿 JR 与阪急之间道路下方留位；不是最终站台宽度或原图描边。',
        '需分别确认北、南站台端点与四组改札；不复用旧场景的展示偏移。'],
};
