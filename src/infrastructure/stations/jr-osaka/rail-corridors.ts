/** Reviewed district layout: relative corridor guides, not surveyed railway geometry. */
export const jrRailCorridors = {
    // The satellite-photo fit follows the frontages of Hankyu Osaka-Umeda Station (阪急大阪梅田駅)
    // to the north and Hankyu Umeda Main Store (阪急うめだ本店) to the south.
    // These running-road guides are illustrative and do not locate individual switches.
    eastMainRoads: [
        { along: 460, across: 6 },
        { along: 460, across: 12 },
        { along: 460, across: 18 },
        { along: 460, across: 24 }
    ],
    eastMainTail: 70,
    // Fit the Osaka Loop Line (大阪環状線) pair against both source centrelines and
    // the Hankyu department store (阪急うめだ本店) / HEP FIVE frontages.
    eastLoop: {
        along: 270,
        innerAcross: 32,
        spacing: 4.8,
        outerDepartureHandle: 22,
        endAlong: 530,
        endAcrossShift: 10.7,
        endHeadingOffset: 7 * Math.PI / 180,
        sourceWays: [139439191, 91831267]
    },
    // OSM Tokaido Main Line (東海道本線) and Osaka Loop Line (大阪環状線) turn
    // gradually toward the south side of the platform axis beyond the west apron.
    westAlong: -550,
    westMainAcross: 30,
    westLoopAcross: 54,
    westHeadingOffset: -8 * Math.PI / 180,
    westSourceWays: { main: [200902479, 200875165], loop: [23853069, 91831268] }
};
