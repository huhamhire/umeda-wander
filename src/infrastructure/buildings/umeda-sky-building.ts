import source from '../../../data/geography/buildings/umeda-sky-building.json' with { type: 'json' };
import type { SurfacePolygon } from '../../domain/map/model.ts';
import { messageText } from '../i18n/index.ts';
import type { GeographicBuilding } from './building-data.ts';

/** Adapt the projected Osaka PLATEAU exterior, including the voids of Umeda Sky Building (梅田スカイビル). */
function surfaces(faces: number[][][][]): SurfacePolygon[] {
    return faces.map(face => face.map(ring => ring.map(([x, z, y]) => ({ x: x!, z: z!, y: y! }))));
}

export const umedaSkyBuilding: GeographicBuilding = {
    id: 'umeda-sky-building',
    name: messageText('buildings.umedaSkyBuilding.name'),
    volumes: [],
    shell: {
        scopeOutline: source.scopeOutline.map(([x, z]) => ({ x: x!, z: z! })),
        top: source.top,
        surfaces: {
            roof: surfaces(source.surfaces.roof),
            wall: surfaces(source.surfaces.wall),
            soffit: surfaces(source.surfaces.soffit),
            detail: surfaces(source.surfaces.detail),
            glazing: surfaces(source.surfaces.glazing)
        }
    }
};
