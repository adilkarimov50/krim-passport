/* Общие компоненты паспорта: шапка, подвал, диаграммы, форматирование. */

const DATA = window.KRIM_DATA || {};
const PASSPORTS = DATA.passports || [];
const GEO = DATA.geo || {};

const SITE = {
  repo: 'https://github.com/adilkarimov50/krim-passport',
  pages: 'https://adilkarimov50.github.io/krim-passport/',
};

const CATEGORY_COLORS = {
  hotspot: '#cf3f3f',
  street: '#d98324',
  object: '#7a4fb5',
  settlement: '#1f6fb2',
  reference: '#5d6b80',
};

const CATEGORY_LABELS = {
  hotspot: 'Точки концентрации',
  street: 'Проблемные улицы',
  object: 'Криминогенные объекты',
  settlement: 'Населённые пункты',
  reference: 'Инфраструктура',
};

const DONUT_COLORS = ['#0d1b33', '#1f6fb2', '#c8a24a', '#8b9bb4', '#7a4fb5', '#1f8a53'];

/* ---------- Форматирование ---------- */

const nf = new Intl.NumberFormat('ru-RU');

function fmt(value) {
  return value === null || value === undefined ? '—' : nf.format(value);
}

function pct(value, digits = 1) {
  return `${value.toFixed(digits).replace('.', ',').replace(/,0$/, '')}%`;
}

function esc(text) {
  return String(text ?? '').replace(/[&<>"]/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
  ));
}

/** Микрозоны из паспорта: hotspots_detailed приоритетнее укрупнённых hotspots. */
function passportHotspots(p) {
  const list = (p.hotspots_detailed?.length ? p.hotspots_detailed : p.hotspots) || [];
  return [...list].sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
}

function hotspotCountHtml(count) {
  if (count === null || count === undefined) {
    return '<span style="font-size:12px;color:var(--muted);font-weight:600">ожид. состав</span>';
  }
  return `${fmt(count)}<span>фактов</span>`;
}

/**
 * Плашка динамики. Для преступности рост — негативный сигнал, поэтому
 * положительное изменение окрашивается в красный.
 */
function deltaBadge(value) {
  if (value === null || value === undefined) return '';
  const kind = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const sign = value > 0 ? '▲ +' : value < 0 ? '▼ ' : '';
  return `<span class="delta delta--${kind}">${sign}${pct(Math.abs(value))}</span>`;
}

function deltaFromPair(row) {
  if (row.delta_pct !== undefined) return row.delta_pct;
  if (row.current && row.previous) return ((row.current - row.previous) / row.previous) * 100;
  return null;
}

/* ---------- Диаграммы ---------- */

