import { messageText } from './i18n/index.ts';
import type { Facility, Level, Platform, VerticalConnection } from '../domain/map/model.ts';

/** Include each modeled vertical landing and platform without duplicating existing POIs. */
export function completeFacilityDirectory(existing: Facility[], connections: VerticalConnection[], platforms: Platform[], levels: Level[]): Facility[] {
    const knownPlatforms: Record<string, string> = {
        platform: 'p5-6',
        'umekita-platform': 'p21-22',
        'hankyu-umeda-kyoto-platform': 'hankyu-umeda-platform-1',
        'metro-umeda-platform-1': 'metro-umeda-island',
        'metro-umeda-platform-2': 'metro-umeda-island'
    };
    const result: Facility[] = existing.map(f => knownPlatforms[f.id] ? { ...f, kind: 'platform', platformId: knownPlatforms[f.id] } : { ...f });
    const names = {
        escalator: messageText('facilities.types.escalator'),
        elevator: messageText('facilities.types.elevator'),
        stairs: messageText('facilities.types.stairs')
    };
    const caption = (id: string) => {
        if (id.startsWith('public-north')) {
            return messageText('facilities.locations.northAtrium');
        }
        if (id.startsWith('public-umekita')) {
            return messageText('facilities.locations.umekitaPublic');
        }
        if (id.startsWith('public-jp')) {
            return messageText('facilities.locations.jpDeck');
        }
        if (id.startsWith('grand-front-plaza')) {
            return messageText('facilities.locations.grandFrontPlaza');
        }
        if (id.startsWith('public-south')) {
            return messageText('facilities.locations.southBridge');
        }
        if (id.startsWith('jp-garden')) {
            return messageText('facilities.locations.jpGarden');
        }
        if (id.startsWith('district-jr-metro')) {
            return messageText('facilities.locations.jrMetro');
        }
        if (id.startsWith('hankyu')) {
            return messageText('facilities.locations.hankyu');
        }
        if (id.startsWith('metro')) {
            return messageText('facilities.locations.midosuji');
        }
        if (id.startsWith('hanshin')) {
            return messageText('facilities.locations.hanshin');
        }
        if (id.startsWith('higashi')) {
            return messageText('facilities.locations.higashiUmeda');
        }
        if (id.startsWith('nishi')) {
            return messageText('facilities.locations.nishiUmeda');
        }
        if (id.startsWith('kitashinchi')) {
            return messageText('facilities.locations.kitashinchi');
        }
        if (id.startsWith('walkway') || id.startsWith('umekita') || id === 'west-92') {
            return messageText('facilities.locations.umekitaWalkway');
        }
        if (id.startsWith('north')) {
            return messageText('facilities.locations.northAtrium');
        }
        if (id.startsWith('carillon')) {
            return messageText('facilities.locations.carillon');
        }
        if (id.startsWith('central')) {
            return messageText('facilities.locations.centralGate');
        }
        if (id.startsWith('sakura')) {
            return messageText('facilities.locations.sakurabashi');
        }
        if (id.startsWith('west')) {
            return messageText('facilities.locations.westGate');
        }
        if (id.startsWith('mido')) {
            return messageText('facilities.locations.midosujiGate');
        }
        if (id.startsWith('crost')) {
            return 'Crost';
        }
        return messageText('facilities.locations.southPublic');
    };
    for (const c of connections) {
        for (const [side, p] of [['from', c.from], ['to', c.to]] as const) {
            const match = result.find(f => f.kind === c.kind && f.level === p.level && Math.hypot(f.x - p.x, f.z - p.z) < 0.01 && (f.elevationOffset ?? 0) === (p.elevationOffset ?? 0));
            if (match) {
                match.connectionId = c.id;
                continue;
            }
            const platform = platforms.find(p => p.id === c.platformId);
            const from = levels.find(l => l.id === c.from.level)!;
            const to = levels.find(l => l.id === c.to.level)!;
            const destination = platform ? (platform.name ?? messageText('facilities.labels.platformTracks', { tracks: platform.tracks.join('/') })) : `${from.label} ↔ ${to.label}`;
            result.push({
                id: `connection-${c.id}-${side}`,
                connectionId: c.id,
                name: messageText(
                    'facilities.labels.connection',
                    { location: caption(c.id), kind: names[c.kind], destination: destination }
                ),
                kind: c.kind,
                level: p.level,
                x: p.x,
                z: p.z,
                elevationOffset: p.elevationOffset,
                note: '',
                evidence: c.evidence
            });
        }
    }
    for (const p of platforms) {
        if (result.some(f => f.platformId === p.id)) {
            continue;
        }
        result.push({
            id: `platform-${p.id}`,
            platformId: p.id,
            kind: 'platform',
            name: p.name ?? messageText('facilities.labels.platformName', { tracks: p.tracks.join('/') }),
            level: p.level,
            x: p.x,
            z: p.z,
            note: '',
            evidence: p.evidence
        });
    }
    return result;
}
