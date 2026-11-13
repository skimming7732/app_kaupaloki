// Integration checks against the configured database. Mutations roll back.
const assert = require('node:assert/strict');
const { Client } = require('pg');

async function main() {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required');
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  async function asUser(id, callback, role = 'authenticated') {
    await db.query('BEGIN');
    try {
      // Exercise authorization/cache without external side effects: a test
      // transaction must never rotate a live secret and then roll it back.
      await db.query('UPDATE kaupaloki_private.lincoin_state SET last_attempt_at=clock_timestamp()');
      await db.query(`SET LOCAL ROLE ${role}`);
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [id]);
      return await callback();
    } finally { await db.query('ROLLBACK'); }
  }
  try {
    const accounting = `SELECT id,saldo_cop,saldo_real,movimientos FROM public.activos_liquidos ORDER BY id`;
    const before = (await db.query(accounting)).rows;
    const state = (await db.query('SELECT * FROM kaupaloki_private.lincoin_state')).rows[0];
    check(state.consulted_at && !state.last_error && !state.blocked && !state.rotation_pending, 'Healthy live sync');
    check(state.companies.length > 0, 'Companies received');
    const meta = (await db.query(`SELECT (decrypted_secret::jsonb->>'generacion')::int AS generation,
      (decrypted_secret::jsonb->>'expira_at')::timestamptz > now() AS unexpired
      FROM vault.decrypted_secrets WHERE name='lincoin_api_credential'`)).rows[0];
    check(meta.generation >= 2 && meta.unexpired, 'Actual rotation persisted in Vault');
    check((await db.query("SELECT 1 FROM cron.job WHERE jobname='kaupaloki_lincoin_sync' AND active")).rowCount === 1, 'Single active sync job');
    const people = (await db.query(`SELECT id,role FROM public.profiles
      WHERE role IN ('super_admin','administrador','supervisor','auditor','dispersor')
      AND coalesce(lower(status),'') NOT IN ('inactivo','inactive','invitado','invited')`)).rows;
    const readers = people.filter((p) => p.role !== 'dispersor');
    check(readers.length > 0, 'Authorized profiles exist');
    for (const person of readers) {
      const data = await asUser(person.id, async () => (await db.query('SELECT public.lincoin_balances() AS data')).rows[0].data);
      check(data.error === null, `${person.role}: no sync error`);
      for (const [id, apiId] of [
        ['6b2e5f20-410c-4590-939a-4607bbcfbc07', 'F9B909'],
        ['10849c84-865e-4e4a-9544-03df9ee00877', '37A9F5'],
      ]) {
        const row = data.balances.find((b) => b.asset_id === id);
        check(row?.api_id === apiId && typeof row.saldo_real === 'number', `${person.role}: correct asset mapping`);
        check(Number.isFinite(Date.parse(row.consultado_at)), 'Provider timestamp present');
      }
    }
    for (const denied of ['00000000-0000-0000-0000-000000000000', ...people.filter((p) => p.role === 'dispersor').map((p) => p.id)]) {
      await assert.rejects(asUser(denied, () => db.query('SELECT public.lincoin_balances()')), { code: '42501' }); checks++;
    }
    for (const sql of [
      'SELECT * FROM vault.decrypted_secrets',
      'SELECT * FROM kaupaloki_private.lincoin_state',
      'SELECT kaupaloki_private.sync_lincoin()',
    ]) {
      await assert.rejects(asUser(readers[0].id, () => db.query(sql)), { code: '42501' }); checks++;
    }
    await assert.rejects(asUser('', () => db.query('SELECT public.lincoin_balances()'), 'anon'), { code: '42501' }); checks++;
    // Provider auth failure must return dated cached data without further calls.
    await db.query('BEGIN');
    try {
      await db.query("UPDATE kaupaloki_private.lincoin_state SET blocked=true,last_error='TEST: proveedor no disponible'");
      await db.query('SET LOCAL ROLE authenticated');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [readers[0].id]);
      const data = (await db.query('SELECT public.lincoin_balances() AS data')).rows[0].data;
      check(data.error === 'TEST: proveedor no disponible' && data.balances.length >= 2, 'Failure retains dated cache with warning');
      await db.query('RESET ROLE');
      const after = (await db.query('SELECT last_attempt_at FROM kaupaloki_private.lincoin_state')).rows[0];
      check(after.last_attempt_at.toISOString() === state.last_attempt_at.toISOString(), 'Blocked credential is not retried');
    } finally { await db.query('ROLLBACK'); }
    assert.deepEqual((await db.query(accounting)).rows, before); checks++;
    console.log(JSON.stringify({ passed: checks, accounting_unchanged: true, rotation_verified: true }));
  } finally { await db.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
