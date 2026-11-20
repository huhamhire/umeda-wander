import type { LevelId, StationId } from '../../domain/map/model.ts';
import type { NavigationData } from '../../application/exploration/navigation-data.ts';
import { maxWalkingStops } from '../../application/navigation/walking-route.ts';
import { cameraPitchDegrees } from './pitch-limits.ts';

export interface ShareCamera {
    center: [number, number, number];
    yaw: number;
    pitch: number;
    span: number;
}

export interface SharedMapView {
    camera: ShareCamera;
    level: LevelId | 'all';
    station: StationId | null;
    facility?: string;
    explode: number;
    buildings: boolean;
    ground: boolean;
    itinerary?: { ids: string[]; allowPaid: boolean };
}

/** Check that a user-supplied number is finite and within the supported display range. */
function between(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Restore a complete camera frame and resolve optional IDs against the current map. */
export function readMapView(url: URL, data: NavigationData): SharedMapView | undefined {
    const params = url.searchParams;
    const numericField = (name: string) => {
        const value = params.get(name)?.trim();
        return value ? Number(value) : NaN;
    };
    const camera: ShareCamera = {
        center: [numericField('x'), numericField('y'), numericField('z')],
        yaw: numericField('yaw'),
        pitch: numericField('pitch'),
        span: numericField('span')
    };
    if (!camera.center.every(value => between(value, -100000, 100000)) ||
        !between(camera.yaw, -180, 180) || !between(camera.pitch, cameraPitchDegrees.min, cameraPitchDegrees.max) ||
        !between(camera.span, .01, 100000)) {
        return undefined;
    }
    const level = (id: unknown) => data.levels.find(item => item.id === id)?.id ?? 'all' as const;
    const station = (id: unknown) => data.stations.find(item => item.id === id)?.id ?? null;
    const stops = params.getAll('stop');
    const itinerary = stops.length >= 2 && stops.length <= maxWalkingStops + 2 &&
        stops.every(id => data.walkingPlaces.some(place => place.id === id) || data.walkingApproaches.some(([facilityId]) => facilityId === id))
        ? { ids: stops, allowPaid: params.get('allow-paid') !== '0' }
        : undefined;
    const explode = numericField('explode');
    return {
        camera,
        level: level(params.get('level')),
        station: station(params.get('station')),
        facility: data.facilities.find(item => item.id === params.get('facility'))?.id,
        explode: between(explode, 0, 1.5) ? explode : 0,
        buildings: params.get('buildings') !== '0',
        ground: params.get('ground') !== '0',
        itinerary
    };
}

/** Round to sub-decimetre precision in scene space while keeping a copied URL compact. */
function round(value: number): number {
    return Number(value.toFixed(3));
}

/** Replace the named share parameters while preserving the path, hash and unrelated query parameters. */
export function mapViewUrl(url: URL, view: SharedMapView): URL {
    const next = new URL(url);
    const { camera } = view;
    const params = next.searchParams;
    for (const name of new Set(params.keys())) {
        if (name === 'view' || name.startsWith('view.')) {
            params.delete(name);
        }
    }
    const fields = {
        x: round(camera.center[0]),
        y: round(camera.center[1]),
        z: round(camera.center[2]),
        yaw: round(camera.yaw),
        pitch: round(camera.pitch),
        span: round(camera.span),
        level: view.level === 'all' ? undefined : view.level,
        station: view.station,
        facility: view.facility,
        explode: view.explode || undefined,
        buildings: view.buildings ? undefined : 0,
        ground: view.ground ? undefined : 0,
        'allow-paid': view.itinerary?.allowPaid === false ? 0 : undefined
    };
    for (const [name, value] of Object.entries(fields)) {
        if (value == null) {
            params.delete(name);
        }
        else {
            params.set(name, String(value));
        }
    }
    params.delete('stop');
    for (const stop of view.itinerary?.ids ?? []) {
        params.append('stop', stop);
    }
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
