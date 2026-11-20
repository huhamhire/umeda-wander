import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';

/** Project the reviewed F23 and lift survey traces from the checked-in OSM snapshot. */
const project = (lon: number, lat: number) => toGeographicPlan({ lon, lat }, geographicFrame);

export const f23Stair = {
    from: project(135.4983772, 34.7015150),
    to: project(135.4985232, 34.7014335),
    way: 'https://www.openstreetmap.org/way/1322885764'
};

export const f23EscalatorTracks = [
    {
        from: project(135.4983638, 34.7014972),
        to: project(135.4985112, 34.7014199),
        way: 'https://www.openstreetmap.org/way/1329514171'
    },
    {
        from: project(135.4983567, 34.7014885),
        to: project(135.4985059, 34.7014139),
        way: 'https://www.openstreetmap.org/way/1329514172'
    }
] as const;

export const southLiftPoint = project(135.4982441, 34.7015808);
export const southLiftDeckApproach = [
    project(135.4981354, 34.7016171),
    project(135.4981761, 34.7016195),
    southLiftPoint
];
export const southLiftHallApproach = [
    southLiftPoint,
    project(135.4982632, 34.7015472),
    project(135.4983048, 34.7015254),
    project(135.4983500, 34.7015038),
    f23EscalatorTracks[0].from
];
export const cityLiftMap = 'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda02-2%28202606%29.pdf';
export const exitPhoto = 'https://commons.wikimedia.org/wiki/File:阪神大阪梅田駅地上出入口.jpg';
