import type {StationId} from '../domain/map/model.ts';

/** Operator identity accents; public, commercial and service areas keep shared semantics. */
export const stationPalettes={
  'jr-osaka':{paid:0xbbd1bd,gate:0x718c82,gateTop:0xa4c3a3,platform:0xb0c6ce,fence:0x587c70},
  'hankyu-umeda':{paid:0xe6d4d8,gate:0xb78d98,gateTop:0xd7bcc4,platform:0xd8ced1,fence:0xb2949d},
  'metro-umeda':{paid:0xd3d9c5,gate:0x8c5d5b,gateTop:0xc78c83,platform:0xb0c6ce,fence:0x8c5d5b},
} satisfies Record<StationId,{paid:number;gate:number;gateTop:number;platform:number;fence:number}>;
