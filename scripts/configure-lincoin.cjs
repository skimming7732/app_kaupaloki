// Run once with DATABASE_URL and LINCOIN_CREDENTIAL_FILE configured.
// Credentials are parameterized, never printed, and never replaced on reruns.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const file = '20261113002035_lincoin_saldos_reales.sql';
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations', file), 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
      VALUES ($1,$2,$3) ON CONFLICT (version) DO UPDATE SET name=excluded.name,statements=excluded.statements`,
    ['20261113002035', 'lincoin_saldos_reales', [sql]]);
    const exists = await client.query("SELECT id FROM vault.secrets WHERE name = 'lincoin_api_credential'");
    if (!exists.rowCount) {
      if (!process.env.LINCOIN_CREDENTIAL_FILE) throw new Error('Configure LINCOIN_CREDENTIAL_FILE para el arranque inicial.');
      const credential = Object.fromEntries(fs.readFileSync(process.env.LINCOIN_CREDENTIAL_FILE, 'utf8')
        .trim().split(/\r?\n/).map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        }));
      if (!/^lk_[\w-]+$/.test(credential.LLAVE_ID || '')
        || !/^\d+$/.test(credential.GENERACION || '') || !/^[\w-]{43}$/.test(credential.SECRETO || '')) {
        throw new Error('Formato de credencial Lincoin inválido.');
      }
      await client.query(`SELECT vault.create_secret($1, 'lincoin_api_credential', 'Credencial Lincoin; rotación centralizada. No reutilizar el archivo de arranque.')`,
        [JSON.stringify({ llave_id: credential.LLAVE_ID, generacion: Number(credential.GENERACION),
          secreto: credential.SECRETO, rotated_at: new Date(Date.now() - 7_200_000).toISOString() })]);
    }
    await client.query('COMMIT');
    await client.query('SELECT kaupaloki_private.sync_lincoin()');
    const { rows } = await client.query(`SELECT consulted_at, last_error, blocked, rotation_pending,
      jsonb_array_length(companies) AS empresas FROM kaupaloki_private.lincoin_state`);
    console.log(JSON.stringify({ configured: true, state: rows[0] }));
    if (rows[0].last_error || !rows[0].consulted_at) process.exitCode = 1;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
