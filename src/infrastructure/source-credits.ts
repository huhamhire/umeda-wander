import { messageText } from './i18n/index.ts';

/** Public credits only. Do not infer a licence from an accessible PDF or screenshot. */
export interface CreditLink {
    label: string;
    url: string;
}

export interface SourceCredit {
    name: string;
    use: string;
    links: CreditLink[];
    attribution: string;
    licence?: CreditLink;
    status?: string;
    download?: 'osm';
}

export interface SourceCredits {
    description: string;
    project: {
        repository?: CreditLink;
        licence?: CreditLink;
        feedback?: CreditLink;
    };
    data: SourceCredit[];
    references: SourceCredit[];
}

/**
 * Create a named public source link without inferring permission from its availability.
 */
const link = (label: string, url: string): CreditLink => ({ label, url });
const jr = link(
    messageText('credits.links.jr.label'),
    'https://www.westjr.co.jp/global/en/timetable/pdf/station_osaka.pdf'
);
const hankyu = link(
    messageText('credits.links.hankyu.label'),
    'https://www.hankyu.co.jp/global/common/pdf/station_guide/umeda.pdf'
);
const hanshin = link(messageText('credits.links.hanshin.label'), 'https://www.hanshin.co.jp/uploads/guidemap/umeda.pdf');
const metro = ['M16_梅田', 'T20_東梅田', 'Y11_西梅田'].map(name => link(
    name.split('_')[1] + messageText('credits.labels.stationPlanSuffix'),
    `https://subway.osakametro.co.jp/station_guide/station/${encodeURIComponent(name + '_構内図')}.pdf`
));
const kitashinchi = link(messageText('credits.links.kitashinchi.label'), 'https://eki.jr-odekake.net/premises?id=0612303');
const city = link(
    messageText('credits.links.city.label'),
    'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda02-3%28202404%29.pdf'
);
const cityRoute = link(
    messageText('credits.links.cityRoute.label'),
    'https://www.city.osaka.lg.jp/toshikeikaku/cmsfiles/contents/0000369/369380/umeda01-5-2%28202109%29.pdf'
);
const jp = link(
    messageText('credits.links.jp.label'),
    'https://www.post.japanpost.jp/notification/productinformation/2023/1027_01_01.pdf'
);
const umedaMap = link(
    messageText('credits.links.umedaMap.label'),
    'https://umeda-sc.jp/wp2/wp-content/uploads/2020/03/map_tw.pdf'
);
const umekita = link(
    messageText('credits.links.umekita.label'),
    'https://www.westjr.co.jp/press/article/2025/02/page_27332.html'
);
const pending = messageText('credits.permissions.pending');
const plateau = link(
    messageText('credits.links.plateau.label'),
    'https://www.geospatial.jp/ckan/dataset/plateau-27100-osaka-shi-2025'
);
export const sourceCredits: SourceCredits = {
    description: messageText('credits.projectDescription'),
    // No public remote, project LICENSE or verified feedback channel in this repository.
    project: {},
    data: [
        {
            name: messageText('credits.data.plateau.name'),
            use: messageText('credits.data.plateau.use'),
            links: [
                plateau,
                link(messageText('credits.links.plateauPolicy.label'), 'https://www.mlit.go.jp/plateau/site-policy/')
            ],
            licence: link(messageText('credits.links.ccBy.label'), 'https://creativecommons.org/licenses/by/4.0/'),
            attribution: messageText('credits.data.plateau.attribution')
        },
        {
            name: messageText('credits.data.osm.name'),
            use: messageText('credits.data.osm.use'),
            links: [link(messageText('credits.links.osmCopyright.label'), 'https://www.openstreetmap.org/copyright')],
            licence: link('Open Database License 1.0（ODbL）', 'https://opendatacommons.org/licenses/odbl/1-0/'),
            attribution: '© OpenStreetMap contributors',
            download: 'osm'
        },
        {
            name: messageText('credits.data.jr.name'),
            use: messageText('credits.data.jr.use'),
            links: [jr, kitashinchi],
            attribution: messageText('credits.data.jr.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.hankyuStation.name'),
            use: messageText('credits.data.hankyuStation.use'),
            links: [hankyu],
            attribution: messageText('credits.data.hankyuStation.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.hankyuConcourse.name'),
            use: messageText('credits.data.hankyuConcourse.use'),
            links: [
                link(
                    messageText('credits.links.hankyuConcourse.label'),
                    'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf'
                ),
                link(messageText('credits.links.hankyuDepartment.label'), 'https://website.hankyu-dept.co.jp/honten/about/'),
            ],
            attribution: messageText('credits.data.hankyuConcourse.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.hanshin.name'),
            use: messageText('credits.data.hanshin.use'),
            links: [hanshin],
            attribution: messageText('credits.data.hanshin.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.metro.name'),
            use: messageText('credits.data.metro.use'),
            links: metro,
            attribution: messageText('credits.data.metro.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.walkways.name'),
            use: messageText('credits.data.walkways.use'),
            links: [
                city,
                cityRoute,
                umedaMap,
                jp,
                umekita
            ],
            attribution: messageText('credits.data.walkways.attribution'),
            status: pending
        },
        {
            name: messageText('credits.data.grandFront.name'),
            use: messageText('credits.data.grandFront.use'),
            links: [
                link(
                    messageText('credits.links.grandFrontFirstFloor.label'),
                    'https://www.gfo-sc.jp/information/floor/umekita/1f/'
                ),
                link(
                    messageText('credits.links.grandFrontBasement.label'),
                    'https://www.gfo-sc.jp/information/floor/umekita/b1f/'
                ),
            ],
            attribution: messageText('credits.data.grandFront.attribution'),
            status: pending,
        },
        {
            name: messageText('credits.data.procedural.name'),
            use: messageText('credits.data.procedural.use'),
            links: [
                link(messageText('credits.links.hanshinArchitecture.label'), 'https://www.nihonsekkei.co.jp/projects/18825/'),
                link(
                    messageText('credits.links.jpArchitecture.label'),
                    'https://www.jp-re.japanpost.jp/properties/jptower-osaka.html'
                ),
                link(messageText('credits.links.sanbangaiFloors.label'), 'https://www.h-sanbangai.com/floor/'),
                link(messageText('credits.links.hepWheel.label'), 'https://www.hepfive.jp/ferriswheel'),
                link(
                    messageText('credits.links.jrRoof.label'),
                    'https://www.city.osaka.lg.jp/toshiseibi/page/0000647324.html'
                ),
            ],
            attribution: messageText('credits.data.procedural.attribution'),
            status: messageText('credits.data.procedural.status')
        },
    ],
    references: [
        {
            name: messageText('credits.references.stations.name'),
            use: messageText('credits.references.stations.use'),
            links: [
                jr,
                kitashinchi,
                hankyu,
                hanshin,
                ...metro
            ],
            attribution: messageText('credits.references.stations.attribution')
        },
        {
            name: messageText('credits.references.cityWalkways.name'),
            use: messageText('credits.references.cityWalkways.use'),
            links: [city, cityRoute],
            attribution: messageText('credits.references.cityWalkways.attribution')
        },
        {
            name: messageText('credits.references.jpConcourse.name'),
            use: messageText('credits.references.jpConcourse.use'),
            links: [
                jp,
                link(
                    messageText('credits.links.hankyuConcourse.label'),
                    'https://www.hankyu.co.jp/company/news/pdf/ER201209194N1.pdf'
                )
            ],
            attribution: messageText('credits.references.jpConcourse.attribution')
        },
        {
            name: messageText('credits.references.commercial.name'),
            use: messageText('credits.references.commercial.use'),
            links: [
                link(messageText('credits.links.daimaruAccess.label'), 'https://www.daimaru.co.jp/umedamise/access.html'),
                link(messageText('credits.links.lucuaAccess.label'), 'https://www.lucua.jp/access/'),
                link(messageText('credits.links.grandFrontAccess.label'), 'https://www.gfo-ad.jp/access.html'),
                link(
                    messageText('credits.links.hanshinArchitecture.referenceLabel'),
                    'https://www.nihonsekkei.co.jp/projects/18825/'
                ),
                link(messageText('credits.links.respire.label'), 'https://www.hankyu-hotel.com/hotel/respire/osaka/info/')
            ],
            attribution: messageText('credits.references.commercial.attribution')
        },
        {
            name: messageText('credits.references.userSupplied.name'),
            use: messageText('credits.references.userSupplied.use'),
            links: [umedaMap, umekita],
            attribution: messageText('credits.references.userSupplied.attribution')
        },
    ],
};
