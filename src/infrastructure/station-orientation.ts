// OSM platform-outline PCA, queried 2026-11-14; approximate, not survey bearings.
// Source records and method: docs/jr-osaka-layout.md. Data © OpenStreetMap contributors, ODbL.
export const surfaceBearingDeg = 58.35;
export const undergroundBearingDeg = 27.335;
export const undergroundRotationRad = (undergroundBearingDeg - surfaceBearingDeg) * Math.PI / 180;
// Rotate the old north/south site sketch while keeping the underground region's anchor.
export const undergroundSketchCorrectionRad = Math.PI / 2 + undergroundRotationRad;
