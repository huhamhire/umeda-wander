import * as T from 'three';
import { colors } from './scene-palette.ts';
import { elevatedPublicColor, publicAreaColor, stationPalettes, undergroundPublicColor } from './station-palette.ts';

const nightSurfaces = new Map<number, number>([
    [publicAreaColor, 0x505553],
    [elevatedPublicColor, 0x736754],
    [undergroundPublicColor, 0x555144],
    [0xe4d4c3, 0x414545],
    [0xd7dfc4, 0x3f4544],
    // Keep large basement footprints subordinate to the surrounding walking network.
    [0xd3dfc5, 0x38423e],
    [0xe8d8b9, 0x41423c],
    [0xcbdde5, 0x3b4447],
    [0xddd0e2, 0x404047],
    [0xe7cfbf, 0x44413c],
    [0xc9ddd4, 0x3a4340],
    [0xe7dfbc, 0x41433c],
    [stationPalettes['jr-osaka'].paid, 0x434f57],
    [stationPalettes['jr-osaka'].platform, 0x4d5d67],
    [stationPalettes['hankyu-umeda'].paid, 0x50474b],
    [stationPalettes['hankyu-umeda'].platform, 0x5e5156],
    [stationPalettes['metro-umeda'].paid, 0x514a47],
    [stationPalettes['metro-umeda'].platform, 0x5f5450],
    [stationPalettes['hanshin-umeda'].paid, 0x424f54],
    [stationPalettes['hanshin-umeda'].platform, 0x4b5b62],
    [stationPalettes['higashi-umeda'].paid, 0x4a4650],
    [stationPalettes['higashi-umeda'].platform, 0x56515f],
    [stationPalettes['nishi-umeda'].paid, 0x404f54],
    [stationPalettes['nishi-umeda'].platform, 0x4a5b60],
    [stationPalettes.kitashinchi.paid, 0x4c464d],
    [stationPalettes.kitashinchi.platform, 0x59505a],
    [0x90b6c5, 0x4a626a], // Umekita (うめきた) platforms.
    [colors.roof, 0x47565a],
    [colors.white, 0x596561],
    [colors.glass, 0x405459],
    [0x99bdc3, 0x4e6469], // JR skylight stripes.
    [0xb9bcae, 0x404640],
    [0x939c8e, 0x535b54],
    [0x6d7c77, 0x758782],
    [0xb85b61, 0xa65760] // HEP FIVE wheel.
]);

export const darkContextColor = 0x343f41;

/** Give key surfaces distinct night colours, retaining the hues of smaller fittings. */
export function applyNightColor(color: T.Color, override?: number): void {
    const surface = override ?? nightSurfaces.get(color.getHex());
    if (surface !== undefined) {
        color.setHex(surface);
        return;
    }
    const { h, s, l } = color.getHSL({ h: 0, s: 0, l: 0 }, T.SRGBColorSpace);
    color.setHSL(h, Math.min(.2, s * .4), .23 + l * .14, T.SRGBColorSpace);
}
