/* Выгрузка списков группы риска (Туран + ЦКС). */

const RISK_EXPORT_BASE = 'assets/data/risk_export/';

async function loadRiskShard(level, id) {
  let file = 'oblast.json';
  if (level === 'district' && id) file = `district_${id}.json`;
  if (level === 'settlement' && id) file = `district_${id}.json`;
  const res = await fetch(`${RISK_EXPORT_BASE}${file}`);
  if (!res.ok) return null;
  return res.json();
}

function personsToCsv(persons, settlementFilter) {
  let rows = persons || [];
  if (settlementFilter) {
    const q = settlementFilter.toLowerCase();
    rows = rows.filter((p) => (p.cks_settlement || '').toLowerCase().includes(q));
  }
  const header = ['ИИН', 'ФИО', 'Балл', 'Уровень', 'Портрет', 'Район', 'В ЦКС', 'Категории ЦКС', 'Нарушения сверки'];
  const lines = [header.join(';')];
  rows.forEach((p) => {
    lines.push([
      p.iin || '',
      (p.fio || '').replace(/;/g, ','),
      p.scoring ?? '',
      p.risk_label || '',
      (p.portrait || '').replace(/;/g, ','),
      p.district_id || '',
      p.in_cks ? 'да' : 'нет',
      (p.cks_categories || '').replace(/;/g, ','),
      (p.violation_flags || []).join('|'),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  });
  return '\uFEFF' + lines.join('\r\n');
}

function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mountRiskExportButton(containerId, opts) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const level = opts.level || 'oblast';
  const id = opts.id || 'oblast';
  const settlement = opts.settlement || '';
  wrap.innerHTML = `
    <button type="button" class="tag" id="risk-export-btn" style="padding:10px 18px;font-size:14px;cursor:pointer;border:none;background:#1a5c42;color:#fff">
      Выгрузить группу риска (CSV)
    </button>
    <span class="note" style="margin-left:10px;font-size:13px;color:var(--muted)">Ранжирование по баллу Туран; сверка с ЦКС. Перед решениями — перепроверка по первичным материалам.</span>`;
  document.getElementById('risk-export-btn')?.addEventListener('click', async () => {
    const shard = await loadRiskShard(level, id);
    if (!shard?.persons?.length) {
      alert('Файл выгрузки не найден. Запустите scripts/build_risk_export.py (нужен Mongo scoring-db или fallback ЦКС).');
      return;
    }
    const csv = personsToCsv(shard.persons, settlement);
    const name = `gruppa_riska_${level}_${id}${settlement ? '_np' : ''}.csv`;
    downloadCsv(name, csv);
  });
}
