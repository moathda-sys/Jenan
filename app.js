// JENAN | Civil Site Coordination — الواجهة
import { api, LIVE, on, enqueue, pendingOps, flush, compressImage, uuid } from './data.js';

// ---------- نصوص ----------
const T = {
  type: { observation: 'ملاحظة فنية', request: 'عمل مطلوب', inspection: 'طلب فحص' },
  typeShort: { observation: 'ملاحظة', request: 'طلب', inspection: 'فحص' },
  status: { open: 'مفتوح', review: 'بانتظار المراجعة', hold: 'متوقف', closed: 'مغلق' },
  prio: { critical: 'حرجة', normal: 'عادية', low: 'منخفضة' },
  role: { consultant: 'الاستشاري', contractor: 'المقاول' },
  kind: { created: 'أنشأ البند', comment: 'رد', submitted: 'أرسل للمراجعة', returned: 'أعاد للمعالجة',
    closed: 'اعتمد وأغلق', hold: 'أوقف البند', resumed: 'استأنف البند', reopened: 'أعاد فتح البند', edited: 'عدّل البند' },
  field: { villa: 'الفيلا', title: 'العنوان', description: 'الوصف', priority: 'الأولوية', due_date: 'الاستحقاق', external_ref: 'المرجع' },
};
const STATUS_ICON = { open: 'circle', review: 'hourglass', hold: 'pausec', closed: 'checkc' };
const KIND_ICON = { created: 'plus', comment: 'chat', submitted: 'send', returned: 'undo', closed: 'checkc',
  hold: 'pause', resumed: 'play', reopened: 'undo', edited: 'edit' };

// ---------- أيقونات ----------
const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  check: '<path d="M5 12l5 5 9-11"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5.5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5.5-8 9s8 4 8 9"/>',
  pausec: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M9 18l6-6-6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.6v.2"/>',
  flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  cloud: '<path d="M7 18a4 4 0 01-.5-8A6 6 0 0118 10a4 4 0 01-1 8z"/>',
  cloudoff: '<path d="M3 3l18 18"/><path d="M17 18H7a4 4 0 01-.6-7.96"/><path d="M9.5 6.5A6 6 0 0118 10a4 4 0 012.4 6.6"/>',
  sync: '<path d="M20 11a8 8 0 00-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0014.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  logout: '<path d="M14 4h5v16h-5"/><path d="M9 8l-4 4 4 4M5 12h10"/>',
  swap: '<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 12l4 4-4 4"/><path d="M21 16H7"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const toLatin = s => String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

// ---------- الحالة ----------
const S = {
  me: null, project: null, profiles: {}, items: new Map(), reads: new Map(), events: new Map(),
  outbox: [], online: navigator.onLine, rt: '', loaded: false,
  view: 'home', sel: null, sheet: null,
  f: { chip: null, q: '', villa: '', type: '', status: 'active', prio: '' },
};

