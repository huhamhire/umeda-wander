import { messageText } from '../../infrastructure/i18n/index.ts';

const titles = {
    overview: 'ui.heading.title',
    jrBridge: 'stations.jrOsaka.entities.jrOsaka.name',
    jrUmekita: 'stations.jrOsaka.entities.jrOsaka.name',
    jrLayers: 'stations.jrOsaka.entities.jrOsaka.name',
    jrCentral: 'stations.jrOsaka.entities.jrOsaka.name',
    hankyu: 'stations.hankyuUmeda.name',
    midosuji: 'stations.metroUmeda.name',
    tanimachi: 'stations.higashiUmeda.name',
    hanshinHall: 'stations.hanshinUmeda.name',
    hanshinPlatform: 'stations.hanshinUmeda.name',
    yotsubashi: 'stations.nishiUmeda.name',
    kitashinchi: 'stations.kitashinchi.name'
} as const;

export type TourChapter = keyof typeof titles;

/** Update the single overlay when the tour changes chapters; clear it on exit. */
export function bindTourCaption(overlay: HTMLElement) {
    const title = overlay.querySelector('h2')!;
    const description = overlay.querySelector('p')!;
    return (chapter?: TourChapter) => {
        if (!chapter) {
            overlay.hidden = true;
            return;
        }
        title.textContent = messageText(titles[chapter]);
        description.textContent = messageText(`ui.tour.${chapter}`);
        overlay.hidden = false;
    };
}
