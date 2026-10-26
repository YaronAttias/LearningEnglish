// Public learners never receive an identity header requirement. Sites verifies
// and injects the owner identity at its dispatch boundary; never expose this Worker directly.
const COOKIE = '__Host-wl-learner';
const DAY = 86400000;
const tokenPattern = /^[a-f0-9]{32}\.\d{1,8}\.[A-Za-z0-9_-]{43}$/;
const security = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
function response(body, status = 200, extra = {}) {
  return new Response(body, {status, headers: {...security, ...extra}});
}
function json(data, status = 200, extra = {}) {
  return response(JSON.stringify(data), status, {'Content-Type': 'application/json; charset=utf-8', ...extra});
}
function fail(status) { return json({error: status === 401 ? 'נדרשת כניסת מנהל' : status === 403 ? 'אין הרשאה' : 'לא ניתן לבצע את הבקשה'}, status); }
function isOwner(request, env) {
  return !!env.ADMIN_EMAIL && !!request.headers.get('oai-authenticated-user-id') &&
    request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
}
function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('json');
  if (Number(request.headers.get('Content-Length') || 0) > 2048) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let size = 0, chunks = [];
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const result = JSON.parse(new TextDecoder().decode(bytes));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('shape');
  return result;
}
function onlyKeys(obj, keys) { return Object.keys(obj).every(k => keys.includes(k)); }
function hexId() { return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function signingKey(env) {
  if (!env.LEARNER_LINK_KEY || env.LEARNER_LINK_KEY.length < 32) throw new Error('config');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.LEARNER_LINK_KEY), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
async function makeToken(student, env) {
  const value = `${student.id}.${student.version}`;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env), new TextEncoder().encode(value)));
  return value + '.' + btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function learner(token, env) {
  if (!tokenPattern.test(token || '')) return null;
  const [id, version, signature] = token.split('.');
  const bytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
  if (!await crypto.subtle.verify('HMAC', await signingKey(env), bytes, new TextEncoder().encode(`${id}.${version}`))) return null;
  return env.DB.prepare('SELECT id, version FROM students WHERE id = ? AND version = ? AND revoked = 0').bind(id, Number(version)).first();
}
function cookie(request) {
  const values = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '='));
  return values.length === 1 ? values[0].slice(COOKIE.length + 1) : '';
}
const cookieHeader = token => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${token ? 90 * 86400 : 0}`;
function localDay(now) { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(now)); }

export async function handle(request, env, asset) {
  try {
    const url = new URL(request.url), route = url.pathname;
    if (!['GET','HEAD'].includes(request.method) && !sameOrigin(request)) return fail(403);
    if (route.startsWith('/api/') && !env.DB) return fail(503);

    if (route.startsWith('/api/admin/')) {
      if (!isOwner(request, env)) return fail(request.headers.get('oai-authenticated-user-id') ? 403 : 401);
      if (route === '/api/admin/students' && request.method === 'GET') {
        const days = Number(url.searchParams.get('days') || 7);
        if (![7, 30, 90].includes(days)) return fail(400);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM daily_usage WHERE day < ?').bind(localDay(Date.now() - 89 * DAY)),
          env.DB.prepare('DELETE FROM reports WHERE received_at < ?').bind(Date.now() - DAY),
        ]);
        const cutoff = localDay(Date.now() - (days - 1) * DAY);
        const rows = await env.DB.prepare(`SELECT s.id, s.label, s.revoked, s.last_seen,
          COALESCE(SUM(d.active_ms), 0) AS active_ms, COALESCE(SUM(d.answers), 0) AS answers,
          COALESCE(SUM(d.completed), 0) AS completed FROM students s
          LEFT JOIN daily_usage d ON d.student_id = s.id AND d.day >= ?
          GROUP BY s.id ORDER BY s.created_at, s.id`).bind(cutoff).all();
        const daily = await env.DB.prepare('SELECT day, SUM(active_ms) AS active_ms FROM daily_usage WHERE day >= ? GROUP BY day ORDER BY day').bind(cutoff).all();
        return json({students: rows.results, daily: daily.results, days});
      }
      if (route === '/api/admin/students' && request.method === 'POST') {
        const input = await body(request);
        if (!onlyKeys(input, ['label']) || typeof input.label !== 'string' || !/^[\p{L}\p{N} ._-]{1,32}$/u.test(input.label.trim())) return fail(400);
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM students').first();
        if (count.n >= 200) return fail(409);
        const student = {id: hexId(), version: 1};
        await env.DB.prepare('INSERT INTO students (id, label, version, created_at, meter_at) VALUES (?, ?, 1, ?, ?)').bind(student.id, input.label.trim(), Date.now(), Date.now()).run();
        return json({id: student.id, link: `${url.origin}/#learner=${await makeToken(student, env)}`}, 201);
      }
      const match = route.match(/^\/api\/admin\/students\/([a-f0-9]{32})(?:\/(link|revoke))?$/);
      if (match && request.method === 'POST' && match[2]) {
        if (!onlyKeys(await body(request), [])) return fail(400);
        const student = await env.DB.prepare('SELECT id, version, revoked FROM students WHERE id = ?').bind(match[1]).first();
        if (!student) return fail(404);
        if (match[2] === 'revoke') {
          await env.DB.prepare('UPDATE students SET revoked = 1, version = version + 1 WHERE id = ?').bind(student.id).run();
          return json({ok: true});
        }
        if (student.revoked) return fail(409);
        return json({link: `${url.origin}/#learner=${await makeToken(student, env)}`});
      }
      if (match && !match[2] && request.method === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM reports WHERE student_id = ?').bind(match[1]),
          env.DB.prepare('DELETE FROM daily_usage WHERE student_id = ?').bind(match[1]),
          env.DB.prepare('DELETE FROM students WHERE id = ?').bind(match[1]),
        ]);
        return json({ok: true});
      }
      return fail(404);
    }
    if (route === '/api/usage/enroll' && request.method === 'POST') {
      const input = await body(request);
      if (!onlyKeys(input, ['token']) || !await learner(input.token, env)) return fail(403);
      return json({ok: true}, 200, {'Set-Cookie': cookieHeader(input.token)});
    }
    if (route === '/api/usage/status' && request.method === 'GET') return json({enabled: !!await learner(cookie(request), env)});
    if (route === '/api/usage/forget' && request.method === 'POST') return json({ok: true}, 200, {'Set-Cookie': cookieHeader('')});
    if (route === '/api/usage/report' && request.method === 'POST') {
      const student = await learner(cookie(request), env);
      if (!student) return fail(403);
      const input = await body(request);
      if (!onlyKeys(input, ['id', 'activeMs', 'answers', 'completed']) || !/^[a-f0-9-]{36}$/.test(input.id || '') ||
        !Number.isInteger(input.activeMs) || input.activeMs < 0 || input.activeMs > 60000 ||
        !Number.isInteger(input.answers) || input.answers < 0 || input.answers > 30 ||
        !Number.isInteger(input.completed) || input.completed < 0 || input.completed > 3 ||
        !(input.activeMs >= 1000 || input.answers || input.completed)) return fail(400);
      const now = Date.now(), day = localDay(now);
      const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM reports WHERE student_id = ? AND received_at > ? AND event_id != ?').bind(student.id, now - 60000, input.id).first();
      if (recent.n >= 12) return json({error:'נסו שוב בעוד דקה'},429,{'Retry-After':'60'});
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO reports (student_id, event_id, received_at, applied) VALUES (?, ?, ?, 0)').bind(student.id, input.id, now),
        // The batch is transactional. A duplicate report cannot increment counters;
        // concurrent tabs cannot accumulate more active time than wall clock time.
        env.DB.prepare(`INSERT INTO daily_usage (student_id, day, active_ms, answers, completed)
          SELECT s.id, ?, MIN(?, MAX(0, ? - s.meter_at)), ?, ? FROM students s
          WHERE s.id = ? AND s.revoked = 0 AND s.version = ? AND EXISTS
            (SELECT 1 FROM reports WHERE student_id = s.id AND event_id = ? AND applied = 0)
          ON CONFLICT(student_id, day) DO UPDATE SET
            active_ms = MIN(86400000, daily_usage.active_ms + excluded.active_ms),
            answers = MIN(10000, daily_usage.answers + excluded.answers),
            completed = MIN(1000, daily_usage.completed + excluded.completed)`)
          .bind(day, input.activeMs, now, input.answers, input.completed, student.id, student.version, input.id),
        env.DB.prepare(`UPDATE students SET meter_at = ?, last_seen = ? WHERE id = ? AND EXISTS
          (SELECT 1 FROM reports WHERE student_id = ? AND event_id = ? AND applied = 0)`).bind(now, now, student.id, student.id, input.id),
        env.DB.prepare('UPDATE reports SET applied = 1 WHERE student_id = ? AND event_id = ?').bind(student.id, input.id),
        env.DB.prepare('DELETE FROM daily_usage WHERE day < ?').bind(localDay(now - 89 * DAY)),
        env.DB.prepare('DELETE FROM reports WHERE received_at < ?').bind(now - DAY),
      ]);
      return json({ok: true});
    }
    if (route.startsWith('/api/')) return fail(404);
    if (request.method !== 'GET' && request.method !== 'HEAD') return fail(405);
    if (route === '/admin' || route === '/admin/' || route === '/admin.html') {
      if (!env.ADMIN_EMAIL) return response('מסך המנהל טרם הוגדר.', 503);
      if (!request.headers.get('oai-authenticated-user-id')) return response('', 302, {Location: '/signin-with-chatgpt?return_to=%2Fadmin'});
      if (!isOwner(request, env)) return fail(403);
      return asset('/admin.html', request, security);
    }
    return asset(route === '/' ? '/index.html' : route, request, security);
  } catch {
    // Never return tokens, SQL errors, identity values, or stack traces.
    return fail(400);
  }
}
