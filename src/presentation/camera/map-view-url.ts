import type { FacilityKind, LevelId, StationId } from '../../domain/map/model.ts';
import type { NavigationData } from '../../application/exploration/navigation-data.ts';
import { maxWalkingStops } from '../../application/navigation/walking-route.ts';

export interface ShareCamera {
    center: [number, number, number];
    yaw: number;
    pitch: number;
    zoom: number;
    span: number;
}

export interface ShareFilters {
    station: StationId | null;
    level: LevelId | 'all';
    kind: FacilityKind | 'all';
}

export interface SharedMapView {
    camera: ShareCamera;
    level: LevelId | 'all';
    station: StationId | null;
    facility?: string;
    explode: number;
    buildings: boolean;
    ground: boolean;
    tab: 'layers' | 'facilities' | 'walking';
    filters: ShareFilters;
    itinerary?: { ids: string[]; allowPaid: boolean };
}

/** Check that a user-supplied number is finite and within the supported display range. */
function between(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Read an optional versioned share state and resolve identifiers against the current map. */
export function readMapView(url: URL, data: NavigationData): SharedMapView | undefined {
    const encoded = url.searchParams.get('view');
    if (!encoded || encoded.length > 4096) {
        return undefined;
    }
    let raw: Partial<SharedMapView> & { v?: number };
    try {
        raw = JSON.parse(encoded);
    } catch {
        return undefined;
    }
    const camera = raw?.camera;
    if (raw?.v !== 1 || !Array.isArray(camera?.center) || camera.center.length !== 3 ||
        !camera.center.every(value => between(value, -100000, 100000)) ||
        !between(camera.yaw, -180, 180) || !between(camera.pitch, 15, 80) ||
        !between(camera.zoom, .001, 10000) || !between(camera.span, .01, 100000)) {
        return undefined;
    }
    const level = (id: unknown) => data.levels.find(item => item.id === id)?.id ?? 'all' as const;
    const station = (id: unknown) => data.stations.find(item => item.id === id)?.id ?? null;
    const route = raw.itinerary;
    const itinerary = Array.isArray(route?.ids) && route.ids.length >= 2 && route.ids.length <= maxWalkingStops + 2 &&
        route.ids.every(id => data.walkingPlaces.some(place => place.id === id))
        ? { ids: route.ids, allowPaid: route.allowPaid === true }
        : undefined;
    const kind = raw.filters?.kind;
    return {
        camera,
        level: level(raw.level),
        station: station(raw.station),
        facility: data.facilities.find(item => item.id === raw.facility)?.id,
        explode: between(raw.explode, 0, 1.5) ? raw.explode : 0,
        buildings: raw.buildings !== false,
        ground: raw.ground !== false,
        tab: raw.tab === 'walking' || raw.tab === 'facilities' ? raw.tab : 'layers',
        filters: {
            station: station(raw.filters?.station),
            level: level(raw.filters?.level),
            kind: kind && (kind === 'all' || data.facilities.some(item => item.kind === kind)) ? kind : 'all'
        },
        itinerary
    };
}

/** Round to sub-decimetre precision in scene space while keeping a copied URL compact. */
function round(value: number): number {
    return Number(value.toFixed(3));
}

/** Replace only the view parameter, keeping the address path, hash and existing query parameters. */
export function mapViewUrl(url: URL, view: SharedMapView): URL {
    const next = new URL(url);
    const { camera } = view;
    next.searchParams.set('view', JSON.stringify({
        v: 1,
        ...view,
        camera: {
            center: camera.center.map(round),
            yaw: round(camera.yaw),
            pitch: round(camera.pitch),
            zoom: round(camera.zoom),
            span: round(camera.span)
        }
    }));
    return next;
}

/** Coalesce settled changes such as a wheel burst without adding browser history entries. */
export function bindMapViewUrl(
    read: () => SharedMapView | undefined,
    browser: Pick<Window, 'history' | 'location' | 'setTimeout' | 'clearTimeout'> = window
): () => void {
    let pending: number | undefined;
    return () => {
        browser.clearTimeout(pending);
        pending = browser.setTimeout(() => {
            pending = undefined;
            const view = read();
            if (!view) {
                return;
            }
            const next = mapViewUrl(new URL(browser.location.href), view);
            if (next.href !== browser.location.href) {
                try {
                    browser.history.replaceState(browser.history.state, '', next);
                } catch {
                    // A restricted document should keep working when address updates are unavailable.
                }
            }
        }, 180);
    };
}
