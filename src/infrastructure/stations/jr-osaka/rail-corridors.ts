/** Reviewed district layout: relative corridor guides, not surveyed railway geometry. */
export const jrRailCorridors = {
    mainNorthTurn: 12 * Math.PI / 180,
    // Manual satellite-photo fit: Hankyu's south frontage bounds the north side,
    // the department-store frontage bounds the south. These are illustrative
    // running-road guides, not surveyed switches or a uniform throat transform.
    eastMainRoads: [
        { along: 460, across: 6 },
        { along: 460, across: 12 },
        { along: 460, across: 18 },
        { along: 460, across: 24 }
    ],
    eastLoopRoads: [
        { along: 460, across: 30 },
        { along: 460, across: 36 }
    ],
    eastMainTail: 70,
    eastLoopTail: 70,
    // Keep the west loop south of the four main roads, but bring both bundles closer.
    westLoopAcrossMain: 18,
};
