import type {StationId} from '../domain/map/model.ts';

export const publicAreaColor=0xe9ddc3;

/** Operator identity accents; public, commercial and service areas keep shared semantics. */
export const stationPalettes={
  'jr-osaka':{paid:0xbbd1bd,gate:0x718c82,gateTop:0xa4c3a3,platform:0xb0c6ce,fence:0x587c70},
  'hankyu-umeda':{paid:0xe6d4d8,gate:0xb78d98,gateTop:0xd7bcc4,platform:0xd8ced1,fence:0xb2949d},
  'metro-umeda':{paid:0xd3d9c5,gate:0x8c5d5b,gateTop:0xc78c83,platform:0xb0c6ce,fence:0x8c5d5b},
  'hanshin-umeda':{paid:0xcbdfe8,gate:0x7999a7,gateTop:0xa9c7d6,platform:0xbad0dc,fence:0x7696a4},
  'higashi-umeda':{paid:0xe1d7e8,gate:0x9b87a7,gateTop:0xc4afd1,platform:0xc5bdce,fence:0x9b87a7},
  'nishi-umeda':{paid:0xd2e1e8,gate:0x7f9ead,gateTop:0xb2cbd8,platform:0xb6cbd8,fence:0x7e9caa},
  kitashinchi:{paid:0xcbded5,gate:0x7f9d91,gateTop:0xb0cabb,platform:0xb9ccd2,fence:0x7e9a8d},
} satisfies Record<StationId,{paid:number;gate:number;gateTop:number;platform:number;fence:number}>;
