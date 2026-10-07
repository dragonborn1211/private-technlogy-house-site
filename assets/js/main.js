/* ════════════════════════════════════════════════════════════════
   Private Technology House — main.js
   Без фреймворков и зависимостей. Каждый блок ниже независим.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Каналы связи. Заполнить перед публикацией. ───────────────── */
  var CONFIG = {
    endpoint: '', // URL, принимающий POST application/json { task, contact }
    email: '',    // например 'house@example.com' — запасной канал (mailto)
    telegram: '', // username без @ — откроется t.me/<username>
    github: ''    // ссылка на профиль организации
  };

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Отпечаток страницы считаем до того, как скрипт что-либо изменит в DOM.
  var pageHash = fnv1a(root.outerHTML);

  /* ── Данные ───────────────────────────────────────────────────── */
  var OBJ = [
    { n: '01', cat: 'Коммерция / Цифровой продукт', name: 'Титарка Атлас', desc: '[Одна фраза о продукте: что это и для кого.]', stack: '[headless e-commerce · API · 1С]', url: '[домен] / каталог' },
    { n: '02', cat: 'Системы / CRM', name: '[Объект 02]', desc: '[Одна фраза о системе.]', stack: '[Битрикс24 · n8n · телефония]', url: '[домен] / crm / сделки' },
    { n: '03', cat: 'Интеллект / AI', name: '[Объект 03]', desc: '[Одна фраза об AI-решении.]', stack: '[LLM · RAG · база знаний]', url: '[домен] / ассистент' },
    { n: '00', cat: 'Сайт студии', name: 'Объект №00', desc: 'Сайт, который вы сейчас смотрите. Откройте его — и поверхность станет прозрачной.', stack: 'HTML · CSS · vanilla JS · 0 зависимостей', url: location.host || 'этот сайт', self: true }
  ];

  var LAY = [
    { n: '01', name: 'Интерфейс', title: 'Поверхность, которая не требует объяснений.', desc: 'Быстрый рендеринг, адаптивность, доступность. Одно действие вместо пяти.', stack: 'SSR · адаптив · WCAG AA', file: 'interface/confirm.tsx',
      code: 'export function Confirm({ order }) {\n  const pay = usePayment(order.id)\n  return (\n    <Button onClick={pay.confirm} loading={pay.pending}>\n      Готово\n    </Button>\n  )\n}' },
    { n: '02', name: 'API', title: 'Единый вход для всех систем.', desc: 'Чёткие контракты между сайтом, CRM, складом и мобильным приложением.', stack: 'REST · GraphQL · webhooks', file: 'api/orders.ts',
      code: "router.post('/orders', auth(), rateLimit('60/min'),\n  validate(OrderSchema),\n  async (req, res) => {\n    const order = await orders.create(req.body)\n    await events.emit('order.created', order)\n    res.status(201).json(order)\n  })" },
    { n: '03', name: 'Автоматизация', title: 'Ручная работа уходит из системы.', desc: 'Сценарии, очереди и фоновые задачи, которые работают сами.', stack: 'n8n · очереди · cron', file: 'flows/order.flow.yml',
      code: 'on: order.created\nsteps:\n  - crm.deal.add:      { from: order }\n  - warehouse.reserve: { items: order.items }\n  - notify.telegram:   { chat: sales }\nretry: { attempts: 3, backoff: exponential }' },
    { n: '04', name: 'CRM', title: 'Сделки, которые не теряются.', desc: 'Воронки, кастомные сущности, телефония и аналитика менеджеров.', stack: 'Битрикс24 · amoCRM · API', file: 'crm/sync.php',
      code: "$deal = CRest::call('crm.deal.add', [\n  'fields' => [\n    'TITLE'       => \"Заказ #{$order->id}\",\n    'OPPORTUNITY' => $order->total,\n    'STAGE_ID'    => 'NEW',\n  ],\n]);" },
    { n: '05', name: 'Данные', title: 'Данные как фундамент.', desc: 'Надёжное хранение, кеширование и отчёты без ручных выгрузок.', stack: 'PostgreSQL · Redis · аналитика', file: 'db/schema.sql',
      code: "create table orders (\n  id         uuid primary key default gen_random_uuid(),\n  status     text not null default 'new',\n  total      numeric(12,2) not null,\n  created_at timestamptz not null default now()\n);\ncreate index on orders (status, created_at desc);" },
    { n: '06', name: 'Интеллект', title: 'AI там, где он действительно нужен.', desc: 'Ассистенты, базы знаний, анализ звонков и документов внутри ваших процессов.', stack: 'LLM · RAG · агенты', file: 'ai/assistant.ts',
      code: 'const context = await kb.search(question, { top: 5 })\nconst answer = await llm.complete({\n  system: policy.support,\n  input: question,\n  context,\n})\nreturn cite(answer, context) // с источниками' },
    { n: '07', name: 'Инфраструктура', title: 'Скорость и стабильность — часть красоты.', desc: 'Серверы, деплой без простоя, мониторинг, бэкапы и безопасность.', stack: 'VPS · Docker · CI/CD · Cloudflare', file: 'deploy.yml',
      code: 'deploy:\n  build:   docker build --target prod .\n  test:    npm test && npm run e2e\n  migrate: db migrate --safe\n  release: blue-green · zero-downtime\n  health:  GET /health → 200 OK' }
  ];

  /* ── Утилиты ──────────────────────────────────────────────────── */
  function bind(prefix, obj) {
    $$('[data-b^="' + prefix + '."]').forEach(function (el) {
      var v = obj[el.getAttribute('data-b').slice(prefix.length + 1)];
      if (v != null) el.textContent = v;
    });
  }

  // Мягкая смена содержимого: текст уходит в размытие и проявляется снова.
  var swapTimers = {};
  function swap(key, els, fn, instant) {
    clearTimeout(swapTimers[key]);
    if (instant || reduceMotion) { fn(); els.forEach(function (e) { e.classList.remove('swap'); }); return; }
    els.forEach(function (e) { e.classList.add('swap'); });
    swapTimers[key] = setTimeout(function () {
      fn();
      els.forEach(function (e) { e.classList.remove('swap'); });
    }, 320);
  }

  var KW = /^(const|let|var|await|async|return|export|function|import|from|new|create|table|primary|key|not|null|default|on|index|desc|steps|retry|deploy)$/;
  function highlight(src) {
    var re = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="n">' + m[3] + '</span>';
      else out += KW.test(m[4]) ? '<span class="k">' + m[4] + '</span>' : esc(m[4]);
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /* ── Header: стекло появляется после начала прокрутки ─────────── */
  var header = $('[data-header]');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Проявление при прокрутке ─────────────────────────────────── */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Свет на стекле следует за курсором ───────────────────────── */
  if (finePointer && !reduceMotion) {
    $$('.glass').forEach(function (g) {
      g.addEventListener('pointermove', function (e) {
        var r = g.getBoundingClientRect();
        g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        g.style.setProperty('--my', (e.clientY - r.top) + 'px');
        g.classList.add('lit');
      });
      g.addEventListener('pointerleave', function () { g.classList.remove('lit'); });
    });
  }

  /* ── Hero: деплой печатается в терминале ──────────────────────── */
  (function terminal() {
    var term = $('[data-term]');
    if (!term || reduceMotion || getComputedStyle(term.parentNode).display === 'none') return;
    var typeEl = $('[data-type]', term);
    var steps = $$('[data-step]', term);
    var fin = $('[data-final]', term);
    var text = typeEl.textContent;
    typeEl.textContent = '';
    typeEl.classList.add('caret');
    steps.forEach(function (s) { s.textContent = '·'; s.classList.add('wait'); });
    fin.classList.add('hide');

    var t = 1900;
    for (var k = 1; k <= text.length; k++) {
      (function (k) { setTimeout(function () { typeEl.textContent = text.slice(0, k); }, t + k * 45); })(k);
    }
    t += text.length * 45 + 350;
    setTimeout(function () { typeEl.classList.remove('caret'); }, t);
    steps.forEach(function (s, i) {
      setTimeout(function () { s.textContent = '✓'; s.classList.remove('wait'); }, t + 300 + i * 420);
    });
    setTimeout(function () { fin.classList.remove('hide'); }, t + 300 + steps.length * 420 + 200);
  })();

  /* ── 03 Objects ───────────────────────────────────────────────── */
  var objCard = $('.obj-card');
  var objPreview = $('.obj-preview');
  var objIdx = 0;
  var enterLink = $('[data-obj-enter]');
  function updateEnterLabel() {
    var label = $('[data-enter-label]');
    if (!label) return;
    label.textContent = OBJ[objIdx].self && isBeneath() ? 'Вернуться на поверхность' : 'Открыть объект';
  }
  function setObj(i) {
    objIdx = i;
    swap('obj', [objCard, objPreview], function () { bind('cur', OBJ[i]); updateEnterLabel(); });
    $$('[data-preview]').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-preview') === String(i)); });
    $$('[data-pick^="obj:"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-pick') === 'obj:' + i));
    });
  }
  if (enterLink) {
    enterLink.addEventListener('click', function (e) {
      if (!OBJ[objIdx].self) return;
      e.preventDefault();
      setBeneath(!isBeneath());
    });
  }

  /* ── 04 Craft: слои системы ───────────────────────────────────── */
  var plates = $$('[data-plate]');
  var codeBox = $('.code');
  var codeEl = $('[data-code] code');
  var layerDetail = $('.layer-detail');
  var layerIdx = 0;
  var layerAuto = !reduceMotion;
  function setLayer(i, instant) {
    layerIdx = i;
    plates.forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.classList.toggle('above', k < i);
      p.classList.toggle('below', k > i);
    });
    swap('layer', [layerDetail, codeBox], function () {
      bind('layer', LAY[i]);
      codeEl.innerHTML = highlight(LAY[i].code);
    }, instant);
    $$('[data-pick^="layer:"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-pick') === 'layer:' + i));
    });
  }
  setLayer(0, true);

  // Пока секция на экране и пользователь ничего не выбрал — слои раскрываются сами.
  (function autoLayers() {
    var section = $('#craft');
    if (!layerAuto || !section || !('IntersectionObserver' in window)) return;
    var timer = null;
    function tick() { if (layerAuto) setLayer((layerIdx + 1) % LAY.length); }
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      clearInterval(timer);
      if (visible && layerAuto) timer = setInterval(tick, 5200);
    }, { threshold: 0.45 }).observe(section);
    section.addEventListener('pointerdown', function () { layerAuto = false; clearInterval(timer); });
    section.addEventListener('keydown', function () { layerAuto = false; clearInterval(timer); });
  })();

  // Лёгкий наклон стопки за курсором: элементы чуть меняют глубину.
  (function tilt() {
    var area = $('[data-stack-area]');
    var stack = $('[data-stack]');
    if (!area || !stack || !finePointer || reduceMotion) return;
    area.addEventListener('pointermove', function (e) {
      var r = area.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      stack.style.setProperty('--tz', (dx * 10).toFixed(2) + 'deg');
      stack.style.setProperty('--tx', (-dy * 8).toFixed(2) + 'deg');
    });
    area.addEventListener('pointerleave', function () {
      stack.style.setProperty('--tz', '0deg');
      stack.style.setProperty('--tx', '0deg');
    });
  })();

  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    var p = b.getAttribute('data-pick').split(':');
    if (p[0] === 'obj') setObj(+p[1]);
    else { layerAuto = false; setLayer(+p[1]); }
  });

  /* ── Метрики страницы — измеряются в браузере посетителя ──────── */
  var M = { fcp: null, lcp: null, cls: 0, clsSupported: false };
  function observe(type, cb) {
    try {
      new PerformanceObserver(function (list) { cb(list.getEntries()); renderMetrics(); })
        .observe({ type: type, buffered: true });
      return true;
    } catch (e) { return false; }
  }
  observe('paint', function (es) {
    es.forEach(function (e) { if (e.name === 'first-contentful-paint') M.fcp = e.startTime; });
  });
  observe('largest-contentful-paint', function (es) {
    if (es.length) M.lcp = es[es.length - 1].startTime;
  });
  M.clsSupported = observe('layout-shift', function (es) {
    es.forEach(function (e) { if (!e.hadRecentInput) M.cls += e.value; });
  });

  function entrySize(r) { return r.transferSize || r.encodedBodySize || 0; }
  function pageWeight() {
    var w = { bytes: 0, req: 0, js: 0, css: 0 };
    if (!window.performance || !performance.getEntriesByType) return w;
    var nav = performance.getEntriesByType('navigation')[0];
    if (nav) { w.bytes += entrySize(nav); w.req++; }
    performance.getEntriesByType('resource').forEach(function (r) {
      var s = entrySize(r);
      w.bytes += s; w.req++;
      if (/\.js(\?|$)/.test(r.name)) w.js += s;
      else if (/\.css(\?|$)|fonts\.googleapis\.com\/css/.test(r.name)) w.css += s;
    });
    return w;
  }
  function fmtMs(v) { return v == null ? '—' : v < 1000 ? Math.round(v) + ' ms' : (v / 1000).toFixed(2) + ' s'; }
  function fmtKB(b) { return !b ? '—' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(2) + ' MB'; }

  var hud = $('[data-hud]');
  var metricsEl = $('[data-metrics]');
  function renderMetrics() {
    var w = pageWeight();
    renderProof(w);
    if (!hud || hud.hidden) return;
    var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var rows = [
      ['TTFB', nav ? fmtMs(nav.responseStart - nav.startTime) : '—'],
      ['Первая отрисовка', fmtMs(M.fcp)],
      ['LCP', fmtMs(M.lcp), M.lcp != null && M.lcp < 2500],
      ['CLS', M.clsSupported ? M.cls.toFixed(3) : '—', M.clsSupported && M.cls < 0.1],
      ['Передано', fmtKB(w.bytes)],
      ['Запросы', String(w.req)],
      ['JS / CSS', fmtKB(w.js) + ' / ' + fmtKB(w.css)],
      ['DOM-узлы', String(doc.getElementsByTagName('*').length)],
      ['Экран', window.innerWidth + '×' + window.innerHeight],
      ['Фреймворки', '0', true]
    ];
    metricsEl.innerHTML = rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="good"' : '') + '>' + r[1] + '</dd>';
    }).join('');
  }

  // «Performance is part of beauty» — подкрепляем принцип живыми цифрами.
  // Показываем строку, только если цифры действительно хорошие.
  function renderProof(w) {
    var el = $('[data-proof]');
    if (!el) return;
    var lcpOk = M.lcp == null || M.lcp < 2500;
    var clsOk = !M.clsSupported || M.cls < 0.1;
    if (!lcpOk || !clsOk || !w.bytes) { el.hidden = true; return; }
    var parts = [];
    if (M.lcp != null) parts.push('LCP ' + fmtMs(M.lcp));
    if (M.clsSupported) parts.push('CLS ' + M.cls.toFixed(2));
    parts.push(fmtKB(w.bytes) + ' за ' + w.req + ' запросов');
    el.textContent = 'эта страница: ' + parts.join(' · ') + ' — измерено у вас';
    el.hidden = false;
  }
  window.addEventListener('load', function () { setTimeout(renderMetrics, 300); });

  /* ── Beneath: поверхность становится прозрачной ───────────────── */
  var metricsTimer = null;
  function isBeneath() { return root.classList.contains('beneath'); }
  function measureBlocks() {
    $$('[data-x]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.setAttribute('data-xs', Math.round(r.width) + '×' + Math.round(r.height));
    });
  }
  function setBeneath(on) {
    root.classList.toggle('beneath', on);
    $$('[data-beneath-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(on)); });
    hud.hidden = !on;
    clearInterval(metricsTimer);
    if (on) {
      measureBlocks();
      renderMetrics();
      metricsTimer = setInterval(renderMetrics, 1500);
    }
    updateEnterLabel();
  }
  $$('[data-beneath-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setBeneath(!isBeneath()); });
  });
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (isBeneath()) { measureBlocks(); renderMetrics(); } }, 200);
  });

  /* ── Command palette: ⌘K / Ctrl+K ─────────────────────────────── */
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (!isMac) $$('[data-mod]').forEach(function (k) { k.textContent = 'Ctrl'; });

  var palette = $('[data-palette]');
  var pInput = $('[data-palette-input]');
  var pList = $('[data-palette-list]');
  var lastFocus = null;
  var pItems = [];
  var pSel = 0;

  function go(hash) {
    var target = $(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', hash);
    // Фокус следует за прокруткой, чтобы клавиатура продолжала с нужного места.
    var focusTarget = hash === '#enter' ? $('#pc-what') : target;
    if (focusTarget !== $('#pc-what') && !focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, reduceMotion ? 0 : 700);
  }

  function commands() {
    var list = [
      { g: 'Разделы', label: 'Главная', hint: '01', k: 'главная начало hero', run: function () { go('#top'); } },
      { g: 'Разделы', label: 'Направления и цены', hint: 'от 250 тыс. ₽', k: 'услуги сервисы цены разработка сайты crm ai инфраструктура', run: function () { go('#services'); } },
      { g: 'Разделы', label: 'Дом', hint: '02', k: 'о нас команда дом', run: function () { go('#house'); } },
      { g: 'Разделы', label: 'Объекты', hint: '03', k: 'проекты портфолио кейсы работы', run: function () { go('#objects'); } },
      { g: 'Разделы', label: 'Под поверхностью — слои системы', hint: '04', k: 'технологии стек api данные автоматизация', run: function () { go('#craft'); } },
      { g: 'Разделы', label: 'Как строится объект', hint: '05', k: 'процесс этапы как работаем', run: function () { go('#process'); } },
      { g: 'Разделы', label: 'Стандарт', hint: '06', k: 'принципы стандарт качество', run: function () { go('#standard'); } },
      { g: 'Разделы', label: 'Связаться — обсудить проект', hint: '07', k: 'контакт связаться заявка написать', run: function () { go('#enter'); } },
      { g: 'Действия', label: isBeneath() ? 'Вернуться на поверхность' : 'Глубина — показать, что под поверхностью', hint: 'B', k: 'beneath глубина x-ray метрики структура код', run: function () { setBeneath(!isBeneath()); } }
    ];
    if (CONFIG.telegram) list.push({ g: 'Действия', label: 'Написать в Telegram', hint: '@' + CONFIG.telegram, k: 'telegram телеграм', run: function () { window.open('https://t.me/' + CONFIG.telegram, '_blank', 'noopener'); } });
    if (CONFIG.email) list.push({ g: 'Действия', label: 'Скопировать email', hint: CONFIG.email, k: 'почта email', run: function () { if (navigator.clipboard) navigator.clipboard.writeText(CONFIG.email); } });
    return list;
  }

  function renderPalette() {
    var q = pInput.value.trim().toLowerCase();
    pItems = commands().filter(function (c) { return !q || (c.label + ' ' + c.k + ' ' + c.hint).toLowerCase().indexOf(q) !== -1; });
    if (pSel >= pItems.length) pSel = 0;
    var html = '', group = '';
    pItems.forEach(function (c, i) {
      if (c.g !== group) { group = c.g; html += '<li class="grp" role="presentation">' + esc(group) + '</li>'; }
      html += '<li role="option" id="pal-' + i + '" data-i="' + i + '" aria-selected="' + (i === pSel) + '"><span>' + esc(c.label) + '</span><span class="mono">' + esc(c.hint) + '</span></li>';
    });
    pList.innerHTML = html || '<li class="empty" role="presentation">Ничего не нашлось. Попробуйте «crm» или «контакт».</li>';
    if (pItems.length) pInput.setAttribute('aria-activedescendant', 'pal-' + pSel);
    else pInput.removeAttribute('aria-activedescendant');
  }
  function select(i) {
    if (!pItems.length) return;
    pSel = (i + pItems.length) % pItems.length;
    $$('[role="option"]', pList).forEach(function (o) { o.setAttribute('aria-selected', String(+o.getAttribute('data-i') === pSel)); });
    pInput.setAttribute('aria-activedescendant', 'pal-' + pSel);
    var cur = $('#pal-' + pSel);
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function runSelected(i) {
    var c = pItems[i];
    if (!c) return;
    closePalette(true);
    c.run();
  }
  function openPalette() {
    if (!palette.hidden) return;
    lastFocus = doc.activeElement;
    pInput.value = '';
    pSel = 0;
    renderPalette();
    palette.hidden = false;
    pInput.focus();
  }
  function closePalette(skipFocus) {
    if (palette.hidden) return;
    palette.hidden = true;
    if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $$('[data-palette-open]').forEach(function (b) { b.addEventListener('click', openPalette); });
  $$('[data-palette-close]').forEach(function (b) { b.addEventListener('click', function () { closePalette(); }); });
  pInput.addEventListener('input', function () { pSel = 0; renderPalette(); });
  pInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(pSel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(pSel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runSelected(pSel); }
    else if (e.key === 'Tab') { e.preventDefault(); select(pSel + (e.shiftKey ? -1 : 1)); }
  });
  pList.addEventListener('pointermove', function (e) {
    var o = e.target.closest('[role="option"]');
    if (o && +o.getAttribute('data-i') !== pSel) select(+o.getAttribute('data-i'));
  });
  pList.addEventListener('click', function (e) {
    var o = e.target.closest('[role="option"]');
    if (o) runSelected(+o.getAttribute('data-i'));
  });

  doc.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) {
      e.preventDefault();
      if (palette.hidden) openPalette(); else closePalette();
      return;
    }
    if (e.key === 'Escape') {
      if (!palette.hidden) closePalette();
      else if (isBeneath()) setBeneath(false);
      return;
    }
    var t = e.target;
    var typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') setBeneath(!isBeneath());
  });

  /* ── 07 Enter: форма как запрос ───────────────────────────────── */
  (function enterForm() {
    var form = $('[data-enter]');
    if (!form) return;
    var reqEl = $('[data-req]', form);
    var statusEl = $('[data-status]', form);
    var btn = $('button[type="submit"]', form);
    var path = '/enter';
    if (CONFIG.endpoint) { try { path = new URL(CONFIG.endpoint, location.href).pathname; } catch (e) { /* оставляем /enter */ } }

    function payload() { return { task: form.task.value.trim(), contact: form.contact.value.trim() }; }
    function renderReq() {
      var p = payload();
      reqEl.innerHTML = '<span class="k">POST</span> ' + esc(path) + '\n{ "task": ' + esc(JSON.stringify(p.task)) + ', "contact": ' + esc(JSON.stringify(p.contact)) + ' }';
    }
    function say(msg) { statusEl.textContent = msg; }

    form.addEventListener('input', function (e) {
      if (e.target.value.trim()) e.target.removeAttribute('aria-invalid');
      renderReq();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = payload();
      var firstBad = null;
      [form.task, form.contact].forEach(function (f) {
        var empty = !f.value.trim();
        if (empty) { f.setAttribute('aria-invalid', 'true'); firstBad = firstBad || f; }
      });
      if (firstBad) { firstBad.focus(); say('Нужны обе строки: задача и контакт.'); return; }

      if (CONFIG.endpoint) {
        btn.disabled = true;
        say('→ POST ' + path + ' …');
        fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
          .then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
            say('← ' + r.status + ' · принято. Мы ответим сами.');
            form.reset();
            renderReq();
          })
          .catch(function () { say('Не дошло. ' + (CONFIG.email ? 'Напишите на ' + CONFIG.email + '.' : 'Попробуйте ещё раз.')); })
          .then(function () { btn.disabled = false; });
      } else if (CONFIG.email) {
        location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Enter — ' + p.task.slice(0, 80)) + '&body=' + encodeURIComponent(p.task + '\n\n' + p.contact);
        say('Открываем почту…');
      } else if (CONFIG.telegram) {
        window.open('https://t.me/' + CONFIG.telegram, '_blank', 'noopener');
        say('Открываем Telegram…');
      } else {
        say('Канал связи ещё не подключён.');
      }
    });
    renderReq();
  })();

  /* ── Footer: отпечаток страницы и контакты ────────────────────── */
  var buildEl = $('[data-build]');
  if (buildEl) buildEl.textContent = pageHash.slice(0, 7);
  var deployedEl = $('[data-deployed]');
  var lm = new Date(doc.lastModified);
  if (deployedEl && !isNaN(lm)) {
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    deployedEl.textContent = pad(lm.getDate()) + '.' + pad(lm.getMonth() + 1) + '.' + lm.getFullYear() + ' ' + pad(lm.getHours()) + ':' + pad(lm.getMinutes());
  }
  var links = { telegram: CONFIG.telegram && 'https://t.me/' + CONFIG.telegram, email: CONFIG.email && 'mailto:' + CONFIG.email, github: CONFIG.github };
  $$('[data-link]').forEach(function (a) {
    var href = links[a.getAttribute('data-link')];
    if (href) { a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } }
  });

  /* ── Для тех, кто открыл консоль ──────────────────────────────── */
  if (window.console && console.log) {
    console.log(
      '%cPTH%c  Private Technology House\n\n%cВы заглянули под поверхность. Нам это нравится.\nНажмите B — и сайт покажет, как он устроен.',
      'font: 500 22px Georgia, serif; letter-spacing: .06em; color: #4F7184',
      'font: 400 10px monospace; letter-spacing: .3em; color: #6F8796',
      'font: 400 12px/1.6 monospace; color: #6F8796'
    );
  }
})();
