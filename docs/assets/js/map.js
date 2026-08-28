/* Карта объектов: метки по категориям, фильтры и связанный список. */

const PRECISION_LABELS = {
  point: 'точная привязка к объекту',
  street: 'координата участка улицы',
  area: 'центр территории',
};

let active = currentId();
let hidden = new Set();
let map = null;
let layer = null;
let markers = new Map();

document.getElementById('chrome-top').innerHTML = renderTopbar('map', active);
document.getElementById('chrome-bottom').innerHTML = renderFooter();

function markerIcon(point) {
  const color = CATEGORY_COLORS[point.category];
  // Метки точек концентрации масштабируются по количеству фактов.
  const size = point.count ? Math.round(26 + Math.sqrt(point.count) * 2.4) : 20;
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin" style="width:${size}px;height:${size}px;background:${color}">${point.count ?? ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function popupHtml(point) {
  return `
    <h4>${esc(point.name)}</h4>
    <div>${esc(CATEGORY_LABELS[point.category])}${
      point.count ? ` · <span class="pp-count">${fmt(point.count)} фактов</span>` : ''}</div>
    ${point.crimes ? `<div style="margin-top:6px">${esc(point.crimes)}</div>` : ''}
    <div class="pp-note">${esc(point.note)}</div>
    <div class="pp-note" style="font-style:italic">Привязка: ${PRECISION_LABELS[point.precision] || point.precision}</div>`;
}

function visiblePoints() {
  return GEO[active].points.filter((p) => !hidden.has(p.category));
}

function drawMap() {
  const geo = GEO[active];
  if (!map) {
    map = L.map('map', { scrollWheelZoom: false }).setView(geo.center, geo.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; участники <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
  }
  if (layer) layer.remove();
  markers.clear();

  const points = visiblePoints();
  layer = L.layerGroup(points.map((point) => {
    const marker = L.marker([point.lat, point.lon], { icon: markerIcon(point), title: point.name })
      .bindPopup(popupHtml(point));
    markers.set(point.id, marker);
    return marker;
  })).addTo(map);

  if (points.length) {
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])).pad(0.22));
  } else {
    map.setView(geo.center, geo.zoom);
  }
}

function drawFilters() {
  const counts = {};
  GEO[active].points.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });

  document.getElementById('filters').innerHTML = Object.keys(counts).map((cat) => `
    <button type="button" data-cat="${cat}" aria-pressed="${!hidden.has(cat)}">
      <i style="background:${CATEGORY_COLORS[cat]}"></i>${esc(CATEGORY_LABELS[cat])} · ${counts[cat]}
    </button>`).join('');

  document.querySelectorAll('#filters button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (hidden.has(cat)) hidden.delete(cat); else hidden.add(cat);
      btn.setAttribute('aria-pressed', String(!hidden.has(cat)));
      drawMap();
      drawSide();
    });
  });
}

function drawSide() {
  const points = [...visiblePoints()].sort((a, b) => (b.count || 0) - (a.count || 0));
  document.getElementById('side').innerHTML = points.map((point) => `
    <button class="place" type="button" data-id="${point.id}">
      <div class="place__top">
        <span class="place__dot" style="background:${CATEGORY_COLORS[point.category]}"></span>
        <span class="place__name">${esc(point.name)}</span>
        ${point.count ? `<span class="place__count">${fmt(point.count)}</span>` : ''}
      </div>
      <p class="place__meta">${esc(point.crimes || CATEGORY_LABELS[point.category])}</p>
    </button>`).join('') || '<div class="card">Все категории скрыты фильтром.</div>';

  document.querySelectorAll('.place').forEach((btn) => {
    btn.addEventListener('click', () => {
      const point = GEO[active].points.find((p) => p.id === btn.dataset.id);
      map.flyTo([point.lat, point.lon], 16, { duration: 0.7 });
      markers.get(point.id)?.openPopup();
    });
  });
}

function drawUnlocated() {
  const items = GEO[active].unlocated || [];
  document.getElementById('unlocated-wrap').style.display = items.length ? '' : 'none';
  document.getElementById('unlocated').innerHTML = items.map((item) => `
    <div class="card">
      <div class="card__title">${esc(item.name)}</div>
      <p style="margin:0;color:var(--muted);font-size:14.5px">${esc(item.detail)}</p>
    </div>`).join('');
}

function render(id) {
  active = id;
  hidden = new Set();
  history.replaceState(null, '', `?id=${id}`);
  document.getElementById('chrome-top').innerHTML = renderTopbar('map', id);
  document.getElementById('m-switch').innerHTML = renderSwitch(id, render);
  drawFilters();
  drawMap();
  drawSide();
  drawUnlocated();
}

render(active);
