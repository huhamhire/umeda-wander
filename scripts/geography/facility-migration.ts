import type { Facility, LevelId, StationLayout } from '../../src/domain/map/model.ts';
import baseline from '../../tests/fixtures/legacy-facilities.json' with { type: 'json' };

/** Reviewed replacements, not permission to silently drop old equipment. */
export const connectionMigrations: Record<string, {
    id: string;
    levels: [
        LevelId,
        LevelId
    ];
    reason: string;
}> = {
    'south-building-74': {
        id: 'south-entrance-east-escalators',
        levels: ['concourse', 'south-deck'],
        reason: 'South entrance east paired bank rebuilt beside 61 from the facade reference.',
    },
    'jp-garden-ground-deck-stairs': {
        id: 'public-jp-deck-stairs',
        levels: ['district-ground', 'district-south-deck'],
        reason: 'Same JP exterior 1F–2F stair now owned by the public deck block.',
    },
    'jp-garden-lift-1': {
        id: 'public-jp-deck-lift',
        levels: ['district-ground', 'district-south-deck'],
        reason: 'Same upper JP shaft segment now owned by the public deck block.',
    },
    'jp-garden-lift-0': {
        id: 'jp-garden-lift-0',
        levels: ['district-underground', 'district-ground'],
        reason: 'Restored lower JP shaft on the common public B1 elevation.',
    },
    'jp-garden-b1-ground-stairs': {
        id: 'jp-garden-b1-ground-stairs',
        levels: ['district-underground', 'district-ground'],
        reason: 'Restored source-confirmed sunken garden stair on the common public B1 elevation.',
    },
    'umeda-deck-north-stairs': {
        id: 'umeda-deck-north-stairs',
        levels: ['district-ground', 'district-south-deck'],
        reason: 'Restored perimeter bridge stair, independent of JR paid floors.',
    },
    'district-jr-metro-stairs': {
        id: 'district-jr-metro-stairs',
        levels: ['concourse', 'district-underground'],
        reason: 'Public JR–Metro stair lower landing joins the shared public B1 owner.',
    },
};
/**
 * Audit legacy IDs, equipment semantics, landing positions and codes individually rather than balancing totals.
 */
export function auditFacilityMigration(layout: StationLayout, facilities: Facility[], codes: Record<string, string>) {
    const issues: string[] = [];
    const aliases: {
        previous: string;
        current: string;
    }[] = [];
    const connections = new Map(layout.connections.map(c => [c.id, c]));
    const directory = new Map(facilities.map(f => [f.id, f]));
    if (connections.size !== layout.connections.length || directory.size !== facilities.length) {
        issues.push('Duplicate connection or facility ID');
    }
    for (const c of baseline.connections) {
        const migration = connectionMigrations[c.id];
        const current = connections.get(migration?.id ?? c.id);
        const expectedLevels = migration?.levels ?? [c.from, c.to];
        if (!current) {
            issues.push('Missing connection: ' + c.id);
            continue;
        }
        if (current.kind !== c.kind || current.platformId !== c.platformId ||
            current.from.level !== expectedLevels[0] || current.to.level !== expectedLevels[1] ||
            (current.lanes ?? 1) < c.lanes) {
            issues.push('Changed connection semantics: ' + c.id);
        }
    }
    for (const station of baseline.stations) {
        for (const p of station.platforms) {
            const current = layout.platforms.find(n => n.id === p.id);
            if (!current || current.level !== p.level || current.tracks.join('/') !== p.tracks.join('/')) {
                issues.push('Missing or changed platform: ' + p.id);
            }
        }
        for (const f of station.facilities) {
            if (!directory.has(f.id)) {
                issues.push('Missing authored facility: ' + f.id);
            }
        }
    }
    for (const f of baseline.directory) {
        const migration = f.connectionId ? connectionMigrations[f.connectionId] : undefined;
        const previous = baseline.connections.find(c => c.id === f.connectionId);
        const endpoint = previous && (f.id === `connection-${previous.id}-to` || f.level !== previous.from ? 'to' : 'from');
        const target = f.connectionId ? connections.get(migration?.id ?? f.connectionId) : undefined;
        const landing = target && endpoint ? target[endpoint] : undefined;
        const level = landing?.level ?? f.level;
        const current = directory.get(f.id) ?? (landing && facilities.find(n => n.kind === f.kind && n.level === level && Math.hypot(n.x - landing.x, n.z - landing.z) < .01 &&
            (n.elevationOffset ?? 0) === (landing.elevationOffset ?? 0)));
        if (!current) {
            issues.push('Missing directory candidate: ' + f.id);
            continue;
        }
        if (current.kind !== f.kind || current.level !== level) {
            issues.push('Changed directory semantics: ' + f.id);
        }
        if (landing && Math.hypot(current.x - landing.x, current.z - landing.z) >= .01) {
            issues.push('Directory candidate misses actual landing: ' + f.id);
        }
        if (current.id === f.id && codes[current.id] !== f.code) {
            issues.push('Renumbered facility: ' + f.id);
        }
        if (current.id !== f.id) {
            aliases.push({ previous: f.id, current: current.id });
        }
    }
    return {
        baseline: baseline.provenance,
        previous: { facilities: baseline.directory.length, connections: baseline.connections.length },
        current: { facilities: facilities.length, connections: layout.connections.length },
        aliases,
        issues,
    };
}
