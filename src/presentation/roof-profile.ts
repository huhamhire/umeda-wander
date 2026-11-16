/** Roof relief in scene units: station north side is -Z, south side is +Z. */
export const roofPlan={centerX:-6,width:88};
export function roofHeightAt(z: number): number {
  return 2.5 + (36 - z) * 0.15 + Math.cos(z / 72 * Math.PI) * 1.5;
}

/** Geographic roof relative to its 26 m base: north meets the 48 m retail roof. */
export function geographicRoofHeightAt(z:number):number {
 return 8+(36-z)*14/72+Math.sin((z+36)/72*Math.PI)*1.2;
}
