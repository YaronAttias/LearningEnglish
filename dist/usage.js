(() => {
  'use strict';
  const state = {enabled:false, eligible:false, last:performance.now(), action:-Infinity, activeMs:0, answers:0, completed:0, pending:null, sending:false};
  const SEED = 'wordleague-visitor-seed-v2', OFF = 'wordleague-usage-off';
  let initializing = false, stopped = false, retryAt = 0, memorySeed;
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
      if (result.status === 403) { disable(); stopped = true; notice.textContent = 'המעקב אינו פעיל בדפדפן הזה. אפשר להמשיך ללמוד כרגיל.'; }
    } catch { /* Keep the same report ID for an idempotent retry. No persistent queue. */ }
    finally { state.sending = false; }
  }
  window.WordUsage = {
    answer() { if (!stopped) { activity(); state.answers = Math.min(30, state.answers + 1); } },
    complete() { if (!stopped) { activity(); state.completed = Math.min(3, state.completed + 1); } },
  };
  for (const event of ['pointerdown','keydown','scroll']) document.addEventListener(event, e => { if (e.isTrusted) activity(); }, {capture:true,passive:true});
  for (const event of ['focus','blur']) window.addEventListener(event, () => { accrue(); state.eligible = eligible(); if (!state.eligible) void flush(); });
  document.addEventListener('visibilitychange', () => { accrue(); state.eligible = eligible(); if (!state.eligible) void flush(); });
  window.addEventListener('pagehide', () => { void flush(); });
  forget.onclick = async () => {
    try {
      const result = await api('forget', {});
      if (!result.ok) throw new Error();
      try { localStorage.setItem(OFF, '1'); } catch { /* The server opt-out cookie remains effective. */ }
      disable(); stopped = true; notice.textContent = 'שיתוף הפעילות הופסק במכשיר הזה.';
    } catch { notice.textContent = 'לא ניתן להפסיק כרגע. נסו שוב כשיש חיבור.'; }
  };
  async function start() {
    if (initializing || stopped || state.enabled || performance.now() < retryAt) return;
    initializing = true;
    const params = new URLSearchParams(location.hash.slice(1));
    // Discard old personal-link fragments. They no longer control identity.
    if (params.has('learner')) history.replaceState(null, '', location.pathname + location.search);
    try {
      try { if (localStorage.getItem(OFF) === '1') { stopped = true; return; } } catch { /* Storage may be unavailable. */ }
      function seed() {
        try {
          const saved = localStorage.getItem(SEED);
          if (saved && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved)) return saved;
          const value = crypto.randomUUID(); localStorage.setItem(SEED,value); return value;
        } catch { return memorySeed ||= crypto.randomUUID(); }
      }
      // Serialize first-start storage across tabs when Web Locks are available.
      const value = navigator.locks?.request ? await navigator.locks.request(SEED,seed) : seed();
      const result = await api('start', {seed:value});
      if (!result.ok) throw new Error();
      if ((await result.json()).enabled) {
        state.enabled = true; state.eligible = eligible(); state.last = performance.now();
        notice.textContent = 'מדידת שימוש אנונימית · מזהה אקראי לדפדפן, זמן פעיל ומספר תשובות וסיומי תרגול. ללא תוכן התשובות.';
        forget.hidden = false;
      } else { stopped = true; }
    } catch { retryAt = performance.now() + 60000; }
    finally { initializing = false; }
  }
  window.addEventListener('storage', event => {
    if (event.key === OFF && event.newValue === '1') { disable(); stopped = true; notice.textContent = 'שיתוף הפעילות הופסק במכשיר הזה.'; }
  });
  setInterval(() => { if (!state.enabled) void start(); else void flush(); }, 15000);
  void start();
})();
