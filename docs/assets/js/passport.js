/* Страница паспорта: 18 разделов, навигация со слежением за прокруткой. */

let active = currentId();

/* ---------- Конструкторы блоков ---------- */

function kpiCard(value, label, note = '', badge = '') {
  return `
    <div class="card kpi">
      <b>${value} ${badge}</b>
      <span>${esc(label)}</span>
      ${note ? `<div class="note">${esc(note)}</div>` : ''}
    </div>`;
}

function statRows(rows, keyField, valueField) {
  return rows.map((row) => `
    <div class="stat-row">
      <span class="stat-row__label">${esc(row[keyField])}</span>
      <span class="stat-row__value">${esc(row[valueField]) || '—'}</span>
    </div>`).join('');
}

function dynamicsCards(rows) {
  return rows.map((row) => {
    if (row.current === undefined || row.current === null) {
      return `<div class="card">
          <div class="card__title">${esc(row.indicator)}</div>
          <p style="margin:0;color:var(--muted);font-size:14.5px">${esc(row.raw)}</p>
        </div>`;
    }
    const prev = row.previous !== undefined && row.previous !== null
      ? `АППГ — ${fmt(row.previous)}` : '';
    return kpiCard(fmt(row.current), row.indicator, prev, deltaBadge(deltaFromPair(row)));
  }).join('');
}

function measuresBlock(measures) {
  const fields = [
    ['object', 'Объект'],
    ['executors', 'Исполнители'],
    ['term', 'Срок'],
    ['criterion', 'Критерий оценки'],
  ];
  return measures.map((m) => `
    <article class="measure" open-state="0">
      <button class="measure__btn" type="button">
        <span class="measure__no">${m.number}</span>
        <span class="measure__ttl">${esc(m.title)}</span>
        <span class="measure__caret">▾</span>
      </button>
      <div class="measure__body">
        <dl style="margin:0">
          ${fields.filter(([key]) => m[key]).map(([key, label]) => `
            <div class="measure__row"><dt>${label}</dt><dd>${esc(m[key])}</dd></div>`).join('')}
        </dl>
        ${m.rationale ? `<div class="measure__why"><b>Основание:</b> ${esc(m.rationale)}</div>` : ''}
      </div>
    </article>`).join('');
}

/* ---------- Разделы ---------- */

