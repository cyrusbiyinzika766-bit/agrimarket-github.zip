let schema = {};
const cache = {};          // all records of every collection (used for dropdowns and labels)
let current = 'dashboard';
let editingId = null;      // null while creating, the _id while editing
let search = '';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = bad ? 'bad' : '';
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3200);
}

/* ---------- display helpers ---------- */
function fieldOf(col, name) {
  return schema[col].fields.find(f => f.name === name) || (schema[col].extra || []).find(f => f.name === name);
}

function refLabel(col, id) {
  const doc = (cache[col] || []).find(d => d._id === id);
  if (!doc) return id;
  const lf = schema[col].labelField;
  return lf === '_id' ? id : `${id} · ${doc[lf]}`;
}

function show(col, doc, name) {
  const v = getPath(doc, name);
  if (name === '_id') return esc(v);
  const f = fieldOf(col, name);
  if (v === null || v === undefined || v === '') return '<span style="color:#aaa">-</span>';
  if (f.type === 'array') return esc(v.join(', '));
  if (f.type === 'date') return esc(String(v).slice(0, 10));
  if (f.type === 'number') return esc(Number(v).toLocaleString());
  if (f.type === 'ref') return esc(refLabel(f.ref, v));
  if (name === 'status' || name.endsWith('.status')) {
    const good = ['available', 'paid', 'delivered'].includes(v);
    return `<span class="badge ${good ? 'ok' : 'warn'}">${esc(v)}</span>`;
  }
  return esc(v);
}

/* ---------- data loading ---------- */
async function loadCollection(col) {
  const q = col === current && search ? '?q=' + encodeURIComponent(search) : '';
  const rows = await api(`/api/${col}${q}`);
  if (!q) cache[col] = rows;
  return rows;
}
async function refreshCache() {
  await Promise.all(Object.keys(schema).map(async c => (cache[c] = await api(`/api/${c}`))));
}

/* ---------- navigation ---------- */
function buildNav() {
  const items = [['dashboard', 'Dashboard'], ...Object.entries(schema).map(([k, v]) => [k, v.label])];
  $('#nav').innerHTML = items.map(([k, l]) =>
    `<button data-col="${k}" class="${k === current ? 'active' : ''}">${esc(l)}</button>`).join('');
}
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  current = b.dataset.col;
  search = '';
  buildNav();
  render();
});

async function render() {
  try {
    if (current === 'dashboard') return await renderDashboard();
    await renderTable(current);
  } catch (e) { toast(e.message, true); }
}

/* ---------- READ: table view ---------- */
async function renderTable(col) {
  const def = schema[col];
  const rows = await loadCollection(col);
  const heads = def.columns.map(c => `<th>${esc(c === '_id' ? 'ID' : fieldOf(col, c).label)}</th>`).join('');
  const body = rows.map(r => `<tr>
      ${def.columns.map(c => `<td>${show(col, r, c)}</td>`).join('')}
      <td class="actions">
        <button class="btn small" data-act="edit" data-id="${esc(r._id)}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${esc(r._id)}">Delete</button>
      </td></tr>`).join('');

  $('#view').innerHTML = `
    <div class="toolbar">
      <h2>${esc(def.label)}</h2>
      <input id="q" type="search" placeholder="Search ${esc(def.label.toLowerCase())}..." value="${esc(search)}">
      <button class="btn primary" id="addBtn">+ Add ${esc(def.singular)}</button>
    </div>
    <div class="table-wrap">
      ${rows.length
        ? `<table><thead><tr>${heads}<th>Actions</th></tr></thead><tbody>${body}</tbody></table>`
        : '<div class="empty">No records found.</div>'}
    </div>
    <p class="count">${rows.length} record(s)</p>`;

  const q = $('#q');
  q.addEventListener('input', () => {
    clearTimeout(q.timer);
    q.timer = setTimeout(async () => {
      search = q.value.trim();
      const pos = q.selectionStart;
      await renderTable(col);
      const nq = $('#q'); nq.focus(); nq.setSelectionRange(pos, pos);
    }, 250);
  });
  $('#addBtn').onclick = () => openForm(col, null);
  $('.table-wrap').onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'edit') openForm(col, b.dataset.id);
    if (b.dataset.act === 'del') await removeRecord(col, b.dataset.id);
  };
}

