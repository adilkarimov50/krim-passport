/* Механизмы профилактики — навигатор прокурора (Закон № 245-VIII) */

document.getElementById('chrome-top').innerHTML = renderTopbar('navigator');
document.getElementById('chrome-bottom').innerHTML = renderFooter();

const ORGS = window.NAVIGATOR_DATA || [];
const KEY = 'profilaktika-checks-v1';
const TAG_LABELS = {
  силовой: 'Правоохранительные',
  социальный: 'Социальный блок',
  местный: 'Местный уровень',
};

let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

const openCards = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function navEsc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

function orgProgress(d) {
  const done = d.checks.filter((c, i) => state[`${d.id}:${i}`]).length;
  const total = d.checks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

function filteredItems() {
  const q = query.trim().toLowerCase();
  return ORGS.filter((d) => {
    if (activeTag !== 'all' && d.tag !== activeTag) return false;
    if (!q) return true;
    const hay = [d.org, d.center, d.acts, d.norm, d.task, d.signals, d.react, d.gap]
      .concat(d.checks.map((c) => `${c[0]} ${c[1]}`)).join(' ').toLowerCase();
    return hay.includes(q);
  });
}

const grid = document.getElementById('nav-grid');
const sidebar = document.getElementById('nav-sidebar');
const statusEl = document.getElementById('nav-status');
const kpiEl = document.getElementById('nav-kpi');
let activeTag = 'all';
let query = '';

function renderKpi() {
  const totalChecks = ORGS.reduce((a, d) => a + d.checks.length, 0);
  const totalDone = Object.keys(state).filter((k) => state[k]).length;
  const pct = totalChecks ? Math.round((totalDone / totalChecks) * 100) : 0;
  kpiEl.innerHTML = `
    <div class="nav-kpi__cell"><b>${ORGS.length}</b><span>Субъектов</span></div>
    <div class="nav-kpi__cell"><b>${totalChecks}</b><span>Пунктов проверки</span></div>
    <div class="nav-kpi__cell"><b>${totalDone}</b><span>Отмечено</span></div>
    <div class="nav-kpi__cell"><b>${pct}%</b><span>Прогресс</span></div>`;
  return { totalChecks, totalDone, pct };
}

function renderSidebar(items) {
  sidebar.innerHTML = `<div class="nav-sidebar__title">Быстрый переход</div>`
    + items.map((d) => {
      const { done, total, pct } = orgProgress(d);
      const short = d.org.replace(/^Органы?\s+/i, '').replace(/^УТК\s+/i, '');
      return `<a class="nav-sidebar__link" href="#card-${d.id}" data-jump="${d.id}">
        <span class="nav-sidebar__mini"><i style="width:${pct}%"></i></span>
        <span>${navEsc(short.length > 28 ? `${short.slice(0, 26)}…` : short)}<br>
        <small style="font-weight:500;color:var(--muted)">${done}/${total}</small></span>
      </a>`;
    }).join('');
}

function renderStatus(items, totals) {
  statusEl.innerHTML = `
    <span>Показано <b>${items.length}</b> из ${ORGS.length} органов · отмечено <b>${totals.totalDone}</b> из ${totals.totalChecks}</span>
    <div class="nav-status__bar" title="Общий прогресс проверки">
      <i style="width:${totals.pct}%"></i>
    </div>`;
}

function renderGrid(items) {
  if (!items.length) {
    grid.innerHTML = '<div class="nav-empty">Ничего не найдено. Измените поиск или фильтр.</div>';
    return;
  }

  grid.innerHTML = items.map((d) => {
    const { done, total, pct } = orgProgress(d);
    const tagLabel = TAG_LABELS[d.tag] || d.tag;
    const lis = d.checks.map((c, i) => {
      const k = `${d.id}:${i}`;
      const on = !!state[k];
      return `<li class="${on ? 'done' : ''}">
        <input type="checkbox" id="chk-${k}" data-k="${k}"${on ? ' checked' : ''} aria-label="Отметить проверенным">
        <label class="txt" for="chk-${k}">${navEsc(c[0])}<span class="src">${navEsc(c[1])}</span></label>
      </li>`;
    }).join('');

    const isOpen = openCards.has(d.id);

    return `<details class="nav-org" id="card-${d.id}"${isOpen ? ' open' : ''}>
      <summary>
        <div class="nav-org__head">
          <h3>${navEsc(d.org)}
            <span class="nav-tag nav-tag--${d.tag}">${navEsc(tagLabel)}</span>
          </h3>
          <p class="nav-org__center">${navEsc(d.center)}</p>
          <p class="nav-org__acts">${navEsc(d.acts)}</p>
          <div class="nav-org__meta"><span class="nav-norm">${navEsc(d.norm)}</span></div>
        </div>
        <div class="nav-org__aside">
          <div class="nav-org__pct">${pct}<span>%</span></div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${done} / ${total}</div>
          <div class="nav-org__chev" aria-hidden="true">▾</div>
        </div>
      </summary>
      <div class="nav-org__body">
        <h4>Что делает ведомство</h4>
        <p>${navEsc(d.task)}</p>
        <h4>Что проверять прокурору</h4>
        <ul class="nav-chk">${lis}</ul>
        <h4>Признаки нарушения</h4>
        <div class="nav-callout nav-callout--sig">${navEsc(d.signals)}</div>
        <h4>Форма реагирования</h4>
        <div class="nav-callout nav-callout--react">${navEsc(d.react)}</div>
        <h4>На что смотреть в первую очередь</h4>
        <div class="nav-callout nav-callout--gap">${navEsc(d.gap)}</div>
      </div>
    </details>`;
  }).join('');
}

function renderNavigator() {
  if (!ORGS.length) {
    grid.innerHTML = '<div class="nav-empty">Данные навигатора не загружены.</div>';
    return;
  }
  const items = filteredItems();
  const totals = renderKpi();
  renderSidebar(items);
  renderStatus(items, totals);
  renderGrid(items);
}

grid.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type=checkbox]');
  if (!cb) return;
  const card = cb.closest('details');
  if (card) openCards.add(card.id.replace('card-', ''));
  state[cb.dataset.k] = cb.checked;
  save();
  renderNavigator();
});