function buildSectionsChundzha(p) {
  const s = p.summary;
  const timeTotal = p.time_of_day.reduce((sum, r) => sum + (r.count || 0), 0);
  const nightShare = p.time_of_day
    .filter((r) => /Ночное|Вечернее/i.test(r.period))
    .reduce((sum, r) => sum + (r.count || 0), 0);

  return [
    {
      title: 'Общая характеристика',
      lead: 'Базовые сведения о населённом пункте и уровне зарегистрированной преступности.',
      html: `
        <div class="grid grid--4">
          ${kpiCard(fmt(s.population), 'Численность населения')}
          ${kpiCard(fmt(s.crimes.current), 'Зарегистрировано уголовных правонарушений',
            `АППГ — ${fmt(s.crimes.previous)}`, deltaBadge(s.crimes.delta_pct ?? null))}
          ${kpiCard(String(s.rate_per_10k).replace('.', ','), 'Уровень преступности на 10 тыс. населения')}
          ${kpiCard(fmt(p.admin_practice?.total || 0), 'Административных правонарушений', p.admin_practice?.period || '')}
        </div>
        <div class="callout" style="margin-top:16px"><p>${esc(s.description)}</p></div>`,
    },
    {
      title: 'Криминологическая характеристика',
      lead: 'Обобщённая оценка криминогенной обстановки на территории.',
      html: `<div class="callout"><p>${esc(p.characteristic)}</p></div>`,
    },
    {
      title: 'Структура преступности',
      lead: 'Распределение по видам уголовных правонарушений за отчётный период.',
      html: `<div class="card">${simpleBars(
        p.crime_structure.filter((r) => r.indicator !== 'ВСЕГО').map((r) => ({
          label: r.indicator,
          value: Number(String(r.value).replace(/\s/g, '')) || 0,
        })),
      )}</div>`,
    },
    {
      title: 'Тяжесть преступлений',
      lead: 'Сопоставление с аналогичным периодом прошлого года по категориям тяжести.',
      html: `<div class="card">${statRows(p.crime_severity, 'category', 'current')}</div>`,
    },
    {
      title: 'Портрет лица, совершившего преступление',
      lead: 'Характеристика установленных лиц, определяющая адресность профилактической работы.',
      html: `<div class="card">${statRows(p.offender_profile, 'indicator', 'value')}</div>`,
    },
    {
      title: 'Портрет потерпевшего',
      lead: 'Категории граждан, наиболее подверженные риску стать потерпевшими.',
      html: `<div class="grid grid--3">${p.victim_profile.slice(0, 9).map((r) => kpiCard(esc(r.value), r.indicator)).join('')}</div>`,
    },
    {
      title: 'Время и место совершения',
      lead: `Распределение по времени суток и объекты концентрации преступности. На вечернее и ночное время приходится ${pct((nightShare / (timeTotal || 1)) * 100)} фактов.`,
      html: `
        <div class="grid grid--2">
          <div class="card">
            <div class="card__title">Время суток</div>
            ${donutChart(p.time_of_day.map((r) => ({ label: r.period, value: r.count })))}
          </div>
          <div class="card">
            <div class="card__title">Точки концентрации преступности</div>
            ${[...p.hotspots].sort((a, b) => b.count - a.count).map((h, i, arr) => `
              <div class="hotspot" style="padding:13px 0;border-bottom:${i < arr.length - 1 ? '1px dashed var(--line)' : '0'}">
                <div class="hotspot__rank">${i + 1}</div>
                <div class="hotspot__body">
                  <h4>${esc(h.object)}</h4>
                  <p>${esc(h.types)}</p>
                  ${h.measures ? `<p style="font-size:12.5px;color:var(--muted);margin-top:4px">${esc(h.measures)}</p>` : ''}
                </div>
                <div class="hotspot__count">${fmt(h.count)}<span>фактов</span></div>
              </div>`).join('')}
            <p style="margin:16px 0 0;display:flex;gap:10px;flex-wrap:wrap">
              <a class="tag" href="map.html?id=${p.id}" style="padding:9px 15px;text-decoration:none;font-size:13.5px">
                Карта объектов →</a>
              ${{ chundzha: 'chundzha_map.html', kaskelen: 'kaskelen_map.html', irgeli: 'irgeli_map.html' }[p.id]
                ? `<a class="tag" href="${{ chundzha: 'chundzha_map.html', kaskelen: 'kaskelen_map.html', irgeli: 'irgeli_map.html' }[p.id]}" style="padding:9px 15px;text-decoration:none;font-size:13.5px;background:var(--up);color:#fff">
                Детальная карта + маршруты патрулирования →</a>` : ''}
            </p>
          </div>
        </div>`,
    },
    {
      title: 'Основные криминогенные факторы',
      lead: 'Факторы с количественным подтверждением по данным паспорта.',
      html: `<div class="grid grid--2">${p.factors.map((f) => `
        <div class="card">
          <div class="card__title">${esc(f.factor)} <span class="tag">${esc(f.risk)}</span></div>
          <p style="margin:0;color:var(--muted);font-size:14.5px">${esc(f.details) || '—'}</p>
        </div>`).join('')}</div>`,
    },
    {
      title: 'Причины и условия',
      lead: 'Группировка причин и условий, способствующих совершению правонарушений.',
      html: `<div class="grid grid--3">${p.causes.map((c) => `
        <div class="card">
          <div class="card__title">${esc(c.type)}</div>
          <p style="margin:0 0 12px;font-size:14.5px">${esc(c.details)}</p>
          ${c.examples ? `<div class="measure__why" style="margin:0">${esc(c.examples)}</div>` : ''}
        </div>`).join('')}</div>`,
    },
    {
      title: 'Криминогенные объекты',
      lead: 'Объекты и участки, требующие профилактического контроля.',
      html: `<div class="card">${statRows(p.criminogenic_objects, 'object', 'details')}</div>`,
    },
    {
      title: 'Административная практика',
      lead: `Форма 1-АД. За период ${esc(p.admin_practice.period)} зарегистрировано ${fmt(p.admin_practice.total)} административных правонарушений.`,
      html: `<div class="card">${simpleBars(p.admin_practice.top_articles.map((r) => ({
        label: `${r.article} — ${r.title}`,
        value: Number(String(r.count).replace(/\s/g, '')) || 0,
      })))}</div>`,
    },
    {
      title: 'Приоритетные профилактические мероприятия',
      lead: 'Мероприятия по конкретным местам, времени, способам совершения преступлений и категориям потерпевших.',
      html: measuresBlock(p.measures),
    },
    {
      title: 'Ожидаемые результаты',
      lead: 'Результаты, ожидаемые от реализации приоритетных мероприятий.',
      html: `<div class="card"><ul class="list-check">${p.expected_results
        .filter((t) => !/перечень использованных/i.test(t))
        .map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul></div>`,
    },
  ];
}

