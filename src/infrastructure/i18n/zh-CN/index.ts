import uiMessages from './ui.json' with { type: 'json' };
import stationsMessages from './stations.json' with { type: 'json' };
import buildingsMessages from './buildings.json' with { type: 'json' };
import publicAreasMessages from './public-areas.json' with { type: 'json' };
import facilitiesMessages from './facilities.json' with { type: 'json' };
import railwaysMessages from './railways.json' with { type: 'json' };
import creditsMessages from './credits.json' with { type: 'json' };

/** Chinese source messages grouped by domain; future locales reuse these keys. */
export const chineseMessages = {
    ...uiMessages,
    ...stationsMessages,
    ...buildingsMessages,
    ...publicAreasMessages,
    ...facilitiesMessages,
    ...railwaysMessages,
    ...creditsMessages,
} as const;
