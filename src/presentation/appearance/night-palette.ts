import * as T from 'three';
import { colors } from './scene-palette.ts';
import { elevatedPublicColor, publicAreaColor, stationPalettes, undergroundPublicColor } from './station-palette.ts';

const nightSurfaces = new Map<number, number>([
    [publicAreaColor, 0x615b4d],
    [elevatedPublicColor, 0x9b7548],
    [undergroundPublicColor, 0x62543f],
    [0xe4d4c3, 0x554c43],
    [0xd7dfc4, 0x4e5749],
    [stationPalettes['jr-osaka'].paid, 0x425a6b],
    [stationPalettes['jr-osaka'].platform, 0x4c6679],
    [stationPalettes['hankyu-umeda'].paid, 0x614958],
    [stationPalettes['hankyu-umeda'].platform, 0x705163],
    [stationPalettes['metro-umeda'].paid, 0x624c48],
    [stationPalettes['metro-umeda'].platform, 0x75564e],
    [stationPalettes['hanshin-umeda'].paid, 0x3d5660],
    [stationPalettes['hanshin-umeda'].platform, 0x486571],
    [stationPalettes['higashi-umeda'].paid, 0x524761],
    [stationPalettes['higashi-umeda'].platform, 0x625578],
    [stationPalettes['nishi-umeda'].paid, 0x395962],
    [stationPalettes['nishi-umeda'].platform, 0x416975],
    [stationPalettes.kitashinchi.paid, 0x594b60],
    [stationPalettes.kitashinchi.platform, 0x6d5670],
    [0x90b6c5, 0x3d6675], // Umekita platforms.
    [colors.roof, 0x485b62],
    [colors.white, 0x65726e],
    [colors.glass, 0x2f555f],
    [0x99bdc3, 0x446d78], // JR skylight stripes.
    [0xb9bcae, 0x404640],
    [0x939c8e, 0x535b54],
    [0x6d7c77, 0x758782],
    [0xb85b61, 0xa65760] // HEP FIVE wheel.
]);

export const darkContextColor = 0x364348;

/** Give key surfaces distinct night colours, retaining the hues of smaller fittings. */
export function applyNightColor(color: T.Color, override?: number): void {
    const surface = override ?? nightSurfaces.get(color.getHex());
    if (surface !== undefined) {
        color.setHex(surface);
        return;
    }
    const { h, s, l } = color.getHSL({ h: 0, s: 0, l: 0 }, T.SRGBColorSpace);
    color.setHSL(h, Math.min(0.5, s * 1.15), 0.24 + l * 0.2, T.SRGBColorSpace);
}