// ---------- التواريخ ----------
const pad = n => String(n).padStart(2, '0');
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };
const today = () => localISO();
const dd = iso => new Date(iso + 'T12:00:00');
const dayDiff = iso => Math.round((Date.parse(iso) - Date.parse(today())) / 864e5);
const fmtDate = new Intl.DateTimeFormat('ar-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short' });
const fmtTime = new Intl.DateTimeFormat('ar-u-nu-latn-ca-gregory', { hour: 'numeric', minute: '2-digit' });
function days(n) { n = Math.abs(n); return n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يومًا`; }
function ago(iso) {
  const d = new Date(iso), s = (Date.now() - d) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (localISO(d) === today()) return fmtTime.format(d);
  if (localISO(d) === addDays(-1)) return 'أمس ' + fmtTime.format(d);
  return fmtDate.format(d) + ' ' + fmtTime.format(d);
}

// ---------- منطق البنود ----------
const active = it => it.status !== 'closed';
const ballWith = it => ({ open: 'contractor', review: 'consultant' }[it.status] || null);
const isMine = it => active(it) && ballWith(it) === S.me?.role;
const overdue = it => (it.status === 'open' || it.status === 'review') && it.due_date && it.due_date < today();
const unread = it => !it.pending && it.last_actor && it.last_actor !== S.me?.id &&
  (!S.reads.get(it.id) || Date.parse(it.updated_at) > Date.parse(S.reads.get(it.id)));
const pendingFor = it => S.outbox.filter(o => o.kind === 'action' &&
  (o.itemRef.id === it.id || (it.client_id && o.itemRef.client_id === it.client_id)));

function pendingItems() {
  const known = new Set([...S.items.values()].map(i => i.client_id).filter(Boolean));
  return S.outbox.filter(o => o.kind === 'create' && !known.has(o.client_id)).map(o => ({
    id: 'c:' + o.client_id, client_id: o.client_id, pending: true, op: o,
    project_id: S.project.id, type: o.params.p_type, villa: o.params.p_villa, title: o.params.p_title,
    description: o.params.p_description || '', priority: o.params.p_priority, due_date: o.params.p_due,
    external_ref: o.params.p_external_ref, status: o.params.p_type === 'inspection' ? 'review' : 'open',
    return_count: 0, created_by: S.me.id, created_at: o.created_at, updated_at: o.created_at, last_actor: S.me.id,
  }));
}
const allItems = () => [...S.items.values(), ...pendingItems()];
function getItem(key) {
  if (key == null) return null;
  if (typeof key === 'number') return S.items.get(key) || null;
  const cid = String(key).slice(2);
  return [...S.items.values()].find(i => i.client_id === cid) || pendingItems().find(i => i.client_id === cid) || null;
}

const PW = { critical: 0, normal: 1, low: 2 };
function rank(it) {
  const upd = -Date.parse(it.updated_at || it.created_at);
  if (!active(it)) return [9, 0, 0, -Date.parse(it.closed_at || it.updated_at)];
  const g = overdue(it) ? 0 : it.priority === 'critical' ? 1 : isMine(it) ? 2 : it.status === 'hold' ? 5 : 3;
  return [g, PW[it.priority] ?? 1, it.due_date ? Date.parse(it.due_date) : 9e15, upd];
}
function cmp(a, b) { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }

function matchQ(it, q) {
  if (!q) return true;
  const n = q.replace('#', '');
  return it.villa === n || it.villa.includes(n) || String(it.id) === n || it.title.includes(q) || (it.external_ref || '').includes(q);
}
function visible() {
  const f = S.f;
  let a = allItems();
  if (f.status === 'active') a = a.filter(active); else if (f.status) a = a.filter(i => i.status === f.status);
  if (f.type) a = a.filter(i => i.type === f.type);
  if (f.prio) a = a.filter(i => i.priority === f.prio);
  if (f.villa) a = a.filter(i => i.villa === f.villa);
  if (f.chip === 'mine') a = a.filter(isMine);
  if (f.chip === 'overdue') a = a.filter(overdue);
  if (f.chip === 'critical') a = a.filter(i => active(i) && i.priority === 'critical');
  if (f.chip === 'new') a = a.filter(unread);
  a = a.filter(i => matchQ(i, f.q));
  return a.sort(cmp);
}

function whoText(it) {
  if (it.status === 'closed') return { t: 'مغلق', mine: false };
  if (it.status === 'hold') return { t: 'متوقف' + (it.hold_reason ? ': ' + it.hold_reason : ''), mine: false };
  const w = ballWith(it);
  return w === S.me.role ? { t: 'مطلوب منك', mine: true } : { t: 'عند ' + T.role[w], mine: false };
}
function dueText(it) {
  if (it.status === 'closed') return { t: 'أُغلق ' + (it.closed_at ? fmtDate.format(new Date(it.closed_at)) : ''), cls: '' };
  if (!it.due_date) return { t: 'بدون موعد', cls: 'muted' };
  const n = dayDiff(it.due_date);
  if (it.status === 'hold') return { t: 'الموعد ' + fmtDate.format(dd(it.due_date)), cls: 'muted' };
  if (n < 0) return { t: 'متأخر ' + days(n), cls: 'late' };
  if (n === 0) return { t: 'اليوم', cls: 'soon' };
  if (n === 1) return { t: 'غدًا', cls: 'soon' };
  return { t: 'بعد ' + days(n), cls: '' };
}
const statusBadge = (st, big = false) =>
  `<span class="st st-${st}${big ? ' big' : ''}">${ic(STATUS_ICON[st])}${T.status[st]}</span>`;

// ============================================================
//  العرض
// ============================================================
function renderBoot(msg = 'جارٍ التحميل…') {
  document.getElementById('app').innerHTML = `<div class="boot"><div class="logo">ج</div><p>${esc(msg)}</p></div>`;
}

function renderLogin(err = '') {
  document.body.className = '';
  const demo = !LIVE;
  document.getElementById('app').innerHTML = `
  <div class="login">
    <div class="login-card">
      <div class="logo">ج</div>
      <h1>جنان</h1>
      <p class="sub">التنسيق اليومي بين الاستشاري والمقاول</p>
      ${err ? `<p class="err" role="alert">${esc(err)}</p>` : ''}
      ${demo ? `
        <div class="demo-note">${ic('phone')}<span>وضع تجريبي: البيانات على هذا الجهاز فقط. افتح تبويبًا ثانيًا بالدور الآخر لترى المزامنة بين الطرفين.</span></div>
        <button class="btn primary block" data-act="demo-login" data-role="consultant">${ic('user')}دخول كاستشاري</button>
        <button class="btn block" data-act="demo-login" data-role="contractor">${ic('user')}دخول كمقاول</button>
      ` : `
        <form id="login-form" class="form" autocomplete="on">
          <label>البريد الإلكتروني<input name="email" type="email" required autocomplete="username" dir="ltr"></label>
          <label>كلمة المرور<input name="password" type="password" required autocomplete="current-password" dir="ltr"></label>
          <button class="btn primary block" type="submit">دخول</button>
        </form>
        <p class="hint">الحسابات يضيفها مدير المنصة.</p>
      `}
    </div>
  </div>`;
}

function renderShell() {
  document.getElementById('app').innerHTML = `
  <div class="shell">
    <header class="top">
      <div class="brand"><div class="logo sm">ج</div><div class="bt"><b>جنان</b><small>${esc(S.project.name)}</small></div></div>
      <label class="search">${ic('search')}<input id="q" type="search" placeholder="رقم الفيلا أو كلمة" enterkeyhint="search" aria-label="بحث"></label>
      <button class="sync" id="sync" data-act="more" aria-label="حالة المزامنة"></button>
      <div class="wide-only top-actions">
        <button class="btn ghost" data-act="view" data-view="villas" id="tv-villas">${ic('grid')}الفلل</button>
        <button class="btn ghost" data-act="filter">${ic('filter')}تصفية</button>
        <button class="btn primary" data-act="add">${ic('plus')}بند جديد</button>
        <button class="iconbtn" data-act="more" aria-label="حسابي">${ic('user')}</button>
      </div>
    </header>
    <nav class="chips" id="chips" aria-label="مؤشرات سريعة"></nav>
    <main class="main">
      <section class="listpane" aria-label="البنود">
        <div class="listhead" id="listhead"></div>
        <div class="list" id="list"></div>
      </section>
      <section class="detail" id="detail" aria-label="تفاصيل البند"></section>
    </main>
    <nav class="bottom" aria-label="التنقل">
      <button data-act="view" data-view="home" id="nb-home">${ic('home')}<span>الرئيسية</span></button>
      <button data-act="view" data-view="villas" id="nb-villas">${ic('grid')}<span>الفلل</span></button>
      <button class="fab" data-act="add" aria-label="إضافة بند">${ic('plus')}</button>
      <button data-act="filter" id="nb-filter">${ic('filter')}<span>تصفية</span></button>
      <button data-act="more">${ic('user')}<span>حسابي</span></button>
    </nav>
  </div>
  <div id="sheet"></div>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="print"></div>`;
  const q = $('#q');
  q.addEventListener('input', () => { S.f.q = toLatin(q.value.trim()); renderList(); });
  renderAll();
}

let raf = 0;
function renderAll() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { renderSync(); renderChips(); renderList(); renderDetail(); }); }

function renderSync() {
  const el = $('#sync'); if (!el) return;
  const n = S.outbox.length;
  let cls = 'ok', icon = 'cloud', t = LIVE ? 'متزامن' : 'تجريبي';
  if (!S.online) { cls = 'off'; icon = 'cloudoff'; t = n ? `بدون اتصال · ${n}` : 'بدون اتصال'; }
  else if (n) { cls = 'busy'; icon = 'sync'; t = `جارٍ الإرسال · ${n}`; }
  el.className = 'sync ' + cls;
  el.innerHTML = ic(icon) + `<span>${t}</span>`;
}

function renderChips() {
  const el = $('#chips'); if (!el) return;
  const a = allItems().filter(active);
  const chips = [
    ['mine', 'عليّ الآن', 'user', a.filter(isMine).length],
    ['overdue', 'متأخر', 'clock', a.filter(overdue).length],
    ['critical', 'حرج', 'alert', a.filter(i => i.priority === 'critical').length],
    ['new', 'جديد', 'dot', a.filter(unread).length],
  ];
  el.innerHTML = chips.map(([k, t, i, n]) => `
    <button class="chip ch-${k}${S.f.chip === k ? ' on' : ''}${n ? '' : ' zero'}" data-act="chip" data-k="${k}" aria-pressed="${S.f.chip === k}">
      ${ic(i)}<span class="ct">${t}</span><b>${n}</b>
    </button>`).join('');
}

function filterSummary() {
  const f = S.f, parts = [];
  if (f.villa) parts.push(`<button class="pill" data-act="clear" data-k="villa">فيلا ${esc(f.villa)} ${ic('x')}</button>`);
  if (f.type) parts.push(`<button class="pill" data-act="clear" data-k="type">${T.type[f.type]} ${ic('x')}</button>`);
  if (f.prio) parts.push(`<button class="pill" data-act="clear" data-k="prio">${T.prio[f.prio]} ${ic('x')}</button>`);
  if (f.status !== 'active') parts.push(`<button class="pill" data-act="clear" data-k="status">${f.status ? T.status[f.status] : 'الكل'} ${ic('x')}</button>`);
  return parts.join('');
}

function cardHTML(it) {
  const who = whoText(it), due = dueText(it), pend = it.pending || pendingFor(it).length;
  const sel = S.sel != null && getItem(S.sel) === it;
  return `
  <button class="card p-${it.priority}${sel ? ' sel' : ''}${active(it) ? '' : ' done'}" data-act="open" data-key="${esc(String(it.id))}">
    <div class="c1">
      <span class="villa">${esc(it.villa)}</span>
      <span class="title">${esc(it.title)}</span>
      ${unread(it) ? `<span class="newdot" title="جديد">${ic('dot')}</span>` : ''}
    </div>
    <div class="c2">
      ${statusBadge(it.status)}
      <span class="who${who.mine ? ' mine' : ''}">${who.mine ? ic('user') : ''}${esc(who.t)}</span>
    </div>
    <div class="c3">
      <span class="due ${due.cls}">${due.cls === 'late' ? ic('clock') : ''}${esc(due.t)}</span>
      ${it.priority === 'critical' ? `<span class="prio crit">${ic('alert')}حرجة</span>` : ''}
      <span class="type">${T.typeShort[it.type]}</span>
      ${pend ? `<span class="pend">${ic('sync')}بانتظار الإرسال</span>` : `<span class="ref">#${it.id}</span>`}
    </div>
  </button>`;
}

function renderList() {
  const head = $('#listhead'), list = $('#list'); if (!list) return;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === S.view));
  $('#nb-filter')?.classList.toggle('on', !!(S.f.type || S.f.prio || S.f.status !== 'active'));
  if (S.view === 'villas') {
    head.innerHTML = `<h2>الفلل</h2><span class="muted">اضغط على فيلا لعرض بنودها</span>`;
    list.innerHTML = villasHTML();
    return;
  }
  const v = visible();
  const label = S.f.chip ? { mine: 'عليّ الآن', overdue: 'المتأخرة', critical: 'الحرجة', new: 'الجديدة' }[S.f.chip]
    : S.f.status === 'active' ? 'البنود النشطة' : 'البنود';
  head.innerHTML = `<h2>${label} <span class="count">${v.length}</span></h2><div class="pills">${filterSummary()}</div>`;
  if (!S.loaded && !v.length) { list.innerHTML = `<div class="empty">${ic('sync', 'spin')}<p>جارٍ تحميل البنود…</p></div>`; return; }
  if (!v.length) {
    const any = S.f.chip || S.f.q || S.f.villa || S.f.type || S.f.prio;
    list.innerHTML = `<div class="empty">${ic('checkc')}<p>${any ? 'لا توجد بنود مطابقة' : 'لا توجد بنود نشطة'}</p>
      ${any ? `<button class="btn ghost" data-act="clear-all">إزالة التصفية</button>` : `<button class="btn primary" data-act="add">${ic('plus')}أضف أول بند</button>`}</div>`;
    return;
  }
  list.innerHTML = v.map(cardHTML).join('');
}

function villasHTML() {
  const m = new Map();
  for (const it of allItems()) {
    const v = m.get(it.villa) || { villa: it.villa, active: 0, late: 0, crit: 0, mine: 0, total: 0 };
    v.total++;
    if (active(it)) { v.active++; if (overdue(it)) v.late++; if (it.priority === 'critical') v.crit++; if (isMine(it)) v.mine++; }
    m.set(it.villa, v);
  }
  const arr = [...m.values()].sort((a, b) => (b.active > 0) - (a.active > 0) || a.villa.localeCompare(b.villa, 'en', { numeric: true }));
  if (!arr.length) return `<div class="empty">${ic('grid')}<p>لا توجد فلل بعد — تظهر هنا تلقائيًا عند إضافة البنود</p></div>`;
  return `<div class="villas">${arr.map(v => `
    <button class="villa-tile${v.active ? '' : ' done'}" data-act="pick-villa" data-v="${esc(v.villa)}">
      <b>${esc(v.villa)}</b>
      <span>${v.active ? `${v.active} نشط` : 'لا بنود نشطة'}</span>
      <span class="vt-flags">
        ${v.late ? `<i class="late">${ic('clock')}${v.late}</i>` : ''}
        ${v.crit ? `<i class="crit">${ic('alert')}${v.crit}</i>` : ''}
        ${v.mine ? `<i class="mine">${ic('user')}${v.mine}</i>` : ''}
      </span>
    </button>`).join('')}</div>`;
}

// ---------- التفاصيل ----------
function actionsFor(it) {
  const R = S.me.role, st = it.status;
  if (R === 'consultant') {
    if (st === 'review') return [['close', 'قبول وإغلاق', 'check', 'primary'], ['return', 'إعادة للمعالجة', 'undo', 'warn'], ['comment', 'رد', 'chat', '']];
    if (st === 'open') return [['comment', 'رد', 'chat', ''], ['hold', 'إيقاف', 'pause', ''], ['close', 'إغلاق', 'check', '']];
    if (st === 'hold') return [['resume', 'استئناف', 'play', 'primary'], ['comment', 'رد', 'chat', '']];
    return [['reopen', 'إعادة فتح', 'undo', ''], ['comment', 'رد', 'chat', '']];
  }
  if (st === 'open') return [['submit', 'تم التنفيذ — أرسل للمراجعة', 'send', 'primary'], ['comment', 'رد', 'chat', '']];
  return [['comment', 'رد', 'chat', '']];
}

function photosHTML(paths, blobs) {
  if (blobs?.length) return `<div class="photos">${blobs.map(b => {
    const u = URL.createObjectURL(b); return `<button class="ph" data-act="photo" data-src="${u}"><img src="${u}" alt="صورة"></button>`; }).join('')}</div>`;
  if (!paths?.length) return '';
  return `<div class="photos">${paths.map(p => `<button class="ph" data-act="photo" data-path="${esc(p)}"><img data-path="${esc(p)}" alt="صورة"></button>`).join('')}</div>`;
}

function eventHTML(ev, pending = false) {
  const who = S.profiles[ev.actor] || {};
  let body = '';
  if (ev.kind === 'edited') {
    const ch = ev.meta?.changes || {};
    body = `<ul class="changes">${Object.entries(ch).map(([k, [a, b]]) => {
      const f = v => k === 'priority' ? T.prio[v] : (v || '—');
      return `<li><b>${T.field[k] || k}:</b> <s>${esc(f(a))}</s> ← ${esc(f(b))}</li>`; }).join('')}</ul>`;
  } else if (ev.body && !(ev.kind === 'created')) body = `<p>${esc(ev.body)}</p>`;
  const phase = ev.meta?.phase === 'before' ? 'قبل' : ev.meta?.phase === 'after' ? 'بعد' : '';
  const ph = photosHTML(ev.photos, ev.blobs);
  return `
  <li class="ev k-${ev.kind}${pending ? ' pending' : ''}">
    <span class="ev-ic">${ic(KIND_ICON[ev.kind] || 'chat')}</span>
    <div class="ev-b">
      <div class="ev-h"><b>${esc(who.full_name || '—')}</b> <span>${T.kind[ev.kind]}</span>
        <time>${pending ? `${ic('sync')}بانتظار الإرسال` : ago(ev.created_at)}</time></div>
      ${body}
      ${ph ? (phase ? `<div class="phase">صور ${phase}</div>` : '') + ph : ''}
    </div>
  </li>`;
}

async function loadEvents(it) {
  if (it.pending || S.events.has(it.id)) return;
  S.events.set(it.id, null);
  try { S.events.set(it.id, await api.fetchEvents(it.id)); }
  catch { S.events.delete(it.id); }
  if (getItem(S.sel) === it || getItem(S.sel)?.id === it.id) renderDetail();
}

function renderDetail() {
  const el = $('#detail'); if (!el) return;
  const it = getItem(S.sel);
  document.body.classList.toggle('has-sel', !!it);
  if (!it) {
    el.innerHTML = `<div class="d-empty">${ic('chat')}<p>اختر بندًا لعرض تفاصيله</p></div>`;
    return;
  }
  const scroll = el.querySelector('.d-body')?.scrollTop || 0;
  const sameItem = el.dataset.key === String(it.id);
  const who = whoText(it), due = dueText(it);
  let evs;
  if (it.pending) evs = [{ actor: S.me.id, kind: 'created', body: it.description, blobs: it.op.blobs, meta: { phase: 'before' }, created_at: it.created_at }];
  else { evs = S.events.get(it.id); if (evs === undefined) loadEvents(it); }
  const pend = pendingFor(it).map(o => ({ actor: S.me.id, kind: { comment: 'comment', submit: 'submitted', close: 'closed', return: 'returned', hold: 'hold', resume: 'resumed', reopen: 'reopened' }[o.params.p_action], body: o.params.p_body, blobs: o.blobs, meta: {}, created_at: o.created_at }));
  const acts = actionsFor(it);
  const canEdit = S.me.role === 'consultant' && !it.pending;
  el.dataset.key = String(it.id);
  el.innerHTML = `
  <div class="d-top">
    <button class="iconbtn narrow-only" data-act="back" aria-label="رجوع">${ic('back')}</button>
    <span class="ref">${it.pending ? 'جديد' : '#' + it.id}</span>
    <span class="tag">${T.type[it.type]}</span>
    <span class="tag villa-tag">فيلا ${esc(it.villa)}</span>
    <span class="grow"></span>
    ${canEdit ? `<button class="iconbtn" data-act="edit" aria-label="تعديل">${ic('edit')}</button>` : ''}
    <button class="iconbtn wide-only" data-act="back" aria-label="إغلاق">${ic('x')}</button>
  </div>
  <div class="d-body">
    <h2 class="d-title">${esc(it.title)}</h2>
    <div class="d-meta">
      ${statusBadge(it.status, true)}
      <span class="who${who.mine ? ' mine' : ''}">${ic('user')}${esc(who.t)}</span>
    </div>
    <dl class="facts">
      <div><dt>الاستحقاق</dt><dd class="due ${due.cls}">${esc(due.t)}${it.due_date && it.status !== 'closed' ? ` <small>(${fmtDate.format(dd(it.due_date))})</small>` : ''}</dd></div>
      <div><dt>الأولوية</dt><dd class="${it.priority === 'critical' ? 'crit' : ''}">${it.priority === 'critical' ? ic('alert') : ''}${T.prio[it.priority]}</dd></div>
      ${it.return_count ? `<div><dt>مرات الإعادة</dt><dd class="warn">${it.return_count}</dd></div>` : ''}
      ${it.external_ref ? `<div><dt>المرجع</dt><dd>${ic('link')}${esc(it.external_ref)}</dd></div>` : ''}
    </dl>
    ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ''}
    <h3 class="tl-h">السجل</h3>
    ${evs === undefined || evs === null ? `<p class="muted">${ic('sync', 'spin')} جارٍ التحميل…</p>`
      : `<ol class="tl">${evs.map(e => eventHTML(e)).join('')}${pend.map(e => eventHTML(e, true)).join('')}</ol>`}
  </div>
  <div class="d-actions n${acts.length}">
    ${acts.map(([a, t, i, c]) => `<button class="btn ${c}" data-act="act" data-a="${a}">${ic(i)}${t}</button>`).join('')}
  </div>`;
  if (sameItem) el.querySelector('.d-body').scrollTop = scroll;
  hydratePhotos(el);
  if (!it.pending && unread(it)) markRead(it);
}

async function hydratePhotos(root) {
  const imgs = [...root.querySelectorAll('img[data-path]')];
  if (!imgs.length) return;
  try {
    const urls = await api.urls([...new Set(imgs.map(i => i.dataset.path))]);
    for (const i of imgs) if (urls[i.dataset.path]) { i.src = urls[i.dataset.path]; i.closest('.ph').dataset.src = urls[i.dataset.path]; }
  } catch { imgs.forEach(i => i.closest('.ph').classList.add('noimg')); }
}

function markRead(it) {
  S.reads.set(it.id, it.updated_at);
  api.markRead(it.id, S.me.id, it.updated_at).catch(() => {});
  renderChips(); renderList();
}

// ---------- النوافذ (Sheets) ----------
function openSheet(sheet) {
  const replacing = !!S.sheet;
  S.sheet = sheet;
  if (!replacing) history.pushState({ layer: 'sheet' }, '');
  renderSheet();
}
function closeSheet() { if (S.sheet) history.back(); }

function photoPicker(sheet, label = 'صورة') {
  return `
  <div class="pick">
    <label class="btn ghost">${ic('camera')}${label}<input type="file" accept="image/*" capture="environment" data-photos hidden></label>
    <label class="btn ghost icon-only" aria-label="من الألبوم">${ic('image')}<input type="file" accept="image/*" multiple data-photos hidden></label>
    <div class="thumbs">${(sheet.photos || []).map((p, i) => `
      <span class="thumb"><img src="${p.url}" alt=""><button type="button" data-act="rm-photo" data-i="${i}" aria-label="حذف">${ic('x')}</button></span>`).join('')}
      ${sheet.busy ? `<span class="thumb busy">${ic('sync', 'spin')}</span>` : ''}</div>
  </div>`;
}

function seg(name, opts, val) {
  return `<div class="seg" role="radiogroup">${opts.map(([v, t, i]) => `
    <label class="${val === v ? 'on' : ''}"><input type="radio" name="${name}" value="${v}" ${val === v ? 'checked' : ''}>${i ? ic(i) : ''}${t}</label>`).join('')}</div>`;
}

function recentVillas() {
  const seen = []; for (const it of allItems().sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))) {
    if (!seen.includes(it.villa)) seen.push(it.villa); if (seen.length >= 6) break; }
  return seen;
}

function renderSheet() {
  const root = $('#sheet'); if (!root) return;
  const s = S.sheet;
  if (!s) { root.innerHTML = ''; document.body.classList.remove('sheet-open'); return; }
  document.body.classList.add('sheet-open');
  // احفظ ما كتبه المستخدم قبل إعادة الرسم (مثلًا بعد إضافة صورة)
  const form = root.querySelector('form.sheet-form');
  if (form && form.dataset.sk === s.kind) {
    const v = readForm(form);
    if (s.data) { Object.assign(s.data, v); s.data.open = !!form.querySelector('details')?.open; }
    if ('body' in v) s.body = v.body;
  }
  let inner = '';
  if (s.kind === 'add') inner = addSheet(s);
  else if (s.kind === 'action') inner = actionSheet(s);
  else if (s.kind === 'edit') inner = editSheet(s);
  else if (s.kind === 'filter') inner = filterSheet();
  else if (s.kind === 'more') inner = moreSheet();
  else if (s.kind === 'photo') {
    root.innerHTML = `<div class="lightbox" data-act="close-sheet"><img src="${esc(s.src)}" alt="صورة"><button class="iconbtn" aria-label="إغلاق">${ic('x')}</button></div>`;
    return;
  }
  const keepScroll = root.querySelector('.sheet-body')?.scrollTop || 0;
  const focusName = document.activeElement?.name;
  root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
  const b = root.querySelector('.sheet-body'); if (b) b.scrollTop = keepScroll;
  if (focusName) root.querySelector(`[name="${focusName}"]`)?.focus();
  else if (s.autofocus) setTimeout(() => root.querySelector(s.autofocus)?.focus(), 60);
}

const sheetHead = (title, extra = '') =>
  `<div class="sheet-h"><h2>${title}</h2>${extra}<button type="button" class="iconbtn" data-act="close-sheet" aria-label="إغلاق">${ic('x')}</button></div>`;

function addSheet(s) {
  const R = S.me.role, d = s.data;
  const types = R === 'consultant' ? seg('type', [['observation', 'ملاحظة فنية', 'flag'], ['request', 'عمل مطلوب', 'chat']], d.type)
    : `<div class="fixed-type">${ic('checkc')}طلب فحص <small>يُرسل للاستشاري للمعاينة والاستلام</small></div>`;
  return `
  <form id="add-form" class="sheet-form" data-sk="add">
    ${sheetHead(R === 'consultant' ? 'بند جديد' : 'طلب فحص جديد')}
    <div class="sheet-body">
      ${types}
      <label class="lbl">رقم الفيلا / الموقع
        <input name="villa" value="${esc(d.villa)}" required maxlength="40" inputmode="text" autocomplete="off" placeholder="مثال: 169">
      </label>
      <div class="quick">${recentVillas().map(v => `<button type="button" class="qv${d.villa === v ? ' on' : ''}" data-act="qv" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
      <label class="lbl">العنوان
        <input name="title" value="${esc(d.title)}" required minlength="2" maxlength="200" autocomplete="off" placeholder="${R === 'consultant' ? 'مثال: إزالة الصخور قبل طبقة الدفان التالية' : 'مثال: الدفان حول الخزان جاهز للاستلام'}">
      </label>
      ${photoPicker(s, R === 'consultant' ? 'صورة' : 'صورة الوضع')}
      <details class="more"${d.open ? ' open' : ''}>
        <summary>تفاصيل إضافية <small>${T.prio[d.priority]} · ${d.due ? fmtDate.format(dd(d.due)) : 'بدون موعد'}</small></summary>
        <label class="lbl">الوصف<textarea name="description" rows="3" maxlength="4000" placeholder="اختياري">${esc(d.description)}</textarea></label>
        <div class="lbl">الأولوية ${seg('priority', [['critical', 'حرجة', 'alert'], ['normal', 'عادية', ''], ['low', 'منخفضة', '']], d.priority)}</div>
        <div class="row2">
          <label class="lbl">الاستحقاق<input name="due" type="date" value="${esc(d.due)}"></label>
          <label class="lbl">مرجع WIR / NCR<input name="external_ref" value="${esc(d.external_ref)}" maxlength="60" dir="ltr" placeholder="اختياري"></label>
        </div>
      </details>
    </div>
    <div class="sheet-f"><button class="btn primary block" type="submit"${s.busy ? ' disabled' : ''}>${ic('check')}حفظ</button></div>
  </form>`;
}

const ACT = {
  comment: { title: 'رد', ph: 'اكتب ردك…', need: 'any', btn: 'إرسال', icon: 'send', photo: 'صورة' },
  submit: { title: 'الإجراء المنفذ', ph: 'ماذا تم تنفيذه؟', need: 'any', btn: 'إرسال للمراجعة', icon: 'send', photo: 'صورة بعد المعالجة' },
  close: { title: 'قبول وإغلاق البند', ph: 'ملاحظة (اختياري)', need: 'none', btn: 'اعتماد وإغلاق', icon: 'check', photo: 'صورة' },
  return: { title: 'إعادة للمعالجة', ph: 'سبب الإعادة (مطلوب)', need: 'text', btn: 'إعادة للمقاول', icon: 'undo', photo: 'صورة' },
  hold: { title: 'إيقاف البند', ph: 'سبب الإيقاف (مطلوب)', need: 'text', btn: 'إيقاف', icon: 'pause' },
  resume: { title: 'استئناف البند', ph: 'ملاحظة (اختياري)', need: 'none', btn: 'استئناف', icon: 'play' },
  reopen: { title: 'إعادة فتح البند', ph: 'سبب إعادة الفتح (مطلوب)', need: 'text', btn: 'إعادة فتح', icon: 'undo' },
};
function actionSheet(s) {
  const c = ACT[s.a], it = getItem(s.key);
  return `
  <form id="action-form" class="sheet-form" data-sk="action">
    ${sheetHead(c.title)}
    <div class="sheet-body">
      <p class="ctx"><b>فيلا ${esc(it?.villa)}</b> · ${esc(it?.title)}</p>
      <textarea name="body" rows="3" maxlength="4000" placeholder="${c.ph}"${c.need === 'text' ? ' required' : ''}>${esc(s.body || '')}</textarea>
      ${c.photo ? photoPicker(s, c.photo) : ''}
    </div>
    <div class="sheet-f"><button class="btn ${s.a === 'return' ? 'warn' : 'primary'} block" type="submit"${s.busy ? ' disabled' : ''}>${ic(c.icon)}${c.btn}</button></div>
  </form>`;
}

function editSheet(s) {
  const d = s.data;
  return `
  <form id="edit-form" class="sheet-form" data-sk="edit">
    ${sheetHead('تعديل البند')}
    <div class="sheet-body">
      <label class="lbl">رقم الفيلا / الموقع<input name="villa" value="${esc(d.villa)}" required maxlength="40"></label>
      <label class="lbl">العنوان<input name="title" value="${esc(d.title)}" required minlength="2" maxlength="200"></label>
      <label class="lbl">الوصف<textarea name="description" rows="3" maxlength="4000">${esc(d.description)}</textarea></label>
      <div class="lbl">الأولوية ${seg('priority', [['critical', 'حرجة', 'alert'], ['normal', 'عادية', ''], ['low', 'منخفضة', '']], d.priority)}</div>
      <div class="row2">
        <label class="lbl">الاستحقاق<input name="due_date" type="date" value="${esc(d.due_date || '')}"></label>
        <label class="lbl">مرجع WIR / NCR<input name="external_ref" value="${esc(d.external_ref || '')}" maxlength="60" dir="ltr"></label>
      </div>
      <p class="hint">كل تعديل يُسجَّل في سجل البند باسمك.</p>
    </div>
    <div class="sheet-f"><button class="btn primary block" type="submit"${s.busy ? ' disabled' : ''}>${ic('check')}حفظ التعديل</button></div>
  </form>`;
}

function filterSheet() {
  const f = S.f;
  const opt = (k, v, t) => `<button type="button" class="opt${f[k] === v ? ' on' : ''}" data-act="fset" data-k="${k}" data-v="${v}">${t}</button>`;
  return `
  ${sheetHead('تصفية')}
  <div class="sheet-body">
    <div class="fgroup"><h3>الحالة</h3><div class="opts">
      ${opt('status', 'active', 'النشطة')}${opt('status', 'open', 'مفتوح')}${opt('status', 'review', 'بانتظار المراجعة')}${opt('status', 'hold', 'متوقف')}${opt('status', 'closed', 'مغلق')}${opt('status', '', 'الكل')}
    </div></div>
    <div class="fgroup"><h3>النوع</h3><div class="opts">
      ${opt('type', '', 'الكل')}${opt('type', 'observation', 'ملاحظة فنية')}${opt('type', 'request', 'عمل مطلوب')}${opt('type', 'inspection', 'طلب فحص')}
    </div></div>
    <div class="fgroup"><h3>الأولوية</h3><div class="opts">
      ${opt('prio', '', 'الكل')}${opt('prio', 'critical', 'حرجة')}${opt('prio', 'normal', 'عادية')}${opt('prio', 'low', 'منخفضة')}
    </div></div>
  </div>
  <div class="sheet-f two"><button class="btn ghost" data-act="clear-all">إعادة الضبط</button><button class="btn primary" data-act="close-sheet">عرض ${visible().length} بند</button></div>`;
}

let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

function moreSheet() {
  const n = S.outbox.length;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `
  ${sheetHead('حسابي')}
  <div class="sheet-body">
    <div class="me"><div class="avatar">${esc((S.me.full_name || '؟').replace(/^م\.\s*/, '').slice(0, 1))}</div>
      <div><b>${esc(S.me.full_name)}</b><small>${T.role[S.me.role]} · ${esc(S.project.name)}</small></div></div>
    <div class="syncbox ${!S.online ? 'off' : n ? 'busy' : 'ok'}">
      ${ic(!S.online ? 'cloudoff' : n ? 'sync' : 'cloud')}
      <div><b>${!S.online ? 'بدون اتصال' : n ? 'جارٍ الإرسال' : 'كل شيء متزامن'}</b>
      <small>${n ? `${n} عملية محفوظة على الجهاز وستُرسل تلقائيًا` : LIVE ? 'البيانات محفوظة في السحابة' : 'وضع تجريبي — البيانات على هذا الجهاز فقط'}</small></div>
      ${n && S.online ? `<button class="btn ghost sm" data-act="flush">إرسال الآن</button>` : ''}
    </div>
    <div class="menu">
      <button data-act="export">${ic('download')}<span>تصدير Excel <small>البنود المعروضة حاليًا</small></span></button>
      <button data-act="print">${ic('print')}<span>طباعة / PDF <small>تقرير بالبنود المعروضة</small></span></button>
      ${!standalone() ? `<button data-act="install">${ic('phone')}<span>تثبيت على الجوال <small>${installEvt ? 'كتطبيق على الشاشة الرئيسية' : ios ? 'من زر المشاركة ← إضافة إلى الشاشة الرئيسية' : 'من قائمة المتصفح ← تثبيت التطبيق'}</small></span></button>` : ''}
      ${!LIVE ? `<button data-act="switch-role">${ic('swap')}<span>التبديل إلى ${S.me.role === 'consultant' ? 'المقاول' : 'الاستشاري'} <small>للتجربة فقط</small></span></button>
        <button data-act="reset-demo">${ic('undo')}<span>إعادة البيانات التجريبية</span></button>` : ''}
      <button data-act="logout" class="danger">${ic('logout')}<span>تسجيل الخروج</span></button>
    </div>
  </div>`;
}

// ---------- إشعار ----------
let toastT = 0;
function toast(msg, kind = '') {
  const el = $('#toast'); if (!el) return;
  el.className = 'show ' + kind; el.textContent = msg;
  clearTimeout(toastT); toastT = setTimeout(() => (el.className = ''), 3800);
}

// ============================================================
//  الإجراءات
// ============================================================
function openItem(key) {
  const k = /^\d+$/.test(key) ? +key : key;
  const had = S.sel != null;
  S.sel = k;
  if (!had) history.pushState({ layer: 'detail' }, '');
  renderList(); renderDetail();
}
function closeItem() { if (S.sel != null) history.back(); }

window.addEventListener('popstate', () => {
  if (S.sheet) { S.sheet = null; renderSheet(); return; }
  if (S.sel != null) { S.sel = null; renderList(); renderDetail(); }
});

function newAddData() {
  return { type: 'observation', villa: S.f.villa || '', title: '', description: '', priority: 'normal', due: addDays(3), external_ref: '', open: false };
}

async function addPhotos(files) {
  const s = S.sheet; if (!s) return;
  s.photos ||= [];
  const list = [...files].slice(0, 8 - s.photos.length);
  if (!list.length) return toast('الحد الأقصى 8 صور');
  s.busy = true; renderSheet();
  for (const f of list) {
    try { const blob = await compressImage(f); if (blob) s.photos.push({ blob, url: URL.createObjectURL(blob) }); }
    catch { toast('تعذّر قراءة الصورة', 'err'); }
  }
  s.busy = false; renderSheet();
}

function readForm(form) { return Object.fromEntries(new FormData(form).entries()); }

async function submitAdd(form) {
  const s = S.sheet, v = readForm(form);
  const type = S.me.role === 'contractor' ? 'inspection' : (v.type || 'observation');
  const villa = toLatin(v.villa || '').trim(), title = (v.title || '').trim();
  if (!villa) return toast('اكتب رقم الفيلا', 'err');
  if (title.length < 2) return toast('اكتب عنوانًا مختصرًا', 'err');
  const photos = s.photos || [];
  const op = await enqueue({
    kind: 'create',
    params: { p_project: S.project.id, p_type: type, p_villa: villa, p_title: title, p_description: (v.description || '').trim(),
      p_priority: v.priority || s.data.priority || 'normal', p_due: v.due || null, p_external_ref: (v.external_ref || '').trim() || null },
    photoPaths: photos.map(() => `${S.project.id}/${uuid()}.jpg`), blobs: photos.map(p => p.blob),
  });
  closeSheet();
  if (!S.online) toast('حُفظ على الجهاز — سيُرسل تلقائيًا عند عودة الاتصال');
  else toast('تمت الإضافة', 'ok');
  if (matchMedia('(min-width: 900px)').matches) setTimeout(() => openItem('c:' + op.client_id), 200);
}

async function submitAction(form) {
  const s = S.sheet, it = getItem(s.key), c = ACT[s.a];
  if (!it) return;
  const body = (readForm(form).body || '').trim(), photos = s.photos || [];
  if (c.need === 'text' && !body) return toast('السبب مطلوب', 'err');
  if (c.need === 'any' && !body && !photos.length) return toast(s.a === 'submit' ? 'اكتب الإجراء المنفذ أو أرفق صورة' : 'اكتب ردًا أو أرفق صورة', 'err');
  await enqueue({
    kind: 'action', itemRef: it.pending ? { client_id: it.client_id } : { id: it.id },
    params: { p_action: s.a, p_body: body },
    photoPaths: photos.map(() => `${S.project.id}/${uuid()}.jpg`), blobs: photos.map(p => p.blob),
  });
  closeSheet();
  if (!S.online) toast('حُفظ على الجهاز — سيُرسل عند عودة الاتصال');
}

async function submitEdit(form) {
  const s = S.sheet, v = readForm(form);
  const fields = { villa: toLatin(v.villa).trim(), title: v.title.trim(), description: v.description.trim(),
    priority: v.priority, due_date: v.due_date || null, external_ref: (v.external_ref || '').trim() || null };
  s.busy = true; renderSheet();
  try {
    const it = await api.edit(s.id, fields);
    upsertItem(it); S.events.delete(it.id);
    closeSheet(); toast('تم حفظ التعديل', 'ok');
  } catch (e) {
    s.busy = false; renderSheet();
    toast(e.network ? 'التعديل يحتاج اتصالًا بالإنترنت' : e.message, 'err');
  }
}

function rowsForExport() {
  return visible().map(it => ({
    'الرقم': it.pending ? '' : it.id, 'النوع': T.type[it.type], 'الفيلا': it.villa, 'العنوان': it.title,
    'الوصف': it.description || '', 'الأولوية': T.prio[it.priority], 'الحالة': T.status[it.status],
    'عند': it.status === 'open' ? 'المقاول' : it.status === 'review' ? 'الاستشاري' : '',
    'الاستحقاق': it.due_date || '', 'متأخر': overdue(it) ? 'نعم' : '', 'مرات الإعادة': it.return_count || 0,
    'المرجع': it.external_ref || '', 'تاريخ الإنشاء': (it.created_at || '').slice(0, 10), 'تاريخ الإغلاق': (it.closed_at || '').slice(0, 10),
  }));
}
function exportCSV() {
  const rows = rowsForExport();
  if (!rows.length) return toast('لا توجد بنود للتصدير');
  const cols = Object.keys(rows[0]);
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '﻿' + [cols.map(q).join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `jenan-${today()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function printReport() {
  const rows = visible();
  $('#print').innerHTML = `
    <h1>${esc(S.project.name)} — سجل التنسيق</h1>
    <p>${esc(new Intl.DateTimeFormat('ar-u-nu-latn-ca-gregory', { dateStyle: 'full' }).format(new Date()))} · ${rows.length} بند · أعدّه ${esc(S.me.full_name)}</p>
    <table><thead><tr><th>#</th><th>الفيلا</th><th>العنوان</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>عند</th><th>الاستحقاق</th></tr></thead>
    <tbody>${rows.map(it => `<tr class="${overdue(it) ? 'late' : ''}"><td>${it.pending ? '' : it.id}</td><td>${esc(it.villa)}</td><td>${esc(it.title)}</td>
      <td>${T.typeShort[it.type]}</td><td>${T.prio[it.priority]}</td><td>${T.status[it.status]}</td>
      <td>${it.status === 'open' ? 'المقاول' : it.status === 'review' ? 'الاستشاري' : '—'}</td>
      <td>${esc(it.due_date || '—')}${overdue(it) ? ' (متأخر)' : ''}</td></tr>`).join('')}</tbody></table>`;
  closeSheet();
  setTimeout(() => window.print(), 300);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  switch (a) {
    case 'demo-login': await api.signIn(b.dataset.role); start(); break;
    case 'open': openItem(b.dataset.key); break;
    case 'back': closeItem(); break;
    case 'view':
      S.view = b.dataset.view;
      if (S.view === 'home' && S.sel != null && !matchMedia('(min-width: 900px)').matches) closeItem();
      renderList(); break;
    case 'pick-villa': S.f.villa = b.dataset.v; S.f.chip = null; S.view = 'home'; renderAll(); break;
    case 'chip': S.f.chip = S.f.chip === b.dataset.k ? null : b.dataset.k; if (S.view !== 'home') S.view = 'home'; renderChips(); renderList(); break;
    case 'clear': if (b.dataset.k === 'status') S.f.status = 'active'; else S.f[b.dataset.k] = ''; renderList(); break;
    case 'clear-all':
      Object.assign(S.f, { chip: null, q: '', villa: '', type: '', status: 'active', prio: '' });
      if ($('#q')) $('#q').value = '';
      if (S.sheet?.kind === 'filter') closeSheet();
      renderAll(); break;
    case 'add': openSheet({ kind: 'add', data: newAddData(), photos: [], autofocus: S.f.villa ? '[name=title]' : '[name=villa]' }); break;
    case 'qv': {
      const f = $('#add-form'); if (!f) break;
      f.querySelector('[name=villa]').value = b.dataset.v;
      renderSheet(); $('#add-form [name=title]')?.focus(); break;
    }
    case 'rm-photo': S.sheet.photos.splice(+b.dataset.i, 1); renderSheet(); break;
    case 'act': openSheet({ kind: 'action', a: b.dataset.a, key: S.sel, photos: [], autofocus: 'textarea' }); break;
    case 'edit': { const it = getItem(S.sel); openSheet({ kind: 'edit', id: it.id, data: { ...it } }); break; }
    case 'filter': openSheet({ kind: 'filter' }); break;
    case 'fset': S.f[b.dataset.k] = b.dataset.v; S.f.chip = null; renderSheet(); renderList(); break;
    case 'more': openSheet({ kind: 'more' }); break;
    case 'close-sheet': if (e.target === b || b.tagName === 'BUTTON' || b.classList.contains('lightbox')) closeSheet(); break;
    case 'photo': if (b.dataset.src) openSheet({ kind: 'photo', src: b.dataset.src }); break;
    case 'flush': flush(); break;
    case 'export': exportCSV(); break;
    case 'print': printReport(); break;
    case 'install':
      if (installEvt) { installEvt.prompt(); installEvt = null; closeSheet(); }
      else toast('من قائمة المتصفح اختر: إضافة إلى الشاشة الرئيسية'); break;
    case 'switch-role':
      await api.signIn(S.me.role === 'consultant' ? 'contractor' : 'consultant');
      S.sheet = null; history.replaceState(null, ''); location.reload(); break;
    case 'reset-demo':
      if (b.dataset.armed) { api.resetDemo(); location.reload(); }
      else { b.dataset.armed = '1'; b.querySelector('span').textContent = 'اضغط مرة أخرى للتأكيد'; }
      break;
    case 'logout': if (S.outbox.length && !confirm('توجد عمليات لم تُرسل بعد. الخروج الآن قد يؤخر إرسالها. متابعة؟')) break;
      await api.signOut(); location.reload(); break;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('input[data-photos]')) { if (t.files?.length) addPhotos(t.files); t.value = ''; return; }
  if (t.name && S.sheet && ['add', 'edit'].includes(S.sheet.kind) && t.type === 'radio') {
    const due = t.form.querySelector('[name=due]');
    if (S.sheet.kind === 'add' && t.name === 'priority' && t.value === 'critical' && due && (!due.value || due.value > addDays(1))) due.value = addDays(1);
    renderSheet();
  }
});
document.addEventListener('toggle', e => { if (e.target.matches?.('details.more') && S.sheet?.data) S.sheet.data.open = e.target.open; }, true);

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'login-form') {
    const v = readForm(f), btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'جارٍ الدخول…';
    try { await api.signIn(v.email.trim(), v.password); start(); }
    catch (err) { renderLogin(err.network ? 'لا يوجد اتصال بالإنترنت' : err.message); }
  }
  if (f.id === 'add-form') submitAdd(f);
  if (f.id === 'action-form') submitAction(f);
  if (f.id === 'edit-form') submitEdit(f);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (S.sheet) closeSheet(); else if (S.sel != null) closeItem(); } });

// ============================================================
//  البيانات والمزامنة
// ============================================================
function upsertItem(it) {
  if (!it || !it.id) return;
  const prev = S.items.get(it.id);
  if (prev && Date.parse(prev.updated_at) > Date.parse(it.updated_at)) return;
  S.items.set(it.id, it);
  if (typeof S.sel === 'string' && it.client_id && S.sel === 'c:' + it.client_id) S.sel = it.id;
  saveCache();
}

on((type, data) => {
  if (!S.me) return;
  if (type === 'outbox') { S.outbox = data; renderAll(); }
  if (type === 'sent') {
    upsertItem(data.item);
    if (data.op.kind === 'action') { S.events.delete(data.item.id); }
    renderAll();
  }
  if (type === 'failed') { toast('لم يُحفظ: ' + data.message, 'err'); refreshItems(); }
  if (type === 'realtime') {
    const was = S.rt; S.rt = data;
    if (data === 'SUBSCRIBED' && was && was !== 'SUBSCRIBED') refreshItems();
  }
});

function onRemoteItem(it) {
  upsertItem(it);
  const sel = getItem(S.sel);
  if (sel && sel.id === it.id) { if (it.last_actor !== S.me.id) markRead(it); }
  renderAll();
}
function onRemoteEvent(ev) {
  const list = S.events.get(ev.item_id);
  if (Array.isArray(list) && !list.some(x => x.id === ev.id)) list.push(ev);
  const sel = getItem(S.sel);
  if (sel && sel.id === ev.item_id) renderDetail();
}

const CACHE = () => 'jenan.cache.' + (LIVE ? 'live.' : 'demo.') + S.me?.id;
let cacheT = 0;
function saveCache() {
  clearTimeout(cacheT);
  cacheT = setTimeout(() => {
    try { localStorage.setItem(CACHE(), JSON.stringify({ me: S.me, project: S.project, profiles: Object.values(S.profiles),
      items: [...S.items.values()], reads: [...S.reads.entries()] })); } catch {}
  }, 400);
}
function loadCache(userId) {
  try { return JSON.parse(localStorage.getItem('jenan.cache.' + (LIVE ? 'live.' : 'demo.') + userId)); } catch { return null; }
}

let lastRefresh = 0;
async function refreshItems() {
  lastRefresh = Date.now();
  try {
    const [items, reads] = await Promise.all([api.fetchItems(S.project.id), api.fetchReads()]);
    S.items = new Map(items.map(i => [i.id, i]));
    S.reads = new Map(reads.map(r => [r.item_id, r.seen_at]));
    S.loaded = true;
    const sel = getItem(S.sel); if (sel && !sel.pending) S.events.delete(sel.id);
    S.events = new Map([...S.events].filter(([id]) => sel && id === sel.id));
    saveCache(); renderAll();
  } catch (e) {
    S.loaded = true; renderAll();
    if (!e.network) toast(e.message, 'err');
  }
}

window.addEventListener('online', () => { S.online = true; renderSync(); if (S.me) { flush(); refreshItems(); } });
window.addEventListener('offline', () => { S.online = false; renderSync(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.me && Date.now() - lastRefresh > 15000) { flush(); refreshItems(); }
});

let unsub = null;
async function start() {
  renderBoot();
  try { await api.init(); }
  catch { return renderBoot('تعذّر تحميل المنصة — تحقق من الاتصال ثم أعد فتح الصفحة'); }
  const sess = await api.session().catch(() => null);
  if (!sess) return renderLogin();
  let boot;
  try { boot = await api.bootstrap(sess.userId); }
  catch (e) {
    const c = e.network ? loadCache(sess.userId) : null;
    if (c) { boot = c; }
    else if (e.network) return renderBoot('لا يوجد اتصال بالإنترنت. افتح المنصة مرة واحدة على الأقل وأنت متصل.');
    else { await api.signOut().catch(() => {}); return renderLogin(e.message); }
  }
  S.me = boot.me; S.project = boot.project;
  S.profiles = Object.fromEntries((boot.profiles || []).map(p => [p.id, p]));
  const cached = loadCache(S.me.id);
  if (cached?.items) {
    S.items = new Map(cached.items.map(i => [i.id, i]));
    S.reads = new Map(cached.reads || []);
    S.loaded = true;
  }
  S.outbox = await pendingOps();
  document.body.className = 'role-' + S.me.role;
  renderShell();
  await refreshItems();
  unsub && unsub();
  unsub = api.subscribe(S.project.id, onRemoteItem, onRemoteEvent);
  flush();
}

if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
  navigator.serviceWorker?.register('./sw.js').catch(() => {});
}
start();
