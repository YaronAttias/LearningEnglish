(() => {
  'use strict';
  const state = {enabled:false, eligible:false, last:performance.now(), action:-Infinity, activeMs:0, answers:0, completed:0, pending:null, sending:false};
  const notice = document.createElement('p'); notice.id = 'usage-notice'; notice.className = 'hint'; notice.setAttribute('role','status');
  const forget = document.createElement('button'); forget.type = 'button'; forget.textContent = 'הפסקת השיתוף במכשיר הזה'; forget.hidden = true;
  const footer = document.querySelector('footer'); footer?.append(notice,forget);
  function eligible() { return document.visibilityState === 'visible' && document.hasFocus(); }
  function accrue() {
    const now = performance.now();
    if (state.enabled && state.eligible) state.activeMs = Math.min(60000, state.activeMs + Math.max(0, Math.min(now, state.action + 60000) - state.last));
    state.last = now;
  }
  function activity() { accrue(); state.action = performance.now(); state.eligible = eligible(); }
  async function api(path, data) {
    return fetch('/api/usage/' + path, {method:data === undefined ? 'GET':'POST', credentials:'same-origin', cache:'no-store',
      headers:data === undefined ? {} : {'Content-Type':'application/json'}, body:data === undefined ? undefined : JSON.stringify(data), keepalive:true});
  }
  function disable() { state.enabled = false; state.pending = null; state.activeMs = state.answers = state.completed = 0; forget.hidden = true; }
  async function flush() {
    accrue();
    if (!state.enabled || state.sending) return;
    if (!state.pending && (state.activeMs >= 1000 || state.answers || state.completed)) {
      state.pending = {id:crypto.randomUUID(), activeMs:Math.floor(state.activeMs), answers:state.answers, completed:state.completed};
      state.activeMs = state.answers = state.completed = 0;
    }
    if (!state.pending) return;
    state.sending = true;
    const pending = state.pending;
    try {
      const result = await api('report', pending);
      if (result.ok && state.pending === pending) state.pending = null;
      if (result.status === 403) { disable(); notice.textContent = 'הקישור האישי אינו פעיל. הלמידה ממשיכה ללא שיתוף נתונים.'; }
    } catch { /* Keep the same report ID for an idempotent retry. No persistent queue. */ }
    finally { state.sending = false; }
  }
  window.WordUsage = {
    answer() { if (state.enabled) { activity(); state.answers = Math.min(30, state.answers + 1); } },
    complete() { if (state.enabled) { activity(); state.completed = Math.min(3, state.completed + 1); } },
  };
  for (const event of ['pointerdown','keydown','scroll']) document.addEventListener(event, e => { if (e.isTrusted) activity(); }, {capture:true,passive:true});
  for (const event of ['focus','blur']) window.addEventListener(event, () => { accrue(); state.eligible = eligible(); if (!state.eligible) void flush(); });
  document.addEventListener('visibilitychange', () => { accrue(); state.eligible = eligible(); if (!state.eligible) void flush(); });
  window.addEventListener('pagehide', () => { void flush(); });
  forget.onclick = async () => {
    try {
      const result = await api('forget', {});
      if (!result.ok) throw new Error();
      disable(); notice.textContent = 'שיתוף הפעילות הופסק במכשיר הזה.';
    } catch { notice.textContent = 'לא ניתן להפסיק כרגע. נסו שוב כשיש חיבור.'; }
  };
  async function start() {
    const params = new URLSearchParams(location.hash.slice(1));
    const token = params.get('learner');
    if (params.has('learner')) history.replaceState(null, '', location.pathname + location.search);
    try {
      const result = token ? await api('enroll', {token}) : await api('status');
      if (!result.ok) { if (token) notice.textContent = 'הקישור האישי אינו תקף. אפשר להמשיך ללמוד ללא שיתוף.'; return; }
      if (token || (await result.json()).enabled) {
        state.enabled = true; state.eligible = eligible(); state.last = performance.now();
        notice.textContent = 'קישור אישי פעיל · משותפים רק זמן פעיל, מספר תשובות וסיומי תרגול, ללא תוכן התשובות.';
        forget.hidden = false;
      }
    } catch { if (token) notice.textContent = 'המעקב לא התחבר. פתחו שוב את הקישור האישי כשיש חיבור.'; }
  }
  setInterval(() => { void flush(); }, 15000);
  void start();
})();
