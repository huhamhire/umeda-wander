/** Reviewed district layout: relative corridor guides, not surveyed railway geometry. */
export const jrRailCorridors = {
    mainNorthTurn: 12 * Math.PI / 180,
    // The satellite-photo fit follows the frontages of Hankyu Osaka-Umeda Station (阪急大阪梅田駅)
    // to the north and Hankyu Umeda Main Store (阪急うめだ本店) to the south.
    // These running-road guides are illustrative and do not locate individual switches.
    eastMainRoads: [
        { along: 460, across: 6 },
        { along: 460, across: 12 },
        { along: 460, across: 18 },
        { along: 460, across: 24 }
    ],
    eastLoopRoads: [
        { along: 460, across: 30 },
        // Draw the outer road inward before the Hankyu department store (阪急うめだ本店) frontage.
        { along: 245, across: 38.5, departureHandle: 22 }
    ],
    eastMainTail: 70,
    eastLoopEnd: 530,
    // Keep the west loop south of the four main roads, but bring both bundles closer.
    westLoopAcrossMain: 18,
    // Take up the northward turn over the full fan, while the two bundles converge.
    westMergeRun: 280,
    westNorthShift: 31,
};
