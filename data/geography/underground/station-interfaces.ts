import type {Point} from './network.ts';

/** Reference-map footprint; station PDF supplies topology/level, not survey geometry. */
export const kitashinchiInterface={
 station:'kitashinchi',
 source:'references/北新地.pdf',page:1,
 footprint:[[397,613],[560,623],[560,648],[397,638]] as Point[],
 publicBand:[[397,613],[560,623],[560,634],[397,624]] as Point[],
 label:[475,645] as Point,
 note:'B1 闸外站厅与西梅田方向、DIAMOR、御堂筋方向公共通道共用接口。平面范围按地区图估计；不合并闸内和 B2 站台。',
};