/* ---------- CREATE / UPDATE: form dialog ---------- */
function inputFor(col, f, value) {
  const id = 'f_' + f.name.replace('.', '_');
  const req = f.required ? 'required' : '';
  const v = value ?? '';
  let control;
  if (f.type === 'select') {
    control = `<select id="${id}" name="${f.name}" ${req}>
      ${f.required ? '' : '<option value=""></option>'}
      ${f.options.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}
    </select>`;
  } else if (f.type === 'ref') {
    control = `<select id="${id}" name="${f.name}" ${req}>
      <option value="">Select...</option>
      ${(cache[f.ref] || []).map(d => `<option value="${esc(d._id)}" ${d._id === v ? 'selected' : ''}>${esc(refLabel(f.ref, d._id))}</option>`).join('')}
    </select>`;
  } else if (f.type === 'number') {
    control = `<input id="${id}" name="${f.name}" type="number" min="0" step="any" value="${esc(v)}" ${req}>`;
  } else if (f.type === 'date') {
    control = `<input id="${id}" name="${f.name}" type="date" value="${esc(String(v).slice(0, 10))}" ${req}>`;
  } else if (f.type === 'array') {
    control = `<input id="${id}" name="${f.name}" type="text" value="${esc(Array.isArray(v) ? v.join(', ') : v)}" placeholder="${esc(f.hint || '')}">`;
  } else {
    control = `<input id="${id}" name="${f.name}" type="text" value="${esc(v)}" ${req}>`;
  }
  return `<div><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>${control}</div>`;
}

function openForm(col, id) {
  const def = schema[col];
  editingId = id;
  const doc = id ? cache[col].find(d => d._id === id) : null;
  $('#dlgTitle').textContent = id ? `Edit ${def.singular} ${id}` : `Add ${def.singular}`;
  $('#dlgHint').textContent = (def.hint ? def.hint + ' ' : '') + (id ? '' : 'The ID is generated automatically.');
  $('#fields').innerHTML = def.fields.map(f => inputFor(col, f, doc ? getPath(doc, f.name) : '')).join('');
  $('#formError').hidden = true;
  $('#form').dataset.col = col;
  $('#dlg').showModal();
}
$('#cancelBtn').onclick = () => $('#dlg').close();

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const col = e.target.dataset.col;
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editingId) await api(`/api/${col}/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api(`/api/${col}`, { method: 'POST', body: JSON.stringify(body) });
    $('#dlg').close();
    toast(editingId ? 'Record updated' : 'Record added');
    await refreshCache();
    render();
  } catch (err) {
    const box = $('#formError');
    box.textContent = err.message;
    box.hidden = false;
  }
});

/* ---------- DELETE ---------- */
async function removeRecord(col, id) {
  if (!confirm(`Delete ${id}? This cannot be undone.`)) return;
  try {
    await api(`/api/${col}/${id}`, { method: 'DELETE' });
    toast(`${id} deleted`);
    await refreshCache();
    render();
  } catch (e) { toast(e.message, true); }
}

/* ---------- dashboard ---------- */
function miniTable(heads, rows) {
  if (!rows.length) return '<div class="empty">No data</div>';
  return `<div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

async function renderDashboard() {
  const s = await api('/api/stats');
  const cards = Object.entries(schema).map(([k, v]) =>
    `<div class="card"><div class="n">${s.counts[k]}</div><div class="l">${esc(v.label)}</div></div>`).join('');
  $('#view').innerHTML = `
    <div class="toolbar"><h2>Dashboard</h2></div>
    <div class="cards">
      ${cards}
      <div class="card"><div class="n">UGX ${Number(s.paid.total_ugx).toLocaleString()}</div>
        <div class="l">Paid orders (${s.paid.orders})</div></div>
    </div>
    <div class="panels">
      <div class="panel"><h3>Revenue by produce</h3>
        ${miniTable(['Produce', 'Kg sold', 'Revenue (UGX)'], s.revenueByProduce.map(r => [r._id, r.kg.toLocaleString(), r.revenue_ugx.toLocaleString()]))}</div>
      <div class="panel"><h3>Available stock by district</h3>
        ${miniTable(['District', 'Listings', 'Kg available'], s.stockByDistrict.map(r => [r._id || '-', r.listings, r.kg.toLocaleString()]))}</div>
      <div class="panel"><h3>Orders by delivery status</h3>
        ${miniTable(['Status', 'Orders'], s.deliveries.map(r => [r._id || '-', r.orders]))}</div>
    </div>`;
}

/* ---------- start ---------- */
(async () => {
  try {
    schema = await api('/api/schema');
    await refreshCache();
    buildNav();
    render();
  } catch (e) {
    $('#view').innerHTML = `<p class="error">Could not load the app: ${esc(e.message)}</p>`;
  }
})();
