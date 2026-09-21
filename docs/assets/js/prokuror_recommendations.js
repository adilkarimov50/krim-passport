/* Рекомендации прокурору по правилам (Закон № 245) — без внешнего LLM. */

const PROKUROR_RULES_URL = 'assets/data/recommendation_rules.json';
let _prokurorRulesCache = null;

async function loadProkurorRules() {
  if (_prokurorRulesCache) return _prokurorRulesCache;
  try {
    const res = await fetch(PROKUROR_RULES_URL);
    if (res.ok) _prokurorRulesCache = await res.json();
  } catch (e) { /* ignore */ }
  _prokurorRulesCache = _prokurorRulesCache || { rules: [], law_ref: '' };
  return _prokurorRulesCache;
}

function metricsFromOblast(ov) {
  const units = ov.units || [];
  const multi = units.reduce((s, u) => s + (u.cks_multi || 0), 0);
  const neet = units.reduce((s, u) => s + (u.neet || 0), 0);
  const dead = units.reduce((s, u) => s + (u.cks_dead || 0), 0);
  const cross = ov.crossmatch || {};
  let crimeDelta = null;
  let cur = 0;
  let prev = 0;
  units.forEach((u) => {
    if (u.crimes_current) cur += u.crimes_current;
    if (u.crimes_previous) prev += u.crimes_previous;
  });
  if (prev) crimeDelta = Math.round((cur - prev) / prev * 1000) / 10;
  return {
    crime_delta_pct: crimeDelta,
    multi_category: multi,
    neet,
    dead_in_cks: dead,
    adm_in_cks: cross.adm_in_cks || cross.adm_in_cks_persons || 0,
  };
}

function ruleMatches(when, m) {
  if (!when || !Object.keys(when).length) return true;
  if (when.crime_delta_pct_gte != null && (m.crime_delta_pct == null || m.crime_delta_pct < when.crime_delta_pct_gte)) return false;
  if (when.multi_category_gte != null && (m.multi_category == null || m.multi_category < when.multi_category_gte)) return false;
  if (when.neet_gte != null && (m.neet == null || m.neet < when.neet_gte)) return false;
  if (when.dead_in_cks_gte != null && (m.dead_in_cks == null || m.dead_in_cks < when.dead_in_cks_gte)) return false;
  if (when.adm_in_cks_gte != null && (m.adm_in_cks == null || m.adm_in_cks < when.adm_in_cks_gte)) return false;
  if (when.fraud_share_pct_gte != null && (m.fraud_share_pct == null || m.fraud_share_pct < when.fraud_share_pct_gte)) return false;
  return true;
}

function pickRecommendations(metrics, rules) {
  const matched = (rules || [])
    .filter((r) => r.id !== 'default' && ruleMatches(r.when, metrics))
    .sort((a, b) => (a.priority || 9) - (b.priority || 9));
  const out = matched.slice(0, 5);
  if (!out.length) {
    const def = (rules || []).find((r) => r.id === 'default');
    if (def) out.push(def);
  }
  return out;
}

async function renderProkurorRecommendations(containerId, ctx) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const cfg = await loadProkurorRules();
  let metrics = ctx.data || {};
  if (ctx.level === 'oblast' && ctx.data?.units) {
    metrics = metricsFromOblast(ctx.data);
  }
  const recs = pickRecommendations(metrics, cfg.rules);
  if (!recs.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const title = ctx.title || (ctx.level === 'oblast' ? 'Алматинская область' : 'Территория');
  el.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:1.15rem">Рекомендации прокурору · ${esc(title)}</h3>
    <p style="margin:0 0 12px;font-size:13px;color:var(--muted)">${esc(cfg.law_ref || '')}. Сформировано по показателям мониторинга; не заменяет процессуальную оценку.</p>
    <ol style="margin:0;padding-left:1.25rem;line-height:1.5">${recs.map((r) => {
      const nav = r.navigator ? `<a href="${esc(r.navigator)}">Навигатор</a>` : '';
      return `<li style="margin-bottom:10px">${esc(r.text)} ${nav ? `· ${nav}` : ''}</li>`;
    }).join('')}</ol>
    <p style="margin:14px 0 0;font-size:12px;color:var(--muted)">По категориям «суицид», «беременные несовершеннолетние» и уголовным эпизодам — сверка с КУИ/ЕРДР вне компетенции общего надзора без процессуального повода.</p>`;
}
