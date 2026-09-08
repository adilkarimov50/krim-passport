/* Познавательный сборник — наука, профилактика, связь с данными */
(function initLibrary() {
  'use strict';

  document.getElementById('chrome-top').innerHTML = renderTopbar('library');
  document.getElementById('chrome-bottom').innerHTML = renderFooter();

  const DATA = window.LIBRARY_DATA || { items: [], applications: [], formula: [] };
  const TYPE_LABELS = {
    video: 'Ролик',
    book: 'Книга',
    quote: 'Цитата',
  };
  const TYPE_ICONS = {
    video: '▶',
    book: '📘',
    quote: '❝',
  };

  let activeType = 'all';
  let query = '';

  const grid = document.getElementById('lib-grid');
  const apps = document.getElementById('lib-apps');
  const statusEl = document.getElementById('lib-status');

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  function filteredItems() {
    const q = query.trim().toLowerCase();
    return (DATA.items || []).filter((item) => {
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (!q) return true;
      const hay = [item.title, item.author, item.summary, item.influence, ...(item.tags || [])]
        .join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function renderStatus(items) {
    statusEl.innerHTML = `Материалов: <b>${items.length}</b> из ${(DATA.items || []).length}`;
  }

  function renderGrid(items) {
    if (!items.length) {
      grid.innerHTML = '<div class="lib-empty">Ничего не найдено. Измените поиск или фильтр.</div>';
      return;
    }
    grid.innerHTML = items.map((item) => {
      const typeLabel = TYPE_LABELS[item.type] || item.type;
      const icon = TYPE_ICONS[item.type] || '•';
      const meta = [item.author, item.year, item.duration].filter(Boolean).join(' · ');
      const link = item.url
        ? `<a class="lib-card__link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Открыть источник →</a>`
        : '';
      const dataLink = item.data_link
        ? `<a class="lib-card__data" href="${esc(item.data_link.href)}">${esc(item.data_link.label)} →</a>`
        : '';
      const tags = (item.tags || []).map((t) => `<span class="lib-tag">${esc(t)}</span>`).join('');
      return `<article class="lib-card lib-card--${item.type}">
        <div class="lib-card__type"><span>${icon}</span> ${esc(typeLabel)}</div>
        <h3>${esc(item.title)}</h3>
        <p class="lib-card__meta">${esc(meta)}</p>
        <div class="lib-card__tags">${tags}</div>
        <p class="lib-card__summary">${esc(item.summary)}</p>
        <div class="lib-card__influence">
          <strong>Как влияет на нашу работу</strong>
          <p>${esc(item.influence)}</p>
        </div>
        <div class="lib-card__foot">${link}${dataLink}</div>
      </article>`;
    }).join('');
  }

  function renderApplications() {
    apps.innerHTML = (DATA.applications || []).map((row) => `
      <article class="lib-app">
        <div class="lib-app__theory">${esc(row.theory)}</div>
        <h4>${esc(row.signal)}</h4>
        <p class="lib-app__data"><b>Наши данные:</b> ${esc(row.data)}</p>
        <p class="lib-app__why"><b>Почему:</b> ${esc(row.why)}</p>
        <p class="lib-app__check"><b>Что проверять:</b> ${esc(row.check)}</p>
        <a class="lib-app__link" href="${esc(row.href)}">Перейти к данным →</a>
      </article>`).join('');
  }

  function renderFormula() {
    const el = document.getElementById('lib-formula');
    if (!el) return;
    el.innerHTML = (DATA.formula || []).map((step, i) => `
      <div class="lib-formula__step">
        <span class="lib-formula__n">${i + 1}</span>
        <span>${esc(step)}</span>
      </div>`).join('');
  }

  function renderAll() {
    const items = filteredItems();
    renderStatus(items);
    renderGrid(items);
    renderApplications();
    renderFormula();
  }

  document.getElementById('lib-q').addEventListener('input', (e) => {
    query = e.target.value;
    renderAll();
  });

  document.querySelectorAll('#lib-filters .lib-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lib-filters .lib-filter').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      activeType = btn.dataset.type;
      renderAll();
    });
  });

  renderAll();
}());
