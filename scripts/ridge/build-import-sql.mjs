// Offline generator: explicit source and operation identifiers; no DB connection.
import { readFileSync, writeFileSync } from 'node:fs';
import { prepareStagedImport } from './staged-import.mjs';
const [source, target, actorId, requestId, snapshotId] = process.argv.slice(2);
if (!source || !target) throw new Error('Usage: node build-import-sql.mjs SOURCE OUTPUT ACTOR_UUID REQUEST_UUID SNAPSHOT_ID');
const prepared = prepareStagedImport(JSON.parse(readFileSync(source, 'utf8')), {actorId, requestId, snapshotId});
writeFileSync(target, prepared.sql, {flag:'wx'});
console.log(`Prepared review-only staging for ${prepared.state.sessions.length} sessions. No database contacted; no publication.`);
