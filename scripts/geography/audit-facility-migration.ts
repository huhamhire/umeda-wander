import { mkdirSync, writeFileSync } from 'node:fs';
import { facilities, layout } from '../../src/infrastructure/district/geographic-map.ts';
import { facilityCodes } from '../../src/infrastructure/facility-codes.ts';
import { auditFacilityMigration } from './facility-migration.ts';
const report = auditFacilityMigration(layout, facilities, facilityCodes);
mkdirSync('build/geography', { recursive: true });
writeFileSync('build/geography/facility-migration.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.issues.length) {
  process.exitCode = 1;
}