/** Сравнительные полосы «текущий период / АППГ». */
function barsChart(rows) {
  const max = Math.max(...rows.flatMap((r) => [r.current || 0, r.previous || 0]), 1);
  const body = rows.map((row) => {
    const cur = row.current || 0;
    const prev = row.previous || 0;
    return `
      <div class="bar">
        <div class="bar__head">
          <span class="bar__name">${esc(row.indicator)}</span>
          <span class="bar__nums">${fmt(cur)} / ${fmt(prev)} ${deltaBadge(deltaFromPair(row))}</span>
        </div>
        <div class="bar__track">
          <div class="bar__prev" style="width:${(prev / max) * 100}%"></div>
          <div class="bar__fill" style="width:${(cur / max) * 100}%"></div>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="legend">
      <span><i style="background:var(--navy-700)"></i>Текущий период</span>
      <span><i style="background:#c3cede"></i>Аналогичный период прошлого года</span>
    </div>
    <div class="bars">${body}</div>`;
}

/** Простые полосы одного ряда значений. */
function simpleBars(rows) {
  const max = Math.max(...rows.map((r) => r.value || 0), 1);
  return `<div class="bars">${rows.map((row) => `
    <div class="bar">
      <div class="bar__head">
        <span class="bar__name">${esc(row.label)}</span>
        <span class="bar__nums">${fmt(row.value)}</span>
      </div>
      <div class="bar__track">
        <div class="bar__fill" style="width:${(row.value / max) * 100}%;background:${row.color || 'var(--navy-700)'}"></div>
      </div>
    </div>`).join('')}</div>`;
}

/** Кольцевая диаграмма с легендой. */
function donutChart(rows) {
  const total = rows.reduce((sum, r) => sum + (r.value || 0), 0) || 1;
  const R = 62;
  const C = 2 * Math.PI * R;
  let offset = 0;

  const arcs = rows.map((row, i) => {
    const share = (row.value || 0) / total;
    const seg = `<circle r="${R}" cx="80" cy="80" fill="none"
        stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="26"
        stroke-dasharray="${share * C} ${C}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 80 80)"></circle>`;
    offset += share * C;
    return seg;
  }).join('');

  const legend = rows.map((row, i) => `
    <div>
      <i style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i>
      <span>${esc(row.label)}</span>
      <b>${fmt(row.value)} · ${pct(((row.value || 0) / total) * 100)}</b>
    </div>`).join('');

  return `
    <div class="donut-wrap">
      <svg class="donut" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Кольцевая диаграмма">
        ${arcs}
        <text x="80" y="76" text-anchor="middle" font-size="25" font-weight="700" fill="#16202f">${fmt(total)}</text>
        <text x="80" y="95" text-anchor="middle" font-size="11" fill="#5d6b80">всего</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

/* ---------- Шапка и подвал ---------- */

function renderTopbar(page, activeId) {
  const tabs = [
    ['index.html', 'Обзор', 'index'],
    ['passport.html', 'Паспорт', 'passport'],
    ['map.html', 'Карта объектов', 'map'],
    ['profilaktika_navigator.html', 'Механизмы', 'navigator'],
  ];
  return `
  <header class="topbar">
    <div class="wrap topbar__inner">
      <a class="brand" href="index.html">
        <span class="brand__mark">КП</span>
        <span class="brand__text">Криминологический паспорт
          <small>Алматинская область · Карасайский и Уйгурский районы · 2026</small>
        </span>
      </a>
      <nav class="topbar__nav">
        ${tabs.map(([href, label, key]) => {
          const qs = activeId && (key === 'passport' || key === 'map') ? `?id=${activeId}` : '';
          return `
          <a class="tab" href="${href}${qs}"
             ${key === page ? 'aria-current="page"' : ''}>${label}</a>`;
        }).join('')}
      </nav>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div>
          <h3>Цифровой криминологический паспорт</h3>
          <p>Паспорта населённых пунктов оцифрованы из документов формата .docx и опубликованы
             в виде интерактивного издания. Исходные данные, скрипт оцифровки и исходный код
             страницы открыты в репозитории.</p>
          <p>Репозиторий: <a href="${SITE.repo}">${SITE.repo.replace('https://', '')}</a></p>
          <p>Адрес издания: <a href="${SITE.pages}">${SITE.pages.replace('https://', '')}</a></p>
        </div>
        <div class="footer__qr">
          <img src="assets/img/qr.svg" alt="QR-код для перехода к цифровому паспорту" width="148" height="148">
          <span>Наведите камеру</span>
        </div>
      </div>
      <div class="footer__legal">
        Источник сведений — криминологические паспорта за 2026 год (формы 1-М, 1-АД, данные акимата,
        центра занятости населения и отдела образования). Координаты объектов на карте получены
        геокодированием по OpenStreetMap и носят ориентировочный характер.
      </div>
    </div>
  </footer>`;
}

/** Переключатель населённого пункта; при выборе меняет ?id= в адресе. */
function renderSwitch(activeId, onChange) {
  const html = `<div class="switch">${PASSPORTS.map((p) => `
      <button type="button" data-id="${p.id}" aria-pressed="${p.id === activeId}">${esc(p.name)}</button>
    `).join('')}</div>`;

  queueMicrotask(() => {
    document.querySelectorAll('.switch button').forEach((btn) => {
      btn.addEventListener('click', () => onChange(btn.dataset.id));
    });
  });
  return html;
}

function currentId() {
  const id = new URLSearchParams(location.search).get('id');
  if (!PASSPORTS.length) return id || '';
  return PASSPORTS.some((p) => p.id === id) ? id : PASSPORTS[0].id;
}

function getPassport(id) {
  return PASSPORTS.find((p) => p.id === id) || PASSPORTS[0] || null;
}
