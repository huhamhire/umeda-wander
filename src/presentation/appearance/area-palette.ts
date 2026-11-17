import type { FloorArea } from '../../domain/map/model.ts';
import { elevatedPublicColor, publicAreaColor, undergroundPublicColor } from './station-palette.ts';

const southernBlocks: Record<string, number> = {
    'district-osaka-ekimae-1-b1': 0xd3dfc5,
    'district-osaka-ekimae-2-b1': 0xe8d8b9,
    'district-osaka-ekimae-3-b1': 0xcbdde5,
    'district-osaka-ekimae-4-b1': 0xddd0e2,
    'district-umeda-dt-b1': 0xe7cfbf,
    'district-osaka-maru-b1': 0xc9ddd4,
    'district-e-ma-b1': 0xe7dfbc,
};
const basementAccents: Record<string, number> = {
    'building:osaka-maru': 0xc9ddd4,
};
/** Region distinction is a presentation choice, independent of access semantics. */
export function areaColor(area: FloorArea, underground = false): number {
    if (area.kind === 'public') {
        if (underground) {
            return undergroundPublicColor;
        }
        return area.railings ? elevatedPublicColor : publicAreaColor;
    }
    if (area.blockId?.startsWith('building:')) {
        if (basementAccents[area.blockId] !== undefined) {
            return basementAccents[area.blockId]!;
        }
        const colors = [
            0xd3dfc5,
            0xe8d8b9,
            0xcbdde5,
            0xddd0e2,
            0xe7cfbf,
            0xc9ddd4,
            0xe7dfbc
        ];
        const hash = Array.from(area.blockId).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
        return colors[hash % colors.length]!;
    }
    return southernBlocks[area.id] ?? {
        paid: 0xbbd1bd,
        commercial: 0xe4d4c3,
        service: 0xd7dfc4,
    }[area.kind];
}
