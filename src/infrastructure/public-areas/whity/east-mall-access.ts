import { passageOutline } from '../../../domain/map/geometry.ts';
import type { Evidence, Facility, FloorArea } from '../../../domain/map/model.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { geographicFrame } from '../../geography/frame.ts';
import { messageText } from '../../i18n/index.ts';

const operatorPlan = 'https://whity.osaka-chikagai.jp/front/common/img/whity_evacuation_plan_2025.pdf';

/** Locate the East Mall (イーストモール) side of confirmed hotel connections. */
export function createWhityEastMallAccess() {
    const areas: FloorArea[] = [];
    const facilities: Facility[] = [];
    for (const access of [
        {
            number: '7-72', host: messageText('buildings.ibisOsakaUmeda.name'),
            ground: { lon: 135.5009474, lat: 34.7021207 }, approachOffset: 1.45,
            join: { x: 911.8, z: 666.8 }, node: '5024365349', street: '1459748830', hostWay: '960078119',
            hotel: 'https://ibisosakaumeda.com/access/'
        },
        {
            number: '7-75', host: messageText('buildings.dansLeCoeurOsakaUmeda.name'),
            ground: { lon: 135.5011025, lat: 34.7018944 }, approachOffset: -5.45,
            join: { x: 924.9, z: 666.6 }, node: '5024365348', street: '1459753434', hostWay: '1320386697',
            hotel: 'https://www.isereality.co.jp/2019/12/05/post-60/'
        }
    ]) {
        const evidence: Evidence = {
            source: 'district',
            pages: [6, 50, 53],
            urls: [
                operatorPlan, access.hotel, 'https://www.openstreetmap.org/node/' + access.node,
                'https://www.openstreetmap.org/way/' + access.street, 'https://www.openstreetmap.org/way/' + access.hostWay
            ],
            detail: 'Whity and the hotel confirm a building connection. The numbered OSM street reference constrains the local alignment. The B1 public landing is fitted on the mall side of the level change.'
        };
        const id = 'whity-building-access-' + access.number;
        const name = messageText('facilities.locations.whityBuildingAccess', { number: access.number, building: access.host });
        const level = 'district-underground';
        const ground = toGeographicPlan(access.ground, geographicFrame);
        const landing = { x: ground.x, z: ground.z + access.approachOffset };
        const end = { x: landing.x, z: landing.z + Math.sign(landing.z - access.join.z) * .8 };
        areas.push({
            id: id + '-apron', name, level, blockId: 'whity-b1', kind: 'public', label: false,
            outline: passageOutline(access.join, end, 3.35), evidence
        });
        facilities.push({ id, name, level, kind: 'entrance', ...landing, note: '', evidence });
    }
    return { areas, facilities };
}
