/* Simulated payer provider portal. Authentication is fake: any username with a
   password of 8+ characters is accepted (see README for scripted failure cases). */
(() => {
  'use strict';

  const app = document.getElementById('app');
  const toasts = document.getElementById('toasts');
  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const MFA_TTL_MS = 5 * 60 * 1000;
  const PAGE_SIZE = 25;

  // ---------- storage (sessionStorage with in-memory fallback) ----------
  const mem = {};
  const hasSS = (() => { try { sessionStorage.setItem('pp.t', '1'); sessionStorage.removeItem('pp.t'); return true; } catch { return false; } })();
  const store = {
    get(k) {
      if (!hasSS) return mem[k] ?? null;
      try { const v = sessionStorage.getItem('pp.' + k); return v == null ? null : JSON.parse(v); } catch { return null; }
    },
    set(k, v) {
      if (!hasSS) { mem[k] = v; return; }
      try { sessionStorage.setItem('pp.' + k, JSON.stringify(v)); } catch { /* quota exceeded: drop */ }
    },
    del(k) { delete mem[k]; if (hasSS) sessionStorage.removeItem('pp.' + k); },
    keys() { return hasSS ? Object.keys(sessionStorage).filter((k) => k.startsWith('pp.')).map((k) => k.slice(3)) : Object.keys(mem); },
    clear() { store.keys().forEach((k) => store.del(k)); }
  };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, space) => (space ? '$ ' : '$') + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mdy = (t) => { if (!t) return ''; const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`; };
  const longDate = (t) => (t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  const dateTime = (t) => (t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  const icdNoDot = (c) => c.replace('.', '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const latency = (min = 250, max = 900) => sleep(min + Math.random() * (max - min));
  const maskEmail = (u) => {
    const [a, b] = String(u).split('@');
    if (!b) return a.slice(0, 1) + '•••••';
    return a.slice(0, 1) + '•'.repeat(Math.max(3, a.length - 1)) + '@' + b;
  };
  const age = (dob) => Math.floor((Date.now() - dob) / (365.25 * 86400000));

  function toast(html, { kind = 'info', timeout = 5000, id } = {}) {
    if (id) document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.className = 'toast toast-' + kind;
    if (id) el.id = id;
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="toast-body">${html}</div><button class="toast-x" aria-label="Dismiss">×</button>`;
    el.querySelector('.toast-x').onclick = () => el.remove();
    toasts.appendChild(el);
    if (timeout) setTimeout(() => el.remove(), timeout);
    return el;
  }

  const statusClass = (s) => ({
    'Approved': 'ok', 'APPROVED': 'ok', 'Active': 'ok',
    'Denied': 'bad', 'DENY': 'bad', 'Termed': 'bad',
    'Partially Approved': 'warn',
    'In Clinical Review': 'info', 'PEND': 'info', 'Received': 'muted', 'RECEIVED': 'muted',
    'Additional Info Requested': 'warn',
    'Cancelled': 'muted', 'VOID': 'muted'
  }[s] || 'muted');

  // ---------- session ----------
  const session = () => store.get('session');
  function touch() { const s = session(); if (s) { s.lastActive = Date.now(); store.set('session', s); } }
  function authed() {
    const s = session();
    if (!s || !s.mfaVerified) return false;
    if (Date.now() - s.lastActive > IDLE_LIMIT_MS) {
      store.clear();
      store.set('flash', { kind: 'warn', msg: 'Your session expired due to inactivity. Please log in again.' });
      return false;
    }
    return true;
  }
  function logout(msg) {
    store.clear();
    if (msg) store.set('flash', { kind: 'info', msg });
    location.hash = '#/login';
  }

  // ---------- router ----------
  const routes = [
    [/^\/login$/, viewLogin, false],
    [/^\/mfa$/, viewMfa, false],
    [/^\/forgot$/, viewForgot, false],
    [/^\/register$/, viewRegister, false],
    [/^\/members$/, viewMembers, true],
    [/^\/members\/([A-Z0-9]+)$/, viewMember, true],
    [/^\/members\/([A-Z0-9]+)\/requests\/([A-Z0-9]+)$/, viewRequest, true]
  ];
  let renderToken = 0;

  async function route() {
    const token = ++renderToken;
    const [path, query = ''] = (location.hash.slice(1) || '/login').split('?');
    const params = new URLSearchParams(query);
    if (path === '/' || path === '') { location.hash = authed() ? '#/members' : '#/login'; return; }
    for (const [re, fn, needsAuth] of routes) {
      const m = path.match(re);
      if (!m) continue;
      if (needsAuth && !authed()) { location.hash = '#/login'; return; }
      if (!needsAuth && authed() && path !== '/mfa') { location.hash = '#/members'; return; }
      if (needsAuth) touch();
      window.scrollTo(0, 0);
      await fn({ args: m.slice(1), params, token });
      return;
    }
    renderNotFound();
  }
  const stale = (token) => token !== renderToken;
  window.addEventListener('hashchange', route);
  ['click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (authed()) touch(); }, { passive: true }));

  // ---------- shared chrome ----------
  function shell(inner, crumbs = []) {
    const s = session();
    const crumbHtml = crumbs.length
      ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([label, href], i) => (href && i < crumbs.length - 1 ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`)).join('<span class="sep">/</span>')}</nav>`
      : '';
    app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/members"><span class="brand-mark">+</span><span>Provider Portal</span></a>
        <nav class="topnav">
          <a href="#/members" class="active" data-testid="nav-members">Members</a>
          <a href="#/members" data-testid="nav-auths">Prior Authorizations</a>
          <a href="#/members" data-testid="nav-claims">Claims</a>
        </nav>
        <div class="user-menu">
          <span class="user-name" data-testid="current-user">${esc(s.user)}</span>
          <button class="btn-link" id="logout-btn" data-testid="logout">Log out</button>
        </div>
      </header>
      <main class="page">${crumbHtml}${inner}</main>
      <footer class="sim-footer">Simulated test environment · all members, providers and claims are randomly generated · not a real payer system</footer>`;
    document.getElementById('logout-btn').onclick = () => logout('You have been logged out.');
  }

  function loading(label = 'Loading…', crumbs) {
    shell(`<div class="loading" data-testid="loading"><div class="spinner"></div><span>${esc(label)}</span></div>`, crumbs);
  }

  function renderNotFound() {
    app.innerHTML = `<div class="center-msg"><h2>Page not found</h2><p><a href="#/login">Return to login</a></p></div>`;
  }

  // ---------- auth screens ----------
  function authLayout(cardHtml) {
    app.innerHTML = `
      <div class="auth-page">
        <div class="auth-bg" aria-hidden="true"></div>
        <section class="auth-hero">
          <h1><span class="welcome">Welcome to</span><span class="portal">Provider Portal</span></h1>
          ${ILLUSTRATION}
        </section>
        <section class="auth-card">${cardHtml}</section>
        <p class="auth-sim-note">Simulated environment — synthetic data only</p>
      </div>`;
    const flash = store.get('flash');
    if (flash) { store.del('flash'); const f = app.querySelector('.flash-slot'); if (f) f.innerHTML = `<div class="alert alert-${flash.kind}" data-testid="flash">${esc(flash.msg)}</div>`; }
  }

  const ICON_USER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
  const ICON_LOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0"/></svg>';
  const ICON_EYE_OFF = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>';
  const ICON_EYE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

  function viewLogin() {
    authLayout(`
      <h2 class="card-title">User Login</h2>
      <div class="flash-slot"></div>
      <form id="login-form" novalidate autocomplete="off" data-testid="login-form">
        <label class="field-label" for="username">${ICON_USER}<span>Username</span></label>
        <input class="input" id="username" name="username" type="text" autocomplete="off" data-testid="username" required>
        <div class="field-error" id="username-error"></div>
        <label class="field-label mt" for="password">${ICON_LOCK}<span>Password</span></label>
        <div class="pw-wrap">
          <input class="input" id="password" name="password" type="password" autocomplete="off" data-testid="password" required>
          <button type="button" class="pw-toggle" id="pw-toggle" aria-label="Show password">${ICON_EYE_OFF}</button>
        </div>
        <div class="field-error" id="password-error"></div>
        <div class="row-right"><a href="#/forgot" class="link" data-testid="forgot-link">Forgot password?</a></div>
        <label class="check"><input type="checkbox" id="pause-mfa" data-testid="pause-mfa"> <span>Pause MFA</span></label>
        <button class="btn-login" type="submit" id="login-btn" data-testid="login-submit"><span>LOGIN</span>${ICON_ARROW}</button>
        <div class="center mt-lg"><a href="#/register" class="link underline" data-testid="register-link">Register Now</a></div>
      </form>`);

    const form = document.getElementById('login-form');
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    const toggle = document.getElementById('pw-toggle');
    toggle.onclick = () => {
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      toggle.innerHTML = show ? ICON_EYE : ICON_EYE_OFF;
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    };
    u.focus();

    form.onsubmit = async (e) => {
      e.preventDefault();
      const errU = document.getElementById('username-error');
      const errP = document.getElementById('password-error');
      errU.textContent = errP.textContent = '';
      const username = u.value.trim();
      const password = p.value;
      if (!username) { errU.textContent = 'Username is required.'; return; }
      if (!password) { errP.textContent = 'Password is required.'; return; }

      const btn = document.getElementById('login-btn');
      btn.disabled = true; btn.classList.add('busy');
      await latency(500, 1300);
      btn.disabled = false; btn.classList.remove('busy');

      const slot = app.querySelector('.flash-slot');
      const fail = (msg) => { slot.innerHTML = `<div class="alert alert-error" data-testid="login-error">${esc(msg)}</div>`; p.value = ''; p.focus(); };
      const lower = username.toLowerCase();
      if (lower.includes('locked')) return fail('Your account has been locked. Please contact Provider Services.');
      if (lower.includes('expired')) return fail('Your password has expired. Use "Forgot password?" to reset it.');
      if (password.length < 8 || password.toLowerCase() === 'wrongpassword') return fail('Invalid username or password.');

      const pauseMfa = document.getElementById('pause-mfa').checked;
      store.del('mfa');
      document.getElementById('mfa-toast')?.remove();
      store.set('session', { user: username, created: Date.now(), lastActive: Date.now(), mfaVerified: pauseMfa });
      if (pauseMfa) { await startSession(); location.hash = '#/members'; return; }
      location.hash = '#/mfa';
    };
  }

  async function startSession() {
    store.keys().filter((k) => k.startsWith('req.')).forEach((k) => store.del(k));
    store.set('roster', GEN.roster());
  }

  function issueCode(method) {
    const code = String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
    const s = session();
    const dest = method === 'sms' ? '(•••) •••-' + String(1000 + Math.floor(Math.random() * 9000)) : maskEmail(s.user);
    store.set('mfa', { code, method, dest, expires: Date.now() + MFA_TTL_MS, attempts: 0 });
    toast(`<div class="sim-msg-title">${method === 'sms' ? '📱 Simulated SMS' : '✉️ Simulated email'} · to ${esc(dest)}</div>
      <div>Provider Portal verification code: <strong id="sim-mfa-code" data-testid="sim-mfa-code">${code}</strong></div>
      <div class="sim-msg-sub">Expires in 5 minutes. Do not share this code.</div>`, { kind: 'sim', timeout: 0, id: 'mfa-toast' });
    return store.get('mfa');
  }

  function viewMfa() {
    const s = session();
    if (!s) { location.hash = '#/login'; return; }
    if (s.mfaVerified) { location.hash = '#/members'; return; }
    const existing = store.get('mfa');
    if (!existing) {
      authLayout(`
        <h2 class="card-title">Verify Your Identity</h2>
        <p class="muted-text">Multi-factor authentication is required. Choose where to receive your one-time verification code.</p>
        <div class="flash-slot"></div>
        <form id="mfa-method" data-testid="mfa-method-form">
          <label class="radio-card"><input type="radio" name="method" value="sms" checked data-testid="mfa-sms"><span><strong>Text message (SMS)</strong><small>Mobile number on file</small></span></label>
          <label class="radio-card"><input type="radio" name="method" value="email" data-testid="mfa-email"><span><strong>Email</strong><small>${esc(maskEmail(s.user))}</small></span></label>
          <button class="btn-login mt-lg" type="submit" data-testid="mfa-send"><span>SEND CODE</span>${ICON_ARROW}</button>
          <div class="center mt-lg"><a href="#/login" class="link" id="mfa-cancel">Cancel and return to login</a></div>
        </form>`);
      document.getElementById('mfa-cancel').onclick = (e) => { e.preventDefault(); logout(); };
      document.getElementById('mfa-method').onsubmit = async (e) => {
        e.preventDefault();
        const method = new FormData(e.target).get('method');
        e.target.querySelector('button[type=submit]').disabled = true;
        await latency(400, 900);
        issueCode(method);
        viewMfa();
      };
      return;
    }

    authLayout(`
      <h2 class="card-title">Enter Verification Code</h2>
      <p class="muted-text">We sent a 6-digit code to <strong>${esc(existing.dest)}</strong>. The code expires in <span id="mfa-timer" data-testid="mfa-timer">5:00</span>.</p>
      <div class="flash-slot"></div>
      <form id="mfa-form" novalidate data-testid="mfa-form">
        <div class="otp" id="otp">
          ${[0, 1, 2, 3, 4, 5].map((i) => `<input class="otp-box" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-testid="otp-${i}">`).join('')}
        </div>
        <input type="hidden" id="mfa-code" data-testid="mfa-code">
        <label class="check mt"><input type="checkbox" id="trust-device" data-testid="trust-device"> <span>Remember this device for 30 days</span></label>
        <button class="btn-login mt-lg" type="submit" id="mfa-submit" data-testid="mfa-submit"><span>VERIFY</span>${ICON_ARROW}</button>
        <div class="mfa-links">
          <a href="#" class="link" id="mfa-resend" data-testid="mfa-resend">Resend code</a>
          <a href="#" class="link" id="mfa-change" data-testid="mfa-change">Use a different method</a>
          <a href="#" class="link" id="mfa-cancel">Cancel</a>
        </div>
      </form>`);

    const boxes = [...document.querySelectorAll('.otp-box')];
    const hidden = document.getElementById('mfa-code');
    const sync = () => { hidden.value = boxes.map((b) => b.value).join(''); };
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const digits = b.value.replace(/\D/g, '');
        if (digits.length > 1) { // pasted or autofilled full code
          digits.slice(0, 6 - i).split('').forEach((d, j) => { boxes[i + j].value = d; });
          boxes[Math.min(5, i + digits.length - 1)].focus();
        } else {
          b.value = digits;
          if (digits && i < 5) boxes[i + 1].focus();
        }
        sync();
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; sync(); } });
      b.addEventListener('paste', (e) => {
        const t = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!t) return;
        e.preventDefault();
        t.split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
        boxes[Math.min(5, t.length - 1)].focus();
        sync();
      });
    });
    // Single-field entry is also supported for automation: typing into box 0 spills over.
    boxes[0].setAttribute('maxlength', '6');
    boxes[0].focus();

    const timerEl = document.getElementById('mfa-timer');
    const tick = setInterval(() => {
      const m = store.get('mfa');
      if (!m || !document.body.contains(timerEl)) { clearInterval(tick); return; }
      const left = Math.max(0, m.expires - Date.now());
      timerEl.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
      timerEl.classList.toggle('expired', left === 0);
    }, 500);

    const slot = app.querySelector('.flash-slot');
    document.getElementById('mfa-resend').onclick = async (e) => {
      e.preventDefault();
      await latency(300, 700);
      const m = issueCode(existing.method);
      slot.innerHTML = `<div class="alert alert-info" data-testid="mfa-resent">A new code was sent to ${esc(m.dest)}.</div>`;
      boxes.forEach((b) => { b.value = ''; }); sync(); boxes[0].focus();
    };
    document.getElementById('mfa-change').onclick = (e) => { e.preventDefault(); store.del('mfa'); document.getElementById('mfa-toast')?.remove(); viewMfa(); };
    document.getElementById('mfa-cancel').onclick = (e) => { e.preventDefault(); document.getElementById('mfa-toast')?.remove(); logout(); };

    document.getElementById('mfa-form').onsubmit = async (e) => {
      e.preventDefault();
      sync();
      const entered = hidden.value;
      const m = store.get('mfa');
      if (!/^\d{6}$/.test(entered)) { slot.innerHTML = '<div class="alert alert-error" data-testid="mfa-error">Enter the 6-digit code.</div>'; return; }
      const btn = document.getElementById('mfa-submit');
      btn.disabled = true; btn.classList.add('busy');
      await latency(400, 1000);
      btn.disabled = false; btn.classList.remove('busy');
      if (Date.now() > m.expires) { slot.innerHTML = '<div class="alert alert-error" data-testid="mfa-error">This code has expired. Select "Resend code" to get a new one.</div>'; return; }
      if (entered !== m.code) {
        m.attempts += 1; store.set('mfa', m);
        if (m.attempts >= 3) { document.getElementById('mfa-toast')?.remove(); logout('Too many incorrect verification attempts. Please log in again.'); return; }
        slot.innerHTML = `<div class="alert alert-error" data-testid="mfa-error">Incorrect code. ${3 - m.attempts} attempt${3 - m.attempts === 1 ? '' : 's'} remaining.</div>`;
        boxes.forEach((b) => { b.value = ''; }); sync(); boxes[0].focus();
        return;
      }
      clearInterval(tick);
      document.getElementById('mfa-toast')?.remove();
      store.del('mfa');
      const s2 = session(); s2.mfaVerified = true; s2.lastActive = Date.now(); store.set('session', s2);
      await startSession();
      location.hash = '#/members';
    };
  }

  function viewForgot() {
    authLayout(`
      <h2 class="card-title">Reset Password</h2>
      <p class="muted-text">Enter your username. If it matches an account, we'll send password reset instructions to the email on file.</p>
      <div class="flash-slot"></div>
      <form id="forgot-form" novalidate>
        <label class="field-label" for="fp-user">${ICON_USER}<span>Username</span></label>
        <input class="input" id="fp-user" type="text" data-testid="forgot-username" autocomplete="off">
        <button class="btn-login mt-lg" type="submit" data-testid="forgot-submit"><span>SEND RESET LINK</span>${ICON_ARROW}</button>
        <div class="center mt-lg"><a href="#/login" class="link">Back to login</a></div>
      </form>`);
    document.getElementById('forgot-form').onsubmit = async (e) => {
      e.preventDefault();
      await latency();
      app.querySelector('.flash-slot').innerHTML = '<div class="alert alert-info" data-testid="forgot-done">If an account exists for that username, reset instructions have been sent. (Simulated — no email is sent.)</div>';
    };
  }

  function viewRegister() {
    authLayout(`
      <h2 class="card-title">Register</h2>
      <p class="muted-text">Provider account registration requires your organization's Tax ID and a registration code from your practice administrator.</p>
      <div class="flash-slot"></div>
      <form id="reg-form" novalidate>
        <label class="field-label" for="reg-tin"><span>Tax ID (TIN)</span></label>
        <input class="input" id="reg-tin" type="text" placeholder="XX-XXXXXXX" autocomplete="off">
        <label class="field-label mt" for="reg-code"><span>Registration code</span></label>
        <input class="input" id="reg-code" type="text" autocomplete="off">
        <button class="btn-login mt-lg" type="submit"><span>CONTINUE</span>${ICON_ARROW}</button>
        <div class="center mt-lg"><a href="#/login" class="link">Back to login</a></div>
      </form>`);
    document.getElementById('reg-form').onsubmit = async (e) => {
      e.preventDefault();
      await latency();
      app.querySelector('.flash-slot').innerHTML = '<div class="alert alert-info">Registration is not available in this simulated environment. Any username and 8+ character password can log in.</div>';
    };
  }

  // ---------- members list ----------
  async function viewMembers({ params, token }) {
    loading('Loading members…', [['Members']]);
    await latency(300, 900);
    if (stale(token)) return;
    const roster = store.get('roster');
    const q = (params.get('q') || '').trim();
    const plan = params.get('plan') || '';
    const elig = params.get('elig') || '';
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const ql = q.toLowerCase();
    const filtered = roster.members.filter((m) =>
      (!ql || `${m.first} ${m.last} ${m.last}, ${m.first} ${m.id} ${mdy(m.dob)}`.toLowerCase().includes(ql)) &&
      (!plan || m.plan === plan) && (!elig || m.eligibility === elig));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const cur = Math.min(page, pages);
    const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
    const plans = [...new Set(roster.members.map((m) => m.plan))].sort();
    const qs = (over) => { const p = new URLSearchParams({ q, plan, elig, page: cur, ...over }); [...p.keys()].forEach((k) => { if (!p.get(k) || (k === 'page' && p.get(k) === '1')) p.delete(k); }); const s = p.toString(); return '#/members' + (s ? '?' + s : ''); };

    shell(`
      <div class="page-head">
        <div>
          <h1 class="page-title">Member Search</h1>
          <p class="subtle">${roster.members.length} members attributed to your organization · data generated ${dateTime(roster.generatedAt)}</p>
        </div>
      </div>
      <form class="filters card" id="filters" data-testid="member-filters">
        <div class="f-field grow"><label for="f-q">Name, Member ID or DOB</label><input class="input sm" id="f-q" value="${esc(q)}" placeholder="e.g. Smith, WPP123456789, 04/12/1968" data-testid="member-search"></div>
        <div class="f-field"><label for="f-plan">Plan</label><select class="input sm" id="f-plan" data-testid="plan-filter"><option value="">All plans</option>${plans.map((p) => `<option ${p === plan ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
        <div class="f-field"><label for="f-elig">Eligibility</label><select class="input sm" id="f-elig" data-testid="elig-filter"><option value="">All</option>${['Active', 'Termed'].map((p) => `<option ${p === elig ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="f-actions"><button class="btn" type="submit" data-testid="search-btn">Search</button><a class="btn ghost" href="#/members">Clear</a></div>
      </form>
      <div class="card flush">
        <div class="table-scroll">
        <table class="grid" data-testid="member-table">
          <thead><tr><th>Member ID</th><th>Member Name</th><th>DOB</th><th>Gender</th><th>Plan</th><th>Group #</th><th>Eligibility</th><th>PCP</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((m) => `
              <tr class="click-row" data-href="#/members/${m.id}" data-testid="member-row" data-member-id="${m.id}">
                <td class="mono">${m.id}${m.suffix}</td>
                <td><a href="#/members/${m.id}" class="strong-link">${esc(m.last)}, ${esc(m.first)}${m.middle ? ' ' + m.middle + '.' : ''}</a></td>
                <td>${mdy(m.dob)}</td>
                <td>${m.gender}</td>
                <td>${esc(m.plan)}</td>
                <td class="mono">${esc(m.group)}</td>
                <td><span class="pill ${statusClass(m.eligibility)}">${m.eligibility}</span></td>
                <td>${esc(m.pcp)}</td>
                <td class="right nowrap"><a href="#/members/${m.id}" class="link">View ›</a></td>
              </tr>`).join('') : '<tr><td colspan="9" class="empty">No members match your search.</td></tr>'}
          </tbody>
        </table>
        </div>
        <div class="pager" data-testid="pager">
          <span>Showing ${filtered.length ? (cur - 1) * PAGE_SIZE + 1 : 0}–${Math.min(cur * PAGE_SIZE, filtered.length)} of ${filtered.length}</span>
          <span class="pager-btns">
            ${cur > 1 ? `<a class="btn ghost sm" href="${qs({ page: cur - 1 })}" data-testid="prev-page">‹ Prev</a>` : '<span class="btn ghost sm disabled">‹ Prev</span>'}
            <span class="page-no">Page ${cur} of ${pages}</span>
            ${cur < pages ? `<a class="btn ghost sm" href="${qs({ page: cur + 1 })}" data-testid="next-page">Next ›</a>` : '<span class="btn ghost sm disabled">Next ›</span>'}
          </span>
        </div>
      </div>`, [['Members']]);

    document.getElementById('filters').onsubmit = (e) => {
      e.preventDefault();
      location.hash = qs({ q: document.getElementById('f-q').value.trim(), plan: document.getElementById('f-plan').value, elig: document.getElementById('f-elig').value, page: 1 });
    };
    app.querySelectorAll('.click-row').forEach((r) => r.addEventListener('click', (e) => { if (!e.target.closest('a')) location.hash = r.dataset.href; }));
  }

  // ---------- member detail ----------
  function findMember(id) { return store.get('roster')?.members.find((m) => m.id === id); }
  function memberRequests(m) {
    let r = store.get('req.' + m.id);
    if (!r) { r = GEN.requests(m, store.get('roster').providers); store.set('req.' + m.id, r); }
    return r;
  }

  async function viewMember({ args: [id], params, token }) {
    const m = findMember(id);
    const crumbs = [['Members', '#/members'], [m ? `${m.last}, ${m.first}` : id]];
    loading('Retrieving authorization history…', crumbs);
    await latency(500, 1400);
    if (stale(token)) return;
    if (!m) { shell('<div class="card empty">Member not found in this session.</div>', crumbs); return; }
    const reqs = memberRequests(m).list;
    const filter = params.get('status') || '';
    const shown = filter ? reqs.filter((r) => r.statusKey === filter) : reqs;
    const counts = reqs.reduce((a, r) => { a[r.statusKey] = (a[r.statusKey] || 0) + 1; return a; }, {});
    const statusOpts = [['approved', 'Approved'], ['partial', 'Partially Approved'], ['denied', 'Denied'], ['review', 'In Clinical Review'], ['info', 'Additional Info Requested'], ['received', 'Received'], ['cancelled', 'Cancelled']];

    shell(`
      <div class="member-head card" data-testid="member-header">
        <div class="mh-main">
          <div class="avatar">${esc(m.first[0])}${esc(m.last[0])}</div>
          <div>
            <h1 class="page-title">${esc(m.first)} ${m.middle ? m.middle + '. ' : ''}${esc(m.last)}</h1>
            <div class="subtle">Member ID <span class="mono" data-testid="member-id">${m.id}${m.suffix}</span> · DOB ${mdy(m.dob)} (${age(m.dob)} yrs) · ${m.gender === 'F' ? 'Female' : 'Male'}</div>
          </div>
          <span class="pill lg ${statusClass(m.eligibility)}" data-testid="member-eligibility">${m.eligibility}</span>
        </div>
        <div class="kv-grid">
          ${kv('Plan', m.plan)}${kv('Group #', m.group)}${kv('Employer / Sponsor', m.employer || '—')}${kv('Relationship', m.relationship)}
          ${kv('Effective Date', mdy(m.effective))}${kv('Term Date', m.term ? mdy(m.term) : '—')}${kv('Primary Care Provider', m.pcp)}${kv('Phone', m.phone)}
          ${kv('Address', `${m.address}, ${m.city}, ${m.state} ${m.zip}`, 'span2')}
        </div>
      </div>

      <div class="section-head">
        <h2 class="section-title">Prior Authorization Requests <span class="count" data-testid="request-count">${reqs.length}</span></h2>
        <form id="status-filter"><select class="input sm" id="sf" data-testid="status-filter"><option value="">All statuses</option>${statusOpts.filter(([k]) => counts[k]).map(([k, l]) => `<option value="${k}" ${k === filter ? 'selected' : ''}>${l} (${counts[k]})</option>`).join('')}</select></form>
      </div>
      <div class="card flush">
        <div class="table-scroll">
        <table class="grid" data-testid="request-table">
          <thead><tr><th>Auth / Reference #</th><th>Service Category</th><th>Servicing Provider</th><th>Submitted</th><th>Dates of Service</th><th class="right">Lines</th><th class="right">Billed</th><th>Priority</th><th>Status</th><th></th></tr></thead>
          <tbody>
          ${shown.length ? shown.map((r) => `
            <tr class="click-row" data-href="#/members/${m.id}/requests/${r.id}" data-testid="request-row" data-request-id="${r.id}" data-status="${r.statusKey}">
              <td><a class="strong-link mono" href="#/members/${m.id}/requests/${r.id}">${r.id}</a>${r.claimNumber ? `<div class="tiny mono">Claim ${r.claimNumber}</div>` : ''}</td>
              <td>${esc(r.category)}</td>
              <td>${esc(r.provider)}<div class="tiny">NPI ${r.providerNpi}</div></td>
              <td>${mdy(r.submitted)}</td>
              <td>${mdy(r.dosFrom)}${r.dosTo !== r.dosFrom ? ' – ' + mdy(r.dosTo) : ''}</td>
              <td class="right">${r.lines.length}</td>
              <td class="right">${money(r.totalCharges)}</td>
              <td>${r.priority === 'Urgent' ? '<span class="pill warn">Urgent</span>' : 'Standard'}</td>
              <td><span class="pill ${statusClass(r.status)}" data-testid="request-status">${r.status}</span></td>
              <td class="right nowrap"><a class="link" href="#/members/${m.id}/requests/${r.id}">Details ›</a></td>
            </tr>`).join('') : `<tr><td colspan="10" class="empty">${reqs.length ? 'No requests with this status.' : 'No prior authorization requests on file for this member.'}</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>`, crumbs);

    document.getElementById('sf').onchange = (e) => { location.hash = `#/members/${m.id}` + (e.target.value ? '?status=' + e.target.value : ''); };
    app.querySelectorAll('.click-row').forEach((r) => r.addEventListener('click', (e) => { if (!e.target.closest('a')) location.hash = r.dataset.href; }));
  }

  const kv = (k, v, cls = '') => `<div class="kv ${cls}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;

  // ---------- request detail (mirrors claim/auth detail screen) ----------
  async function viewRequest({ args: [mid, rid], token }) {
    const m = findMember(mid);
    const r = m && memberRequests(m).list.find((x) => x.id === rid);
    const crumbs = [['Members', '#/members'], [m ? `${m.last}, ${m.first}` : mid, `#/members/${mid}`], [rid]];
    loading('Loading request details…', crumbs);
    await latency(400, 1100);
    if (stale(token)) return;
    if (!r) { shell('<div class="card empty">Request not found in this session.</div>', crumbs); return; }
    const p = r.payment;
    const pay = (label, val, id) => `<div class="pi"><div class="k">${label}</div><div class="v" data-testid="pay-${id}">${val || '&nbsp;'}</div></div>`;
    const decidedOutcome = ['approved', 'denied', 'partial'].includes(r.statusKey);

    shell(`
      <div class="req-head card" data-testid="request-header">
        <div class="rh-top">
          <div>
            <div class="tiny upper">Prior Authorization</div>
            <h1 class="page-title mono" data-testid="request-id">${r.id}</h1>
            <div class="subtle">${esc(r.category)} · ${r.type} · ${r.priority} · Submitted ${dateTime(r.submitted)} via ${r.channel}</div>
          </div>
          <span class="pill lg ${statusClass(r.status)}" data-testid="request-status">${r.status}</span>
        </div>
        <div class="kv-grid">
          ${kv('Member', `${m.last}, ${m.first}`)}${kv('Member ID', m.id + m.suffix)}${kv('DOB', mdy(m.dob))}${kv('Plan', m.plan)}
          ${kv('Servicing Provider', r.provider)}${kv('Servicing NPI', r.providerNpi)}${kv('TIN', r.providerTin)}${kv('Network Status', r.network)}
          ${kv('Requesting Provider', r.requestingProvider)}${kv('Place of Service', `${r.pos} – ${REF.posNames[r.pos] || ''}`)}${kv('Claim #', r.claimNumber || '—')}${kv('Tracking #', r.trackingNumber)}
          ${kv('Decision Date', r.decided ? mdy(r.decided) : '—')}${kv('Auth Valid From', r.validFrom ? mdy(r.validFrom) : '—')}${kv('Auth Valid To', r.validTo ? mdy(r.validTo) : '—')}${kv(r.dueBy ? 'Decision Due By' : 'Reviewer', r.dueBy ? mdy(r.dueBy) : (r.reviewer || '—'))}
        </div>
      </div>

      <div class="claim-panel card flush" data-testid="payment-panel">
        <div class="pi-head">
          <span class="pi-title">01. Payment information</span>
          <span class="pi-payable">Payable Amt.: <strong data-testid="pay-payable">${money(p.payable, true)}</strong></span>
        </div>
        <div class="pi-grid">
          ${pay('Adjustment', money(p.adjustment, true), 'adjustment')}
          ${pay('Deductible', money(p.deductible, true), 'deductible')}
          ${pay('Coinsurance', money(p.coinsurance, true), 'coinsurance')}
          ${pay('Copay', money(p.copay, true), 'copay')}
          ${pay('Total Payment Amt.', money(p.totalPayment, true), 'total')}
          ${pay('A/R Balance', money(p.arBalance, true), 'ar-balance')}
          ${pay('IS A/R Amt. Eligible', p.arEligible, 'ar-eligible')}
          ${pay('Interest Payable', money(p.interest, true), 'interest')}
          ${pay('Recovery Amt.', money(p.recovery, true), 'recovery')}
          ${pay('Net Payment Amt.', money(p.net, true), 'net')}
          ${pay('OK Pay Date', mdy(p.okPayDate), 'ok-date')}
          ${pay('Paid Date', mdy(p.paidDate), 'paid-date')}
          ${pay('Check Number', p.checkNumber, 'check')}
          ${pay('Plan CRN', p.planCrn, 'crn')}
          ${pay('Allowed Amount', money(p.allowed, true), 'allowed')}
        </div>

        <div class="icd-row" data-testid="icd-row">
          <div class="icd-label">Primary ICD 10: <span class="dot"></span></div>
          <div class="icd-chips">${r.icd.map((c, i) => `<span class="chip ${i === 0 ? 'primary' : ''}" title="${esc(c)} – ${esc(REF.icd[c] || '')}" data-testid="icd-chip">${icdNoDot(c)}</span>`).join('')}</div>
        </div>

        <div class="table-scroll">
        <table class="lines" data-testid="line-table">
          <thead>
            <tr><th rowspan="2">#</th><th rowspan="2">Code</th><th rowspan="2">Dos From</th><th rowspan="2">Dos To</th><th rowspan="2">P.O.S.</th><th colspan="4" class="center dp-head">Diagnosis Points</th><th rowspan="2">Unit</th><th rowspan="2">Unit Count</th><th rowspan="2">Copay</th><th rowspan="2">Coins</th><th rowspan="2">Total Charges</th><th rowspan="2">Adjudication Status</th><th rowspan="2">Status</th><th rowspan="2">Action</th></tr>
            <tr class="sub"><th class="center">A</th><th class="center">B</th><th class="center">C</th><th class="center">D</th></tr>
          </thead>
          <tbody>
          ${r.lines.map((l) => `
            <tr class="line-row" data-testid="line-row" data-line="${l.n}">
              <td>${String(l.n).padStart(2, '0')}</td>
              <td title="${esc(l.desc)}">${l.code}</td>
              <td>${longDate(l.dosFrom)}</td>
              <td>${longDate(l.dosTo)}</td>
              <td>${l.pos}</td>
              ${l.pointers.map((x) => `<td class="center">${x ?? '-'}</td>`).join('')}
              <td>${l.unit}</td>
              <td class="blue">${l.unitCount}</td>
              <td>${money(l.copay)}</td>
              <td>${money(l.coins)}</td>
              <td>${money(l.charges)}</td>
              <td>${l.adjStatus}</td>
              <td class="line-status" data-testid="line-status">${l.status}</td>
              <td><button class="more-btn" data-line="${l.n}" aria-expanded="false" data-testid="more-info">More Info. <span class="caret">▼</span></button></td>
            </tr>
            <tr class="more-row" id="more-${l.n}" hidden>
              <td colspan="17">
                <div class="more-grid">
                  ${kv('Description', l.desc, 'span2')}${kv('Modifier', l.modifier || '—')}${kv('Requested Units', l.requestedUnits)}${kv('Approved Units', l.approvedUnits)}
                  ${kv('Allowed', money(l.allowed))}${kv('Deductible', money(l.deductible))}${kv('Paid', money(l.paid))}
                  ${kv('Diagnosis', l.pointers.filter(Boolean).map((x) => icdNoDot(r.icd[x - 1])).join(', '))}
                  ${l.reason ? `<div class="kv span4"><div class="k">Reason Code</div><div class="v"><span class="mono">${l.reason[0]}</span> — ${esc(l.reason[1])}</div></div>` : ''}
                  ${l.remark ? `<div class="kv span4"><div class="k">Remark Code</div><div class="v"><span class="mono">${l.remark[0]}</span> — ${esc(l.remark[1])}</div></div>` : ''}
                  ${l.note ? `<div class="kv span4"><div class="k">Note</div><div class="v">${esc(l.note)}</div></div>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3 class="card-h">02. Diagnosis codes</h3>
          <table class="grid compact">
            <thead><tr><th>Ptr</th><th>ICD-10</th><th>Description</th></tr></thead>
            <tbody>${r.icd.map((c, i) => `<tr><td>${i + 1}</td><td class="mono">${c}</td><td>${esc(REF.icd[c] || '')}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="card">
          <h3 class="card-h">03. Request history</h3>
          <ol class="timeline" data-testid="history">
            ${r.history.map((h) => `<li><div class="t-when">${dateTime(h.t)}</div><div class="t-what">${esc(h.e)}</div><div class="t-desc">${esc(h.d)}</div></li>`).join('')}
          </ol>
          ${!decidedOutcome && r.statusKey !== 'cancelled' ? `<div class="alert alert-info mt">This request is still open. Decision due by <strong>${mdy(r.dueBy)}</strong>.</div>` : ''}
        </div>
      </div>
      <div class="back-row"><a class="btn ghost" href="#/members/${m.id}" data-testid="back-to-member">‹ Back to member</a></div>`, crumbs);

    app.querySelectorAll('.more-btn').forEach((b) => {
      b.onclick = () => {
        const row = document.getElementById('more-' + b.dataset.line);
        const open = row.hidden;
        row.hidden = !open;
        b.setAttribute('aria-expanded', String(open));
        b.querySelector('.caret').textContent = open ? '▲' : '▼';
      };
    });
  }

  // ---------- illustration ----------
  const ILLUSTRATION = `
  <svg class="illus" viewBox="0 0 480 330" role="img" aria-label="Two clinicians in front of a hospital building">
    <path d="M40 210 C30 120 110 70 210 60 C320 50 420 90 430 170 C440 250 380 300 250 305 C140 310 50 290 40 210Z" fill="#e4e5f6"/>
    <g fill="#d3d5ef">
      <rect x="70" y="120" width="40" height="160"/><rect x="112" y="150" width="30" height="130"/>
      <rect x="250" y="95" width="46" height="185"/><rect x="298" y="130" width="34" height="150"/>
      <rect x="345" y="110" width="42" height="170"/><rect x="200" y="140" width="40" height="140"/>
      <rect x="270" y="80" width="4" height="15"/><rect x="364" y="95" width="4" height="15"/>
    </g>
    <g fill="#eceef9">
      ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${256 + c * 13}" y="${108 + r * 24}" width="8" height="12"/>`).join('')).join('')}
      ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${351 + c * 12}" y="${124 + r * 24}" width="7" height="12"/>`).join('')).join('')}
      ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 2 }, (_, c) => `<rect x="${78 + c * 16}" y="${134 + r * 26}" width="9" height="13"/>`).join('')).join('')}
    </g>
    <rect x="150" y="60" width="4" height="230" fill="#f4f5fb"/><rect x="330" y="60" width="4" height="230" fill="#f4f5fb"/>
    <rect x="150" y="186" width="184" height="4" fill="#f4f5fb"/>
    <ellipse cx="155" cy="298" rx="46" ry="7" fill="#dfe0ee"/>
    <ellipse cx="350" cy="298" rx="40" ry="6" fill="#dfe0ee"/>
    <ellipse cx="68" cy="302" rx="30" ry="5" fill="#dfe0ee"/>
    <!-- plant -->
    <g>
      <path d="M68 250 C40 225 20 215 8 222 C25 238 45 248 68 252Z" fill="#4a86e8"/>
      <path d="M70 250 C60 215 62 195 72 180 C82 200 80 228 70 250Z" fill="#3b73d9"/>
      <path d="M72 252 C92 222 115 212 130 216 C115 236 95 248 72 252Z" fill="#6b9cf0"/>
      <path d="M68 252 C50 238 34 236 26 242 C38 250 52 253 68 252Z" fill="#8fb4f4"/>
      <rect x="52" y="250" width="34" height="50" rx="3" fill="#1f3a78"/>
      <rect x="52" y="258" width="34" height="3" fill="#6b86c4"/><rect x="52" y="266" width="34" height="3" fill="#6b86c4"/>
    </g>
    <!-- male clinician -->
    <g>
      <rect x="140" y="220" width="12" height="70" fill="#4a86e8"/><rect x="158" y="220" width="12" height="70" fill="#3f7ae0"/>
      <ellipse cx="144" cy="292" rx="10" ry="5" fill="#fff" stroke="#d9dbe8"/><ellipse cx="168" cy="292" rx="10" ry="5" fill="#fff" stroke="#d9dbe8"/>
      <path d="M132 112 Q155 100 178 112 L184 232 L126 232 Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <path d="M148 110 L155 150 L162 110Z" fill="#4a86e8"/>
      <line x1="155" y1="150" x2="155" y2="230" stroke="#d6d9e6" stroke-width="1.5"/>
      <path d="M132 116 L122 200 L132 202 L138 130Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <path d="M178 116 L188 200 L178 202 L172 130Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <circle cx="126" cy="204" r="5" fill="#f2c4a4"/><circle cx="185" cy="204" r="5" fill="#f2c4a4"/>
      <rect x="150" y="96" width="10" height="14" fill="#f2c4a4"/>
      <ellipse cx="155" cy="84" rx="15" ry="17" fill="#f7ccad"/>
      <path d="M139 82 C137 62 172 58 172 78 C166 70 150 70 141 86Z" fill="#2b2f45"/>
    </g>
    <!-- female clinician -->
    <g>
      <rect x="338" y="236" width="6" height="54" fill="#f2c4a4"/><rect x="354" y="236" width="6" height="54" fill="#f2c4a4"/>
      <path d="M334 292 l12 0 l0 -6 l-10 0z" fill="#1f2a55"/><path d="M350 292 l12 0 l0 -6 l-10 0z" fill="#1f2a55"/>
      <path d="M334 186 L364 186 L372 240 L326 240Z" fill="#1f2a55"/>
      <path d="M333 124 Q349 116 365 124 L372 214 L326 214 Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <path d="M333 128 L318 176 L326 180 L338 142Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <rect x="306" y="160" width="20" height="26" rx="2" fill="#dfe6fb" stroke="#9fb3e6" transform="rotate(-12 316 173)"/>
      <circle cx="322" cy="178" r="4.5" fill="#f2c4a4"/>
      <path d="M365 128 L372 186 L364 188 L360 140Z" fill="#fff" stroke="#d6d9e6" stroke-width="1.5"/>
      <rect x="345" y="110" width="8" height="12" fill="#f2c4a4"/>
      <path d="M335 100 C332 80 366 78 364 100 C366 120 372 140 366 150 C360 138 358 120 356 110 L342 110 C340 124 336 136 330 148 C326 130 336 116 335 100Z" fill="#23263b"/>
      <ellipse cx="349" cy="99" rx="12" ry="14" fill="#f7ccad"/>
      <path d="M336 96 C338 82 362 80 363 96 C356 90 344 90 336 96Z" fill="#23263b"/>
    </g>
  </svg>`;

  route();
})();
