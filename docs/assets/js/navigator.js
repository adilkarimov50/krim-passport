/* Прокурору для работы — навигатор по Закону № 245-VIII */
(function initNavigator() {
  'use strict';

  document.getElementById('chrome-top').innerHTML = renderTopbar('navigator');
  document.getElementById('chrome-bottom').innerHTML = renderFooter();

  const ORGS = window.NAVIGATOR_DATA || [];
  const QUARTER = window.QUARTERLY_NADZOR || { blocks: [] };
  const KEY = 'profilaktika-checks-v1';
  const KEY_Q = 'profilaktika-quarterly-v1';
  const LAW245 = 'https://adilet.zan.kz/rus/docs/Z2500000245';
  const TAG_LABELS = {
    силовой: 'Правоохранительные',
    социальный: 'Социальный блок',
    местный: 'Местный уровень',
  };

  let state = {};
  let stateQ = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
  try { stateQ = JSON.parse(localStorage.getItem(KEY_Q) || '{}'); } catch (e) { stateQ = {}; }

  const grid = document.getElementById('nav-grid');
  const sidebar = document.getElementById('nav-sidebar');
  const statusEl = document.getElementById('nav-status');
  const kpiEl = document.getElementById('nav-kpi');
  let activeTag = 'all';
  let query = '';

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function saveQ() {
    try { localStorage.setItem(KEY_Q, JSON.stringify(stateQ)); } catch (e) { /* ignore */ }
  }

  function navEsc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  /** Ссылки на статьи ЗРК № 245-VIII в ИПС «Әділет». */
  function linkifyLaw(text) {
    const safe = navEsc(text);
    return safe.replace(
      /(ст\.\s*\d+(?:\s*[-–]\s*\d+)?(?:\s*п\.?\s*\d+)?(?:\s*пп\.?\s*\d+)?(?:\s*ЗРК)?)/gi,
      (match) => {
        const num = match.match(/\d+/);
        const href = num ? `${LAW245}#z${num[0]}` : LAW245;
        return `<a class="nav-law" href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
      },
    );
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

  function renderKpi(totalChecks, totalDone) {
    const pct = totalChecks ? Math.round((totalDone / totalChecks) * 100) : 0;
    kpiEl.innerHTML = `
      <div class="nav-kpi__cell"><b>${ORGS.length}</b><span>Субъектов</span></div>
      <div class="nav-kpi__cell"><b>${totalChecks}</b><span>Пунктов проверки</span></div>
      <div class="nav-kpi__cell"><b>${totalDone}</b><span>Отмечено</span></div>
      <div class="nav-kpi__cell"><b>${pct}%</b><span>Прогресс</span></div>`;
    return { totalChecks, totalDone, pct };
  }

  function renderSidebar(items) {
    const qTotal = (QUARTER.blocks || []).reduce((a, b) => a + b.acts.length, 0);
    const qDone = Object.keys(stateQ).filter((k) => stateQ[k]).length;
    sidebar.innerHTML = `<a class="nav-sidebar__link nav-sidebar__link--quarter" href="#nav-quarterly-section">
        <span class="nav-sidebar__mini"><i style="width:${qTotal ? Math.round((qDone / qTotal) * 100) : 0}%"></i></span>
        <span>Ежеквартально<br><small style="font-weight:500;color:var(--muted)">${qDone}/${qTotal}</small></span>
      </a>`
      + `<div class="nav-sidebar__title">Субъекты ЗРК</div>`
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

    const openIds = new Set(
      [...grid.querySelectorAll('details.nav-org[open]')].map((el) => el.id.replace('card-', '')),
    );

    grid.innerHTML = items.map((d) => {
      const { done, total, pct } = orgProgress(d);
      const tagLabel = TAG_LABELS[d.tag] || d.tag;
      const lis = d.checks.map((c, i) => {
        const k = `${d.id}:${i}`;
        const on = !!state[k];
        return `<li class="${on ? 'done' : ''}">
          <input type="checkbox" id="chk-${k}" data-k="${k}"${on ? ' checked' : ''} aria-label="Отметить проверенным">
          <label class="txt" for="chk-${k}">${linkifyLaw(c[0])}<span class="src">${linkifyLaw(c[1])}</span></label>
        </li>`;
      }).join('');

      const isOpen = openIds.has(d.id);

      return `<details class="nav-org" id="card-${d.id}"${isOpen ? ' open' : ''}>
        <summary>
          <h3>${navEsc(d.org)} <span class="nav-tag nav-tag--${d.tag}">${navEsc(tagLabel)}</span></h3>
          <p class="nav-org__center">${navEsc(d.center)}</p>
          <p class="nav-org__acts">${navEsc(d.acts)}</p>
          <span class="nav-norm">${linkifyLaw(d.norm)}</span>
          <div class="nav-org__progress">Проверено ${done} из ${total}
            <div class="nav-org__track"><i style="width:${pct}%"></i></div>
          </div>
          <div class="nav-org__more">Открыть предмет проверки →</div>
        </summary>
        <div class="nav-org__body">
          <h4>Что делает ведомство</h4>
          <p>${linkifyLaw(d.task)}</p>
          <h4>Что проверять прокурору</h4>
          <ul class="nav-chk">${lis}</ul>
          <h4>Признаки нарушения</h4>
          <div class="nav-callout nav-callout--sig">${linkifyLaw(d.signals)}</div>
          <h4>Форма реагирования</h4>
          <div class="nav-callout nav-callout--react">${linkifyLaw(d.react)}</div>
          <h4>На что смотреть в первую очередь</h4>
          <div class="nav-callout nav-callout--gap">${linkifyLaw(d.gap)}</div>
        </div>
      </details>`;
    }).join('');
  }

  function quarterProgress(block) {
    const done = block.acts.filter((_, i) => stateQ[`${block.id}:${i}`]).length;
    return { done, total: block.acts.length, pct: block.acts.length ? Math.round((done / block.acts.length) * 100) : 0 };
  }

  function renderQuarterly() {
    const leadEl = document.getElementById('nav-quarterly-lead');
    const timingEl = document.getElementById('nav-quarterly-timing');
    const statusElQ = document.getElementById('nav-quarterly-status');
    const blocksEl = document.getElementById('nav-quarterly-blocks');
    if (!blocksEl || !(QUARTER.blocks || []).length) return;

    if (leadEl) leadEl.textContent = QUARTER.lead || '';

    const ordersEl = document.getElementById('nav-quarterly-orders');
    if (ordersEl && QUARTER.orders_index?.length) {
      ordersEl.innerHTML = `<h3 class="nav-quarterly__orders-title">Подзаконные акты (для ссылок в актах надзора)</h3><ul class="nav-orders-index">${
        QUARTER.orders_index.map((o) => `<li><strong>${navEsc(o.label)}</strong> — ${navEsc(o.about)}</li>`).join('')
      }</ul>`;
    }

    if (timingEl && QUARTER.timing?.length) {
      timingEl.innerHTML = QUARTER.timing.map(([q, period, note]) => `
        <div class="nav-qtime"><b>${navEsc(q)}</b><span>${navEsc(period)}</span><small>${navEsc(note)}</small></div>`).join('');
    }

    const openIds = new Set(
      [...blocksEl.querySelectorAll('details.nav-qblock[open]')].map((el) => el.id.replace('qblock-', '')),
    );

    const totalActs = QUARTER.blocks.reduce((a, b) => a + b.acts.length, 0);
    const doneActs = Object.keys(stateQ).filter((k) => stateQ[k]).length;
    if (statusElQ) {
      statusElQ.innerHTML = `<span>Ежеквартальный пакет: <b>${doneActs}</b> из ${totalActs} пунктов подготовлено</span>
        <div class="nav-status__bar"><i style="width:${totalActs ? Math.round((doneActs / totalActs) * 100) : 0}%"></i></div>`;
    }

    blocksEl.innerHTML = QUARTER.blocks.map((block) => {
      const { done, total, pct } = quarterProgress(block);
      const tagLabel = TAG_LABELS[block.tag] || block.tag;
      const actsHtml = block.acts.map((act, i) => {
        const k = `${block.id}:${i}`;
        const on = !!stateQ[k];
        return `<details class="nav-qact${on ? ' is-done' : ''}" id="qact-${k}">
          <summary>
            <input type="checkbox" class="nav-qact__chk" data-qk="${k}"${on ? ' checked' : ''} aria-label="Выполнено" onclick="event.stopPropagation()">
            <span class="nav-qact__title">${navEsc(act.title)}</span>
            <span class="nav-qact__norm">${linkifyLaw(act.norm)}</span>
          </summary>
          <div class="nav-qact__body">
            <div class="nav-qfield"><h5>Зачем прокурору</h5><p>${linkifyLaw(act.purpose)}</p></div>
            <div class="nav-qfield"><h5>Что запросить / проверить</h5><p>${linkifyLaw(act.request)}</p></div>
            <div class="nav-qfield"><h5>Как верифицировать</h5><p>${linkifyLaw(act.verify)}</p></div>
            ${(act.orders || []).length ? `<div class="nav-qfield nav-qfield--orders"><h5>Приказы / подзаконные акты</h5><ul>${act.orders.map((o) => `<li>${linkifyLaw(o)}</li>`).join('')}</ul></div>` : ''}
            <div class="nav-callout nav-callout--sig"><strong>Признак нарушения:</strong> ${linkifyLaw(act.signal)}</div>
            <div class="nav-callout nav-callout--react"><strong>На комиссию / реагирование:</strong> ${linkifyLaw(act.react)}</div>
          </div>
        </details>`;
      }).join('');

      return `<details class="nav-qblock" id="qblock-${block.id}"${openIds.has(block.id) || (!openIds.size && block.id === QUARTER.blocks[0]?.id) ? ' open' : ''}>
        <summary>
          <h3>${navEsc(block.title)} <span class="nav-tag nav-tag--${block.tag}">${navEsc(tagLabel)}</span></h3>
          <p class="nav-qblock__organs">${navEsc(block.organs)}</p>
          <div class="nav-org__progress">Подготовлено ${done} из ${total}
            <div class="nav-org__track"><i style="width:${pct}%"></i></div>
          </div>
        </summary>
        <div class="nav-qblock__body">
          <div class="nav-qfield nav-qfield--why"><h4>Зачем этот блок на МВК</h4><p>${linkifyLaw(block.why)}</p></div>
          <div class="nav-callout nav-callout--gap"><strong>Формулировка для повестки:</strong> ${linkifyLaw(block.commission)}</div>
          <h4>Акты надзора (ежеквартально)</h4>
          <div class="nav-qacts">${actsHtml}</div>
        </div>
      </details>`;
    }).join('');
  }

  function updateQuarterProgress() {
    renderQuarterly();
    const qTotal = (QUARTER.blocks || []).reduce((a, b) => a + b.acts.length, 0);
    const qDone = Object.keys(stateQ).filter((k) => stateQ[k]).length;
    const link = sidebar.querySelector('.nav-sidebar__link--quarter');
    if (link) {
      const mini = link.querySelector('.nav-sidebar__mini i');
      if (mini) mini.style.width = `${qTotal ? Math.round((qDone / qTotal) * 100) : 0}%`;
      const sm = link.querySelector('small');
      if (sm) sm.textContent = `${qDone}/${qTotal}`;
    }
  }

  function renderNavigator() {
    if (!ORGS.length) {
      grid.innerHTML = '<div class="nav-empty">Данные навигатора не загружены. Проверьте подключение файла navigator_data.js.</div>';
      kpiEl.innerHTML = '';
      statusEl.innerHTML = '';
      sidebar.innerHTML = '';
      return;
    }
    const items = filteredItems();
    const totalChecks = ORGS.reduce((a, d) => a + d.checks.length, 0);
    const totalDone = Object.keys(state).filter((k) => state[k]).length;
    const totals = renderKpi(totalChecks, totalDone);
    renderSidebar(items);
    renderStatus(items, totals);
    renderQuarterly();
    renderGrid(items);
  }

  function updateCardProgress(cardId) {
    const d = ORGS.find((o) => o.id === cardId);
    const card = document.getElementById(`card-${cardId}`);
    if (!d || !card) return;
    const { done, total, pct } = orgProgress(d);
    const prog = card.querySelector('.nav-org__progress');
    if (prog) {
      prog.innerHTML = `Проверено ${done} из ${total}
        <div class="nav-org__track"><i style="width:${pct}%"></i></div>`;
    }
    const link = sidebar.querySelector(`[data-jump="${cardId}"]`);
    if (link) {
      const mini = link.querySelector('.nav-sidebar__mini i');
      if (mini) mini.style.width = `${pct}%`;
      const sm = link.querySelector('small');
      if (sm) sm.textContent = `${done}/${total}`;
    }
    const totalChecks = ORGS.reduce((a, o) => a + o.checks.length, 0);
    const totalDone = Object.keys(state).filter((k) => state[k]).length;
    const totals = { totalChecks, totalDone, pct: totalChecks ? Math.round((totalDone / totalChecks) * 100) : 0 };
    renderKpi(totalChecks, totalDone);
    renderStatus(filteredItems(), totals);
  }

  document.getElementById('nav-quarterly-blocks')?.addEventListener('change', (e) => {
    const cb = e.target.closest('.nav-qact__chk');
    if (!cb) return;
    stateQ[cb.dataset.qk] = cb.checked;
    cb.closest('.nav-qact')?.classList.toggle('is-done', cb.checked);
    saveQ();
    updateQuarterProgress();
  });

  document.getElementById('nav-q-open-all')?.addEventListener('click', () => {
    document.querySelectorAll('details.nav-qblock, details.nav-qact').forEach((d) => { d.open = true; });
  });
  document.getElementById('nav-q-close-all')?.addEventListener('click', () => {
    document.querySelectorAll('details.nav-qblock, details.nav-qact').forEach((d) => { d.open = false; });
  });
  document.getElementById('nav-q-reset')?.addEventListener('click', () => {
    if (!confirm('Снять отметки ежеквартального пакета?')) return;
    stateQ = {};
    saveQ();
    updateQuarterProgress();
  });
  document.getElementById('nav-q-export')?.addEventListener('click', () => {
    const rows = [['Блок', 'Органы', 'Акт надзора', 'Норма', 'Приказы', 'Зачем', 'На комиссию', 'Отметка']];
    (QUARTER.blocks || []).forEach((block) => block.acts.forEach((act, i) => {
      rows.push([
        block.title, block.organs, act.title, act.norm,
        (act.orders || []).join('; '), act.purpose, act.react,
        stateQ[`${block.id}:${i}`] ? 'готово' : '',
      ]);
    }));
    const csv = `\uFEFF${rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'akt_nadzora_mvk_kvartal.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  grid.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type=checkbox]');
    if (!cb) return;
    state[cb.dataset.k] = cb.checked;
    cb.closest('li')?.classList.toggle('done', cb.checked);
    save();
    const cardId = cb.dataset.k.split(':')[0];
    updateCardProgress(cardId);
  });

  sidebar.addEventListener('click', (e) => {
    const link = e.target.closest('[data-jump]');
    if (!link) return;
    e.preventDefault();
    const id = link.dataset.jump;
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
    document.querySelectorAll('details.nav-org').forEach((d) => { d.open = true; });
  });
  document.getElementById('nav-close-all').addEventListener('click', () => {
    document.querySelectorAll('details.nav-org').forEach((d) => { d.open = false; });
  });
  document.getElementById('nav-reset').addEventListener('click', () => {
    if (!confirm('Снять все отметки о проверке?')) return;
    state = {};
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

  document.querySelectorAll('.nav-page-jump__link').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-page-jump__link').forEach((l) => l.classList.remove('is-active'));
      link.classList.add('is-active');
    });
  });

  if (location.hash === '#nav-quarterly-section' || location.hash === '#nav-quarterly') {
    setTimeout(() => {
      document.getElementById('nav-quarterly-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}());
