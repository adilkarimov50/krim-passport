/* Паспорт района/города области. */

mountSiteChrome('district');

function districtId() {
  return new URLSearchParams(location.search).get('id') || (window.DISTRICT_PASSPORTS_INDEX?.units?.[0]?.id) || 'karasai';
}

async function loadDistrict(id) {
  const base = 'assets/data/district_passports/';
  const res = await fetch(`${base}${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`Нет данных района ${id}`);
  return res.json();
}

function renderCards(cards) {
  return `<div class="grid grid--3">${(cards || []).map((c) => {
    const tone = c.tone === 'danger' ? 'color:var(--down)' : c.tone === 'warn' ? 'color:var(--warn,#b8860b)' : '';
    return `<div class="card">
      <div class="card__title">${esc(c.label)}</div>
      <b style="font-size:22px;${tone}">${esc(String(c.value))}</b>
      ${c.note ? `<p style="margin:8px 0 0;font-size:13px;color:var(--muted)">${esc(c.note)}</p>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function renderSection(sec) {
  let body = (sec.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('');
  if (sec.table && sec.table.length && sec.id === 'crime') {
    body += `<table class="tbl"><thead><tr><th>Населённый пункт</th><th class="num">Текущий</th><th class="num">АППГ</th><th class="num">На 10 тыс.</th></tr></thead><tbody>
      ${sec.table.map((r) => `<tr><td>${esc(r.locality)}</td><td class="num">${fmt(r.current)}</td><td class="num">${fmt(r.previous)}</td><td class="num">${r.rate_per_10k ?? '—'}</td></tr>`).join('')}
    </tbody></table>`;
  }
  if (sec.table && sec.id === 'socio') {
    body += `<table class="tbl"><thead><tr><th>Категория ЦКС</th><th class="num">Лиц</th></tr></thead><tbody>
      ${sec.table.map((row) => {
        const [label, , persons] = row;
        return `<tr><td>${esc(label)}</td><td class="num">${fmt(persons)}</td></tr>`;
      }).join('')}
    </tbody></table>`;
  }
  return `<section class="section" id="${esc(sec.id)}">
    <h2>${esc(sec.title)}</h2>
    ${body}
  </section>`;
}

function renderDistrictPicker() {
  const units = window.DISTRICT_PASSPORTS_INDEX?.units || [];
  document.getElementById('d-title').textContent = 'Районы и города области';
  document.getElementById('d-lead').textContent = 'Выберите административную единицу для обобщённого кримпаспорта.';
  document.getElementById('d-sections').innerHTML = `<div class="grid grid--3">${units.map((u) => `
    <a class="card link-card" href="district.html?id=${esc(u.id)}" style="text-decoration:none;color:inherit">
      <strong>${esc(u.title)}</strong>
      <span class="muted">Кримпаспорт · ЦКС</span>
    </a>`).join('')}</div>`;
  document.getElementById('d-toc').innerHTML = '';
}

async function main() {
  const qid = new URLSearchParams(location.search).get('id');
  if (!qid) {
    mountSiteChrome('district');
    renderDistrictPicker();
    return;
  }
  const id = districtId();
  document.body.dataset.siteId = id;
  mountSiteChrome('district', id);

  let data;
  try {
    data = await loadDistrict(id);
  } catch (e) {
    document.getElementById('d-sections').innerHTML = `<div class="card"><p>${esc(e.message)}</p><p><a href="index.html">Обзор</a></p></div>`;
    return;
  }

  document.title = `${data.title} · кримпаспорт · 2026`;
  document.getElementById('d-title').textContent = data.title;
  document.getElementById('d-lead').textContent = `Обобщённый криминологический паспорт административной единицы. Детализация по населённым пунктам — в ЦКС и полных паспортах НП.`;

  const chips = [
    `<a class="chip chip--gold" href="${data.links.cks}">ЦКС района</a>`,
    `<a class="chip" href="index.html">Обзор области</a>`,
  ];
  document.getElementById('d-chips').innerHTML = chips.join('');

  const toc = document.getElementById('d-toc');
  toc.innerHTML = (data.sections || []).map((s) => `<a href="#${s.id}">${esc(s.title)}</a>`).join('');

  let html = renderCards(data.cards);
  html += (data.sections || []).map(renderSection).join('');

  if (data.locality_links?.length) {
    html += `<section class="section" id="localities"><h2>Населённые пункты с паспортами на сайте</h2><ul>
      ${data.locality_links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.name)}</a> ${l.full_passport ? '' : '(профиль)'}</li>`).join('')}
    </ul></section>`;
  }

  if (data.settlements_preview?.length) {
    html += `<section class="section" id="settlements"><h2>Населённые пункты и округа (ЦКС)</h2>
      <p class="note">Первые ${data.settlements_preview.length} по числу лиц. Полный список — в дашборде ЦКС.</p>
      <table class="tbl"><thead><tr><th>Округ</th><th>НП</th><th class="num">Лиц</th><th></th></tr></thead><tbody>
      ${data.settlements_preview.map((s) => `<tr>
        <td>${esc(s.okrug || '—')}</td>
        <td>${esc(s.settlement || '—')}</td>
        <td class="num">${fmt(s.persons)}</td>
        <td><a href="${esc(s.cks_href)}">ЦКС</a></td>
      </tr>`).join('')}
      </tbody></table></section>`;
  }

  document.getElementById('d-sections').innerHTML = html;

  if (typeof renderProkurorRecommendations === 'function') {
    renderProkurorRecommendations('prokuror-rec-district', {
      level: 'district',
      id: data.id,
      data: data.metrics_for_recommendations || {},
      title: data.title,
    });
  }
  if (typeof mountRiskExportButton === 'function') {
    mountRiskExportButton('risk-export-district-wrap', { level: 'district', id: data.id });
  }

  toc.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      scrollToElement(document.querySelector(a.getAttribute('href')), 'smooth');
    });
  });
}

main();