function buildSections(p) {
  if (p.id === 'chundzha') return buildSectionsChundzha(p);
  const s = p.summary;
  const admTotal = p.admin_practice.find((r) => r.indicator.startsWith('Всего'));
  const admRest = p.admin_practice.filter((r) => !r.indicator.startsWith('Всего'));
  const registryTotal = p.registry.reduce((sum, r) => sum + (r.count || 0), 0);
  const timeTotal = p.time_of_day.reduce((sum, r) => sum + (r.count || 0), 0);
  const nightShare = p.time_of_day
    .filter((r) => /Ночное|Вечернее/i.test(r.period))
    .reduce((sum, r) => sum + (r.count || 0), 0);

  return [
    {
      title: 'Общая характеристика',
      lead: 'Базовые сведения о населённом пункте и уровне зарегистрированной преступности.',
      html: `
        <div class="grid grid--4">
          ${kpiCard(fmt(s.population), 'Численность населения')}
          ${kpiCard(fmt(s.crimes.current), 'Зарегистрировано уголовных правонарушений',
            `АППГ — ${fmt(s.crimes.previous)}`, deltaBadge(s.crimes.delta_pct ?? null))}
          ${kpiCard(String(s.rate_per_10k).replace('.', ','), 'Уровень преступности на 10 тыс. населения')}
          ${kpiCard(fmt(registryTotal), 'Лиц на профилактическом учёте')}
        </div>
        <div class="callout" style="margin-top:16px"><p>${esc(s.description)}</p></div>`,
    },
    {
      title: 'Социально-экономические показатели',
      lead: 'Сведения акимата, центра занятости населения и отдела образования, используемые для оценки криминогенного фона.',
      html: `<div class="card">${statRows(p.socio, 'indicator', 'value')}</div>`,
    },
    {
      title: 'Криминологическая характеристика',
      lead: 'Обобщённая оценка криминогенной обстановки на территории.',
      html: `<div class="callout"><p>${esc(p.characteristic)}</p></div>`,
    },
    {
      title: 'Структура преступности',
      lead: 'Сопоставление с аналогичным периодом прошлого года по основным видам уголовных правонарушений.',
      html: `<div class="card">${barsChart(p.crime_structure)}</div>`,
    },
    {
      title: 'Портрет лица, совершившего преступление',
      lead: 'Характеристика установленных лиц, определяющая адресность профилактической работы.',
      html: `<div class="card">${statRows(p.offender_profile, 'indicator', 'value')}</div>`,
    },
    {
      title: 'Портрет потерпевшего',
      lead: 'Категории граждан, наиболее подверженные риску стать потерпевшими.',
      html: `<div class="grid grid--3">
        ${p.victim_profile.map((r) => kpiCard(esc(r.value), r.indicator)).join('')}
      </div>`,
    },
    {
      title: 'Время и место совершения',
      lead: `Распределение по времени суток и объекты концентрации преступности. На вечернее и ночное время приходится ${pct((nightShare / (timeTotal || 1)) * 100)} фактов, распределённых по времени суток.`,
      html: `
        <div class="grid grid--2">
          <div class="card">
            <div class="card__title">Время суток</div>
            ${donutChart(p.time_of_day.map((r) => ({ label: r.period, value: r.count })))}
          </div>
          <div class="card">
            <div class="card__title">Точки концентрации преступности</div>
            ${[...p.hotspots].sort((a, b) => b.count - a.count).map((h, i, arr) => `
              <div class="hotspot" style="padding:13px 0;border-bottom:${i < arr.length - 1 ? '1px dashed var(--line)' : '0'}">
                <div class="hotspot__rank">${i + 1}</div>
                <div class="hotspot__body">
                  <h4>${esc(h.object)}</h4>
                  <p>${esc(h.types)}</p>
                </div>
                <div class="hotspot__count">${fmt(h.count)}<span>фактов</span></div>
              </div>`).join('')}
            <p style="margin:16px 0 0;display:flex;gap:10px;flex-wrap:wrap">
              <a class="tag" href="map.html?id=${p.id}" style="padding:9px 15px;text-decoration:none;font-size:13.5px">
                Карта объектов →</a>
              ${{ kaskelen: 'kaskelen_map.html', irgeli: 'irgeli_map.html', chundzha: 'chundzha_map.html' }[p.id]
                ? `<a class="tag" href="${{ kaskelen: 'kaskelen_map.html', irgeli: 'irgeli_map.html', chundzha: 'chundzha_map.html' }[p.id]}" style="padding:9px 15px;text-decoration:none;font-size:13.5px;background:var(--up);color:#fff">
                Детальная карта + маршруты →</a>` : ''}
            </p>
          </div>
        </div>`,
    },
    {
      title: 'Административная практика',
      lead: `Форма 1-АД. Всего зарегистрировано ${fmt(admTotal?.count)} административных правонарушений, из них по составам, значимым для профилактики:`,
      html: `<div class="card">${simpleBars(admRest.map((r) => ({
        label: r.indicator,
        value: r.count,
        color: /Дорожные/i.test(r.indicator) ? '#8b9bb4' : 'var(--navy-700)',
      })))}</div>`,
    },
    {
      title: 'Основные криминогенные факторы',
      lead: 'Факторы с количественным подтверждением по данным паспорта; строки без установленных фактов сохранены для последующего мониторинга.',
      html: `<div class="grid grid--2">${p.factors.map((f) => `
        <div class="card">
          <div class="card__title">${esc(f.factor)}</div>
          <p style="margin:0;color:var(--muted);font-size:14.5px">${esc(f.details) || '—'}</p>
        </div>`).join('')}</div>`,
    },
    {
      title: 'Причины и условия',
      lead: 'Группировка причин и условий, способствующих совершению правонарушений.',
      html: `<div class="grid grid--3">${p.causes.map((c) => `
        <div class="card">
          <div class="card__title">${esc(c.type)}</div>
          <p style="margin:0 0 12px;font-size:14.5px">${esc(c.details)}</p>
          ${c.examples ? `<div class="measure__why" style="margin:0">${esc(c.examples)}</div>` : ''}
        </div>`).join('')}</div>`,
    },
    {
      title: 'Лица профилактического учёта',
      lead: `Всего на профилактическом учёте состоит ${fmt(registryTotal)} лиц — это адресная база индивидуальной профилактики.`,
      html: `<div class="grid grid--4">${p.registry.map((r) => kpiCard(fmt(r.count), r.category)).join('')}</div>`,
    },
    {
      title: 'Криминогенные объекты',
      lead: 'Объекты и участки, требующие профилактического контроля.',
      html: `<div class="card">${statRows(p.criminogenic_objects, 'object', 'details')}</div>`,
    },
    {
      title: 'Семейно-бытовая преступность',
      lead: 'Показатели семейно-бытовой сферы и работа с семьями группы риска.',
      html: `<div class="grid grid--3">${dynamicsCards(p.domestic_crime)}</div>`,
    },
    {
      title: 'Преступления в отношении несовершеннолетних',
      lead: 'Потерпевшие несовершеннолетние, причины, условия и принятые меры.',
      html: `
        <div class="grid grid--2">${dynamicsCards(p.minors.filter((r) => r.current !== undefined && r.current !== null))}</div>
        <div class="card" style="margin-top:16px">
          ${statRows(p.minors.filter((r) => r.current === undefined || r.current === null), 'indicator', 'raw')}
        </div>`,
    },
    {
      title: 'Скотокрадство',
      lead: 'Раздел заполняется при наличии зарегистрированных фактов.',
      html: `<div class="card">${statRows(p.cattle_theft, 'indicator', 'value')}</div>`,
    },
    {
      title: p.special.title,
      lead: 'Раздел, отражающий специфику территории населённого пункта.',
      html: `<div class="card">${statRows(p.special.rows, 'indicator', 'value')}</div>`,
    },
    {
      title: 'Приоритетные профилактические мероприятия',
      lead: 'Каждое мероприятие раскрывается объектом профилактики, исполнителями, сроком и критерием оценки. Нажмите на мероприятие, чтобы развернуть карточку.',
      html: measuresBlock(p.measures),
    },
    {
      title: 'Ожидаемые результаты',
      lead: 'Результаты, ожидаемые от реализации приоритетных мероприятий.',
      html: `<div class="card"><ul class="list-check">${p.expected_results
        .map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul></div>`,
    },
  ];
}

