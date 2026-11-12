const webpush = require('web-push');
const { Client } = require('pg');

const VAPID_PUBLIC_KEY = 'BOd887M6aCWosIgbeKfBdoAI3giD6CjHTC8u0c9fdi8T2LLDyQ1Vhrq2mJHnGhr6n3d04ihyJMNPjRakmAn9tWg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'nIvhVG2ZEq6OLfOcWJhc8qwvQ52PHmmXEsYT2b8dEeY';

webpush.setVapidDetails(
  'mailto:albertodominguezsoto@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.tjuqludeduydarwzhbor:4lMcNp5AEeghdHTR@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

async function dispatch(version, title, summary, changes) {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(`[PushDispatcher] Conectado a base de datos. Procesando ${version}...`);

  // Obtener o registrar versión
  const verRes = await client.query('SELECT version, version_code, title, summary FROM public.app_versions WHERE version = $1', [version]);
  let currentVer = verRes.rows[0];

  if (!currentVer && title && summary) {
    const code = parseInt(version.replace(/[^\d]/g, ''), 10) * 10;
    const insertRes = await client.query(`
      INSERT INTO public.app_versions (version, version_code, title, summary, changes, is_published, released_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING *
    `, [version, code, title, summary, JSON.stringify(changes || [])]);
    currentVer = insertRes.rows[0];
    console.log(`[PushDispatcher] Versión ${version} registrada con código ${code}.`);
  }

  if (!currentVer) {
    throw new Error(`La versión ${version} no existe en app_versions.`);
  }

  const subs = await client.query(`
    SELECT s.id, s.endpoint, s.p256dh, s.auth, s.device_type, p.email, p.full_name
    FROM public.push_subscriptions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.is_active = true
  `);

  console.log(`[PushDispatcher] Enviando a ${subs.rows.length} dispositivo(s) activo(s)...`);

  const payload = JSON.stringify({
    title: `Kaupaloki - Actualización ${currentVer.version}`,
    body: `${currentVer.title}: ${currentVer.summary}`,
    icon: '/icono-social.png',
    badge: '/icono-social.png',
    tag: `kaupaloki-update-${currentVer.version}`,
    url: '/perfil/notificaciones',
    version: currentVer.version,
    highest_version_code: currentVer.version_code
  });

  for (const sub of subs.rows) {
    try {
      const res = await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload, { TTL: 86400, urgency: 'high' });

      console.log(`✓ Enviado a ${sub.full_name} (${sub.device_type}) - Status: ${res.statusCode}`);

      await client.query(`
        UPDATE public.push_subscriptions
        SET last_push_version = $1, last_push_version_code = $2, updated_at = NOW()
        WHERE id = $3
      `, [currentVer.version, currentVer.version_code, sub.id]);
    } catch (err) {
      console.error(`✗ Error enviando a ${sub.email}:`, err.statusCode || err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await client.query('UPDATE public.push_subscriptions SET is_active = false WHERE id = $1', [sub.id]);
      }
    }
  }

  await client.end();
  console.log('[PushDispatcher] Proceso finalizado.');
}

const args = process.argv.slice(2);
const ver = args[0] || 'v1.5.0';
dispatch(ver).catch(console.error);