grid.addEventListener('toggle', (e) => {
  const det = e.target.closest('details.nav-org');
  if (!det) return;
  const id = det.id.replace('card-', '');
  if (det.open) openCards.add(id);
  else openCards.delete(id);
}, true);

sidebar.addEventListener('click', (e) => {
  const link = e.target.closest('[data-jump]');
  if (!link) return;
  e.preventDefault();
  const id = link.dataset.jump;
  openCards.add(id);
  const el = document.getElementById(`card-${id}`);
  if (el) {
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sidebar.querySelectorAll('.nav-sidebar__link').forEach((a) => a.classList.remove('is-active'));
    link.classList.add('is-active');
  }
});

document.getElementById('nav-q').addEventListener('input', (e) => {
  query = e.target.value;
  renderNavigator();
});

document.querySelectorAll('#nav-filters .nav-filter').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#nav-filters .nav-filter').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    activeTag = b.dataset.tag;
    renderNavigator();
  });
});

document.getElementById('nav-open-all').addEventListener('click', () => {
  filteredItems().forEach((d) => openCards.add(d.id));
  document.querySelectorAll('details.nav-org').forEach((d) => { d.open = true; });
});
document.getElementById('nav-close-all').addEventListener('click', () => {
  openCards.clear();
  document.querySelectorAll('details.nav-org').forEach((d) => { d.open = false; });
});
document.getElementById('nav-reset').addEventListener('click', () => {
  if (!confirm('Снять все отметки о проверке?')) return;
  state = {};
  openCards.clear();
  save();
  renderNavigator();
});
document.getElementById('nav-export').addEventListener('click', () => {
  const rows = [['Орган', 'Головное ведомство', 'Норма', 'Предмет проверки', 'Основание', 'Отметка']];
  ORGS.forEach((d) => d.checks.forEach((c, i) => {
    rows.push([d.org, d.center, d.norm, c[0], c[1], state[`${d.id}:${i}`] ? 'проверено' : '']);
  }));
  const csv = `\uFEFF${rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'predmet_nadzora_profilaktika.csv';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('nav-print').addEventListener('click', () => {
  document.querySelectorAll('details.nav-org').forEach((d) => { d.open = true; });
  window.print();
});

renderNavigator();
