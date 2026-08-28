/* Титульная страница: выбор паспорта и сопоставление населённых пунктов. */

document.getElementById('chrome-top').innerHTML = renderTopbar('index');
document.getElementById('chrome-bottom').innerHTML = renderFooter();

const totalPop = PASSPORTS.reduce((sum, p) => sum + (p.summary.population || 0), 0);
const totalCrimes = PASSPORTS.reduce((sum, p) => sum + (p.summary.crimes.current || 0), 0);

document.getElementById('hero-count').textContent = `${PASSPORTS.length} ${PASSPORTS.length === 1 ? 'населённый пункт' : PASSPORTS.length < 5 ? 'населённых пункта' : 'населённых пунктов'}`;
document.getElementById('hero-pop').textContent = `${fmt(totalPop)} жителей`;
document.getElementById('hero-crimes').textContent = `${fmt(totalCrimes)} уголовных правонарушений`;

/* Карточки выбора паспорта */
document.getElementById('picker').innerHTML = PASSPORTS.map((p) => {
  const c = p.summary.crimes;
  return `
  <a class="pcard" href="passport.html?id=${p.id}">
    <div class="pcard__top">
      <div class="pcard__kicker">${esc(p.summary.district)}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.summary.description)}</p>
    </div>
    <div class="pcard__grid">
      <div class="pcard__cell">
        <b>${fmt(p.summary.population)}</b>
        <span>населения</span>
      </div>
      <div class="pcard__cell">
        <b>${fmt(c.current)}</b>
        <span>уголовных правонарушений ${deltaBadge(c.delta_pct ?? null)}</span>
      </div>
      <div class="pcard__cell">
        <b>${String(p.summary.rate_per_10k).replace('.', ',')}</b>
        <span>на 10 тыс. населения</span>
      </div>
    </div>
    <div class="pcard__foot"><span>Открыть паспорт</span><span class="arrow">→</span></div>
  </a>`;
}).join('');

/* Сравнительная таблица */
function adminTotal(p) {
  if (Array.isArray(p.admin_practice)) {
    return p.admin_practice.find((r) => r.indicator.startsWith('Всего'))?.count;
  }
  return p.admin_practice?.total;
}

function registryTotal(p) {
  if (!Array.isArray(p.registry)) return '—';
  return fmt(p.registry.reduce((sum, r) => sum + (r.count || 0), 0));
}

function crimeValue(p, name) {
  const row = p.crime_structure.find((r) => r.indicator === name);
  if (!row) return '—';
  if (row.current !== undefined) {
    return `${fmt(row.current)} <span style="color:var(--muted)">/ ${fmt(row.previous)}</span> ${deltaBadge(deltaFromPair(row))}`;
  }
  return fmt(row.value);
}

const COMPARE_ROWS = [
  ['Численность населения', (p) => fmt(p.summary.population), false],
  ['Уровень преступности на 10 тыс. населения', (p) => String(p.summary.rate_per_10k).replace('.', ','), false],
  ...['Всего зарегистрировано', 'Особо тяжкие', 'Тяжкие', 'Кражи', 'Мошенничества',
    'Семейно-бытовые преступления', 'Против половой неприкосновенности',
    'В состоянии алкогольного опьянения'].map((name) => [name, (p) => crimeValue(p, name), true]),
  ['Всего административных правонарушений', (p) => fmt(adminTotal(p)), false],
  ['Лиц на профилактическом учёте', registryTotal, false],
];

document.getElementById('compare').innerHTML = `
  <thead><tr><th>Показатель</th>${PASSPORTS.map((p) => `<th class="num">${esc(p.name)}</th>`).join('')}</tr></thead>
  <tbody>${COMPARE_ROWS.map(([label, render]) => `
    <tr>
      <td>${esc(label)}</td>
      ${PASSPORTS.map((p) => `<td class="num">${render(p)}</td>`).join('')}
    </tr>`).join('')}
  </tbody>`;

/* Точки концентрации по каждому паспорту */
document.getElementById('hotspots').innerHTML = PASSPORTS.map((p) => {
  const spots = [...p.hotspots].sort((a, b) => (b.count || 0) - (a.count || 0));
  return `
  <div class="card">
    <div class="card__title">${esc(p.name)}</div>
    ${spots.map((s, i) => `
      <div class="hotspot" style="padding:13px 0;border-bottom:${i < spots.length - 1 ? '1px dashed var(--line)' : '0'}">
        <div class="hotspot__rank">${i + 1}</div>
        <div class="hotspot__body">
          <h4>${esc(s.object)}</h4>
          <p>${esc(s.types)}</p>
        </div>
        <div class="hotspot__count">${fmt(s.count)}<span>фактов</span></div>
      </div>`).join('')}
  </div>`;
}).join('');
