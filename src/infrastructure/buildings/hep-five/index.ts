import { messageText } from '../../i18n/index.ts';
import { volume, alignedPart, type GeographicBuilding } from '../building-data.ts';
import { softenPodium } from '../profile-data.ts';
import { sharedUndergroundLevel } from '../../../application/public-areas/shared-underground.ts';

const podium = volume('161451126', messageText('buildings.hepFive.podium'), 0, 43);
podium.outline = softenPodium(podium.outline, 4);
podium.facade = 'bands';
podium.surface = 'podium';
const roof = alignedPart(podium, messageText('buildings.hepFive.roof'), 43, 47, -.55, .1, .5, .1, .45);
roof.facade = 'plain';
roof.note = 'Small rooftop service block fitted from user reference; not an interior plan.';

// OSM way 1228523292 follows the alley between FIVE and NAVIO. The wheel
// plane follows this frontage, not the oblique JR railway corridor.
const streetFrom = { x: 789.6132362376999, z: 483.74105999993844 };
const streetTo = { x: 919.3501180837237, z: 471.0394480002097 };
const streetHeading = Math.atan2(streetTo.z - streetFrom.z, streetTo.x - streetFrom.x);

export const building: GeographicBuilding = {
    id: 'hep-five',
    name: messageText('buildings.hepFive.name'),
    volumes: [podium, roof],
    // The paired glass shafts straddle the fitted west facade; B1 uses the district display datum.
    panoramicElevators: {
        center: { x: 796.9, z: 455.7 },
        heading: Math.atan2(12, -.9),
        spacing: 3.65,
        width: 3.35,
        depth: 5,
        base: sharedUndergroundLevel.y,
        top: podium.top
    },
    wheel: {
        center: { x: 844, z: 449 },
        centerHeight: 68.5,
        radius: 37.5,
        heading: streetHeading,
        depth: 6,
        cabins: 52,
        source: 'https://www.hepfive.jp/ferriswheel',
        // The wheel passes through the upper building to the 7F boarding hall. The ledges are display fits.
        roofRecessLevels: [27.5, 33, 38, podium.top + .35, roof.top + .35],
        supportFeet: [
            { x: -20, z: -7, y: roof.top + .35 },
            { x: 18, z: -7, y: podium.top + .35 },
            { x: -23, z: 7, y: roof.top + .35 },
            { x: -5, z: 7, y: podium.top + .35 }
        ]
    }
};
