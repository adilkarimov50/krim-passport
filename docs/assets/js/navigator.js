/* Навigator Закона «О профилактике правонарушений» № 245-VIII */

document.getElementById('chrome-top').innerHTML = renderTopbar('navigator');
document.getElementById('chrome-bottom').innerHTML = renderFooter();

const DATA = window.NAVIGATOR_DATA || [];
const KEY = 'profilaktika-checks-v1';
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const grid = document.getElementById('nav-grid');
const counter = document.getElementById('nav-counter');
let activeTag = 'all';
let query = '';

function navEsc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderNavigator() {
  if (!DATA.length) {
    grid.innerHTML = '<p class="card" style="padding:20px">Данные навигатора не загружены.</p>';
    return;
  }

  const q = query.trim().toLowerCase();
  const items = DATA.filter((d) => {
    if (activeTag !== 'all' && d.tag !== activeTag) return false;
    if (!q) return true;
    const hay = [d.org, d.center, d.acts, d.norm, d.task, d.signals, d.react, d.gap]
      .concat(d.checks.map((c) => `${c[0]} ${c[1]}`)).join(' ').toLowerCase();
    return hay.includes(q);
  });

  grid.innerHTML = items.map((d) => {
    const done = d.checks.filter((c, i) => state[`${d.id}:${i}`]).length;
    const pct = d.checks.length ? Math.round((done / d.checks.length) * 100) : 0;
    const lis = d.checks.map((c, i) => {
      const k = `${d.id}:${i}`;
      const on = !!state[k];
      return `<li class="${on ? 'done' : ''}">`
        + `<input type="checkbox" data-k="${k}"${on ? ' checked' : ''} aria-label="Отметить проверенным">`
        + `<span class="txt">${navEsc(c[0])}<span class="src">${navEsc(c[1])}</span></span></li>`;
    }).join('');

    return `<details class="org" id="card-${d.id}">`
      + '<summary>'
      + `<h3>${navEsc(d.org)}</h3>`
      + `<p class="center">${navEsc(d.center)}</p>`
      + `<p class="acts">${navEsc(d.acts)}</p>`
      + `<span class="norm">${navEsc(d.norm)}</span>`
      + `<div class="progress">Проверено ${done} из ${d.checks.length}`
      + `<div class="track"><div class="fill" style="width:${pct}%"></div></div></div>`
      + '<div class="more">Открыть предмет проверки</div>'
      + '</summary>'
      + '<div class="body">'
      + `<h4>Что делает ведомство</h4><p>${navEsc(d.task)}</p>`
      + `<h4>Что проверять прокурору</h4><ul class="chk">${lis}</ul>`
      + `<h4>Признаки нарушения</h4><div class="sig">${navEsc(d.signals)}</div>`
      + `<h4>Форма реагирования</h4><div class="react">${navEsc(d.react)}</div>`
      + `<h4>На что смотреть в первую очередь</h4><div class="gap">${navEsc(d.gap)}</div>`
      + '</div>'
      + '</details>';
  }).join('');

  const totalChecks = DATA.reduce((a, d) => a + d.checks.length, 0);
  const totalDone = Object.keys(state).filter((k) => state[k]).length;
  counter.innerHTML = `Показано органов: <b>${items.length}</b> из ${DATA.length}. `
    + `Отмечено пунктов проверки: <b>${totalDone}</b> из ${totalChecks}.`;
}

grid.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type=checkbox]');
  if (!cb) return;
  const card = cb.closest('details');
  const wasOpen = card && card.open;
  state[cb.dataset.k] = cb.checked;
  save();
  renderNavigator();
  if (wasOpen) {
    const el = document.getElementById(card.id);
    if (el) el.open = true;
  }
});

document.getElementById('nav-q').addEventListener('input', (e) => {
  query = e.target.value;
  renderNavigator();
});

document.querySelectorAll('#nav-filters button.f').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#nav-filters button.f').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    activeTag = b.dataset.tag;
    renderNavigator();
  });
});

document.getElementById('nav-open-all').addEventListener('click', () => {
  document.querySelectorAll('details.org').forEach((d) => { d.open = true; });
});
document.getElementById('nav-close-all').addEventListener('click', () => {
  document.querySelectorAll('details.org').forEach((d) => { d.open = false; });
});
document.getElementById('nav-reset').addEventListener('click', () => {
  if (!confirm('Снять все отметки о проверке?')) return;
  state = {};
  save();
  renderNavigator();
});
document.getElementById('nav-export').addEventListener('click', () => {
  const rows = [['Орган', 'Головное ведомство', 'Норма', 'Предмет проверки', 'Основание', 'Отметка']];
  DATA.forEach((d) => d.checks.forEach((c, i) => {
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
  document.querySelectorAll('details.org').forEach((d) => { d.open = true; });
  window.print();
});

renderNavigator();
