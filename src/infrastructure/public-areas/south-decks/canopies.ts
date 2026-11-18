import type { WalkwayCanopy } from '../../../domain/map/model.ts';
import { sourceDeckPaths } from '../elevated-source.ts';

/** Limit roof coverage to the JP skywalk and the photographed east arm up to the junction. */
export function southDeckCanopies(): WalkwayCanopy[] {
    return sourceDeckPaths(['south-skywalk', 'bridge-south'])
        .filter(path => path.id !== 'bridge-south:496684911')
        .map(path => ({
            id: 'canopy-' + path.id,
            level: 'district-south-deck',
            points: path.points,
            width: path.width + .6,
            clearHeight: 3.2,
            evidence: {
                ...path.evidence,
                detail: path.evidence.detail + ' User overhead photographs confirm continuous roof coverage on this arm. Roof height, panel spacing and supports are schematic; no photographic texture is embedded.'
            }
        }));
}
