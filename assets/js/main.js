/* Language switch, terminal, credential filter, reveal-on-scroll. No dependencies. */
(function () {
  'use strict';
  var I18N = window.I18N || { en: {}, bn: {} };
  var LANGS = ['en', 'bn'];
  var LOCALE = { en: 'en-GB', bn: 'bn-BD' };
  var lang = 'en';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }

  function applyLang(next) {
    lang = LANGS.indexOf(next) >= 0 ? next : 'en';
    var d = I18N[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n')]; if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-html')]; if (v != null) el.innerHTML = v; // trusted, build-time strings
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'); var v = d[p[1]]; if (v != null) el.setAttribute(p[0], v);
      });
    });
    var fmt;
    try { fmt = new Intl.DateTimeFormat(LOCALE[lang], { month: 'short', year: 'numeric' }); } catch (e) { fmt = null; }
    if (fmt) document.querySelectorAll('time.c-date').forEach(function (el) {
      var p = el.getAttribute('datetime').split('-');
      el.textContent = fmt.format(new Date(Date.UTC(+p[0], +p[1] - 1, 15)));
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    syncMore();
    boot();
    store('lang', lang);
    var url = new URL(location.href);
    if (url.searchParams.get('lang') !== lang && (url.searchParams.has('lang') || lang !== 'en')) {
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    }
  }

  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });

  /* ---------- terminal ---------- */
  var log = document.getElementById('term-log');
  var form = document.getElementById('term-form');
  var input = document.getElementById('term-input');
  var ROUTES = [
    [/^(help|\?|man)$/, 't.help'],
    [/^(about|whoami|eshan)$/, 't.about'],
    [/(aipg|adbhik|agency|studio|systems|company)/, 't.aipg'],
    [/(hire|price|pricing|service|quote|cost)/, 't.hire'],
    [/(product|work|project|hrms|hms|vms|dms|brain|reach)/, 't.products'],
    [/(stack|tech|skill)/, 't.stack'],
    [/(xpert|fintech|uat|brd|srs)/, 't.xpert'],
    [/(research|ieee|paper|publication)/, 't.research'],
    [/(edu|nsu|north south|school|college)/, 't.education'],
    [/(role|open|job)/, 't.roles'],
    [/(contact|email|mail|linkedin|github)/, 't.contact']
  ];
  function line(cls, text) {
    var el = document.createElement('div'); el.className = cls; el.textContent = text; log.appendChild(el);
  }
  function run(raw) {
    var cmd = raw.trim().toLowerCase().slice(0, 60);
    if (!cmd) return;
    if (cmd === 'clear' || cmd === 'cls') { log.innerHTML = ''; line('sys', t('term.boot')); return; }
    line('cmd', '$ ' + cmd);
    var key = null;
    for (var i = 0; i < ROUTES.length && !key; i++) if (ROUTES[i][0].test(cmd)) key = ROUTES[i][1];
    line('out', key ? t(key) : t('t.unknown').replace('{cmd}', cmd));
    log.scrollTop = log.scrollHeight;
  }
  var touched = false;
  function boot() {
    if (!log || touched) return;
    log.innerHTML = '';
    line('sys', t('term.boot'));
    line('sys', t('term.hint'));
    run('about');
  }
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); touched = true; run(input.value); input.value = ''; });
    document.querySelectorAll('#term-chips button').forEach(function (b) {
      b.addEventListener('click', function () { touched = true; run(b.getAttribute('data-cmd')); });
    });
  }

  /* ---------- credentials: filter + show more ---------- */
  var certs = [].slice.call(document.querySelectorAll('#certs .cert'));
  var moreBtn = document.getElementById('certs-more');
  var filter = 'all', expanded = false, LIMIT = 9;
  function renderCerts() {
    var shown = 0;
    certs.forEach(function (c) {
      var match = filter === 'all' || c.getAttribute('data-g') === filter;
      var visible = match && (expanded || filter !== 'all' || shown < LIMIT);
      if (match) shown++;
      c.hidden = !visible;
    });
    moreBtn.hidden = filter !== 'all';
    syncMore();
  }
  function syncMore() {
    if (!moreBtn) return;
    moreBtn.textContent = expanded ? t('cr.less') : t('cr.more');
    moreBtn.setAttribute('aria-expanded', String(expanded));
  }
  if (moreBtn && certs.length) {
    document.querySelectorAll('.cert-tools button').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.getAttribute('data-f');
        document.querySelectorAll('.cert-tools button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        renderCerts();
      });
    });
    moreBtn.addEventListener('click', function () {
      expanded = !expanded; renderCerts();
      if (!expanded) document.getElementById('credentials').scrollIntoView({ block: 'start' });
    });
    renderCerts();
  }

  /* ---------- pointer glow on product cards ---------- */
  document.querySelectorAll('.p').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- reveal on scroll ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- initial language: ?lang= > saved > browser ---------- */
  var q = new URLSearchParams(location.search).get('lang');
  var saved = store('lang');
  var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var initial = LANGS.indexOf(q) >= 0 ? q : (LANGS.indexOf(saved) >= 0 ? saved : (nav === 'bn' ? 'bn' : 'en'));
  if (initial !== 'en') applyLang(initial); else { syncMore(); boot(); }
})();