/* ---------- Отрисовка страницы ---------- */

function render(id) {
  active = id;
  const p = getPassport(id);
  const s = p.summary;

  history.replaceState(null, '', `?id=${id}`);
  document.title = `Криминологический паспорт · ${p.name} · 2026`;
  document.getElementById('chrome-top').innerHTML = renderTopbar('passport', id);
  document.getElementById('chrome-bottom').innerHTML = renderFooter();

  document.getElementById('p-name').textContent = `Криминологический паспорт — ${p.name}`;
  document.getElementById('p-desc').textContent = s.description;
  document.getElementById('p-chips').innerHTML = [
    ['chip--gold', `${fmt(s.crimes.current)} уголовных правонарушений`],
    ['', `${fmt(s.population)} жителей`],
    ['', `${String(s.rate_per_10k).replace('.', ',')} на 10 тыс. населения`],
    ['', esc(p.district)],
  ].map(([mod, text]) => `<span class="chip ${mod}">${text}</span>`).join('');

  document.getElementById('p-switch').innerHTML = renderSwitch(id, render);

  const sections = buildSections(p);
  document.getElementById('sections').innerHTML = sections.map((sec, i) => `
    <section class="section" id="s${i + 1}">
      <div class="section__head">
        <div class="section__num">${String(i + 1).padStart(2, '0')}</div>
        <div class="section__title">
          <h2>${esc(sec.title)}</h2>
          <p>${sec.lead}</p>
        </div>
      </div>
      ${sec.html}
    </section>`).join('');

  document.getElementById('toc').innerHTML = sections.map((sec, i) => `
    <a href="#s${i + 1}"><span>${i + 1}</span>${esc(sec.title)}</a>`).join('');

  bindMeasures();
  bindScrollSpy();
  window.scrollTo({ top: 0 });
}

function bindMeasures() {
  document.querySelectorAll('.measure__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.measure');
      card.setAttribute('open-state', card.getAttribute('open-state') === '1' ? '0' : '1');
    });
  });
}

let spy = null;

function bindScrollSpy() {
  if (spy) spy.disconnect();
  const links = new Map();
  document.querySelectorAll('#toc a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));

  spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('active'));
      const link = links.get(entry.target.id);
      if (link) {
        link.classList.add('active');
        link.scrollIntoView({ block: 'nearest' });
      }
    });
  }, { rootMargin: '-84px 0px -70% 0px' });

  document.querySelectorAll('.section[id]').forEach((sec) => spy.observe(sec));
}

render(active);
