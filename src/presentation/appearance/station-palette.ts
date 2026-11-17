import type { StationId } from '../../domain/map/model.ts';

export const publicAreaColor = 0xe9ddc3;
/** Warm ochre separates elevated public walks from pale commercial footprints. */
export const elevatedPublicColor = 0xbf9657;
/** Underground public spaces retain warm beige with more separation from paper. */
export const undergroundPublicColor = 0xd3c4a4;
/** Operator identity accents; public, commercial and service areas keep shared semantics. */
export const stationPalettes = {
    'jr-osaka': {
        paid: 0xd7e1ea,
        gate: 0x8198aa,
        gateTop: 0xb1c5d6,
        platform: 0xbdcfdd,
        fence: 0x8097a7
    },
    'hankyu-umeda': {
        paid: 0xe6d4d8,
        gate: 0xb78d98,
        gateTop: 0xd7bcc4,
        platform: 0xe6cbd1,
        fence: 0xb2949d
    },
    'metro-umeda': {
        paid: 0xead8d5,
        gate: 0xb68c87,
        gateTop: 0xd8b5ad,
        platform: 0xe0c9c4,
        fence: 0xb2918b
    },
    'hanshin-umeda': {
        paid: 0xcbdfe8,
        gate: 0x7999a7,
        gateTop: 0xa9c7d6,
        platform: 0xbad0dc,
        fence: 0x7696a4
    },
    'higashi-umeda': {
        paid: 0xe1d7e8,
        gate: 0x9b87a7,
        gateTop: 0xc4afd1,
        platform: 0xc5bdce,
        fence: 0x9b87a7
    },
    'nishi-umeda': {
        paid: 0xd2e1e8,
        gate: 0x7f9ead,
        gateTop: 0xb2cbd8,
        platform: 0xb6cbd8,
        fence: 0x7e9caa
    },
    kitashinchi: {
        paid: 0xe7d8df,
        gate: 0xad8c9d,
        gateTop: 0xd3b8c6,
        platform: 0xdac7d1,
        fence: 0xa78d9c
    },
} satisfies Record<StationId, {
    paid: number;
    gate: number;
    gateTop: number;
    platform: number;
    fence: number;
}>;
