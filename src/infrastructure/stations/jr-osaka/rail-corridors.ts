/** Reviewed district layout: relative corridor guides, not surveyed railway geometry. */
export const jrRailCorridors = {
  mainNorthTurn: 12 * Math.PI / 180,
  // Pass north of Hankyu Department Store before turning east toward Kyobashi.
  eastLoopThroat: { x: 663.0, z: 513.5 },
  eastLoopTurn: 20 * Math.PI / 180,
  // Keep the west loop south of the four main roads, but bring both bundles closer.
  westLoopAcrossMain: 23,
};
