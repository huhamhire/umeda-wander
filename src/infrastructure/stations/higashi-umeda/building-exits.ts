import type { Evidence, StationMap, VerticalConnection } from '../../../domain/map/model.ts';
import { passageOutline } from '../../../domain/map/geometry.ts';
import { toGeographicPlan } from '../../../domain/map/spatial-block.ts';
import { elevatorDoorApproach } from '../../../application/connections/connection-openings.ts';
import { geographicFrame } from '../../geography/frame.ts';

/** Fit the distinct public stair, escalator and lift approaches at the two east-side building exits. */
export function calibrateHigashiBuildingExits(station: StationMap): void {
    const { layout, nodes, facilities } = station;
    const seiwaLift = toGeographicPlan({ lon: 135.4996462, lat: 34.7014125 }, geographicFrame);
    const cofreEntrance = toGeographicPlan({ lon: 135.4998616, lat: 34.7008005 }, geographicFrame);
    const seiwaStairs = layout.connections.find(c => c.id === 'higashi-umeda-exit-2-stairs')!;
    const cofreLift = layout.connections.find(c => c.id === 'higashi-umeda-street-lift')!;
    const seiwaLiftConnection: VerticalConnection = {
        ...cofreLift,
        id: 'higashi-umeda-exit-2-lift',
        from: { ...cofreLift.from, id: 'higashi-umeda-exit-2-lift-b1' },
        to: { ...cofreLift.to, id: 'higashi-umeda-exit-2-lift-street' }
    };
    const escalator: VerticalConnection = {
        ...seiwaStairs,
        id: 'higashi-umeda-exit-2-escalator',
        kind: 'escalator',
        width: 1.75,
        from: { ...seiwaStairs.from, id: 'higashi-umeda-exit-2-escalator-b1', x: 780.7, z: 741.8 },
        to: { ...seiwaStairs.to, id: 'higashi-umeda-exit-2-escalator-street', x: 787.9, z: 734.9 }
    };
    nodes.push(escalator.from, escalator.to, seiwaLiftConnection.from, seiwaLiftConnection.to);
    layout.connections.push(escalator, seiwaLiftConnection);
    for (const exit of [
        {
            number: 2,
            lift: seiwaLiftConnection,
            center: seiwaLift,
            doorAngle: Math.atan2(736.07 - seiwaLift.z, 782.63 - seiwaLift.x),
            lower: { x: 783.7, z: 744.4 },
            upper: { x: 790.9, z: 737.5 },
            nearLanding: escalator,
            urls: [
                'https://subway.osakametro.co.jp/station_guide/T/t20/index.php',
                'https://www.openstreetmap.org/way/220230138',
                'https://www.openstreetmap.org/node/10959644129',
                'https://www.openstreetmap.org/way/1314523559'
            ],
            detail: 'Exit 2 serves Seiwa Umeda Building (清和梅田ビル) by stairs, escalator and lift. The mapped lift and lateral footway support the shaft fit. Flight positions, landing geometry and door heading are estimated.'
        },
        {
            number: 4,
            lift: cofreLift,
            center: { x: cofreEntrance.x + 4, z: cofreEntrance.z + .2 },
            doorAngle: Math.PI / 2,
            lower: { x: 804.5, z: 811 },
            upper: cofreEntrance,
            urls: [
                'https://subway.osakametro.co.jp/cn/station_guide/T/t20/map.php',
                'https://www.openstreetmap.org/way/180203218',
                'https://www.openstreetmap.org/node/10959644128',
                'https://route.tsunagood.net/accea-cafe-umeda/'
            ],
            detail: 'Exit 4 serves Cofre Umeda (コフレ梅田) with a stair and a distinct public lift. The stair mouth aligns with the mapped building entrance. The shaft is fitted alongside it from source plan and photo relationships.'
        }
    ]) {
        const id = 'higashi-umeda-exit-' + exit.number;
        const stair = layout.connections.find(c => c.id === id + '-stairs')!;
        const arm = layout.areas.find(a => a.id === id + '-arm')!;
        const ground = layout.areas.find(a => a.id === id + '-ground')!;
        const marker = facilities.find(f => f.id === id)!;
        const evidence: Evidence = {
            ...stair.evidence,
            urls: [...stair.evidence.urls!, ...exit.urls],
            detail: exit.detail
        };
        Object.assign(stair.from, exit.lower);
        Object.assign(stair.to, exit.upper);
        Object.assign(stair, { width: 2.6, stairLandingLength: 1.6, evidence });
        Object.assign(marker, exit.lower, { evidence, note: '' });
        Object.assign(exit.lift.from, exit.center);
        Object.assign(exit.lift.to, exit.center);
        Object.assign(exit.lift, { doorFacingRad: exit.doorAngle, evidence });
        if (exit.nearLanding) {
            exit.nearLanding.evidence = evidence;
        }
        const liftDoor = {
            x: exit.center.x + 2.6 * Math.cos(exit.doorAngle),
            z: exit.center.z + 2.6 * Math.sin(exit.doorAngle)
        };
        for (const [stop, floor] of [[stair.from, arm], [stair.to, ground]] as const) {
            const adjacent = stop.level === ground.level ? exit.nearLanding?.to : exit.nearLanding?.from;
            const landing = adjacent ?? liftDoor;
            const dx = landing.x - stop.x;
            const dz = landing.z - stop.z;
            floor.outline = passageOutline(
                { x: stop.x - dx * .32, z: stop.z - dz * .32 },
                { x: landing.x + dx * .5, z: landing.z + dz * .5 },
                5
            );
            floor.evidence = evidence;
        }
        for (const stop of [exit.lift.from, exit.lift.to]) {
            layout.areas.push({
                ...arm,
                id: stop.id + ':door-approach',
                level: stop.level,
                outline: elevatorDoorApproach(stop, exit.doorAngle),
                label: false,
                evidence
            });
        }
    }
    layout.areas = layout.areas.filter(a => a.id !== 'higashi-umeda-street-lift-pad' && a.id !== 'higashi-umeda-street-lift-ground');
}
