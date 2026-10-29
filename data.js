// طبقة البيانات: Supabase (الوضع الفعلي) أو تخزين محلي (الوضع التجريبي)
// + طابور إرسال يعمل بدون إنترنت (IndexedDB)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// ---------- أحداث داخلية ----------
const listeners = new Set();
export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(type, data) { for (const f of listeners) { try { f(type, data); } catch (e) { console.error(e); } } }

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

function netErr(msg) {
  const e = new Error(msg || 'لا يوجد اتصال');
  e.network = true; return e;
}
function isNetMessage(m) { return /fetch|network|load failed|timed? ?out|offline|ECONN|503|502|504/i.test(m || ''); }
function fail(error) {
  const msg = error?.message || String(error);
  if (!navigator.onLine || isNetMessage(msg)) throw netErr(msg);
  throw new Error(msg);
}

// ============================================================
//  الوضع الفعلي: Supabase
// ============================================================
function liveApi() {
  let sb = null;
  const urlCache = new Map(); // path -> {url, exp}

  const api = {
    mode: 'live',
    async init() {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jenan.auth' },
      });
    },
    async session() {
      const { data } = await sb.auth.getSession();
      return data.session ? { userId: data.session.user.id, email: data.session.user.email } : null;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid/i.test(error.message)) throw new Error('البريد أو كلمة المرور غير صحيحة');
        fail(error);
      }
      return { userId: data.user.id, email: data.user.email };
    },
    async signOut() { await sb.auth.signOut(); },
    async bootstrap(userId) {
      const me = await sb.from('profiles').select('id, full_name, role').eq('id', userId).maybeSingle();
      if (me.error) fail(me.error);
      if (!me.data || !me.data.role) throw new Error('حسابك لم يُفعَّل بعد. اطلب من مدير المنصة إضافتك للمشروع.');
      const pj = await sb.from('projects').select('id, name').order('created_at').limit(1).maybeSingle();
      if (pj.error) fail(pj.error);
      if (!pj.data) throw new Error('لست عضوًا في أي مشروع بعد.');
      const pr = await sb.from('profiles').select('id, full_name, role');
      if (pr.error) fail(pr.error);
      return { me: me.data, project: pj.data, profiles: pr.data };
    },
    async fetchItems(projectId) {
      const { data, error } = await sb.from('items').select('*')
        .eq('project_id', projectId).order('updated_at', { ascending: false }).limit(5000);
      if (error) fail(error);
      return data;
    },
    async fetchReads() {
      const { data, error } = await sb.from('item_reads').select('item_id, seen_at');
      if (error) fail(error);
      return data;
    },
    async fetchEvents(itemId) {
      const { data, error } = await sb.from('item_events').select('*')
        .eq('item_id', itemId).order('created_at');
      if (error) fail(error);
      return data;
    },
    async createItem(p) {
      const { data, error } = await sb.rpc('create_item', p);
      if (error) fail(error);
      return data;
    },
    async action(p) {
      const { data, error } = await sb.rpc('item_action', p);
      if (error) fail(error);
      return data;
    },
    async edit(id, fields) {
      const { data, error } = await sb.from('items').update(fields).eq('id', id).select().single();
      if (error) fail(error);
      return data;
    },
    async upload(path, blob) {
      net();
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error && !/exists|duplicate|409/i.test(error.message + (error.statusCode || ''))) fail(error);
    },
    async urls(paths) {
      const now = Date.now(), out = {}, need = [];
      for (const p of paths) {
        const c = urlCache.get(p);
        if (c && c.exp > now) out[p] = c.url; else need.push(p);
      }
      if (need.length) {
        const { data, error } = await sb.storage.from('photos').createSignedUrls(need, 3600);
        if (error) fail(error);
        for (const r of data || []) if (r.signedUrl) {
          urlCache.set(r.path, { url: r.signedUrl, exp: now + 50 * 60 * 1000 });
          out[r.path] = r.signedUrl;
        }
      }
      return out;
    },
    async markRead(itemId, userId, seenAt) {
      await sb.from('item_reads').upsert({ user_id: userId, item_id: itemId, seen_at: seenAt });
    },
    subscribe(projectId, onItem, onEvent) {
      const ch = sb.channel('jenan-' + projectId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `project_id=eq.${projectId}` },
          p => p.new && p.new.id && onItem(p.new))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'item_events', filter: `project_id=eq.${projectId}` },
          p => p.new && onEvent(p.new))
        .subscribe(status => emit('realtime', status));
      return () => sb.removeChannel(ch);
    },
  };
  return api;
}

// ============================================================
//  الوضع التجريبي: كل شيء على هذا الجهاز، والتبويبات تتزامن معًا
// ============================================================
function demoApi() {
  const KEY = 'jenan.demo.v1';
  const PROJECT = { id: '00000000-0000-4000-8000-000000000001', name: 'مشروع جنان (تجريبي)' };
  const PROFILES = [
    { id: 'demo-consultant', full_name: 'م. الاستشاري', role: 'consultant' },
    { id: 'demo-contractor', full_name: 'م. المقاول', role: 'contractor' },
  ];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('jenan-demo') : null;
  let db = load();

  function day(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function ago(h) { return new Date(Date.now() - h * 3600e3).toISOString(); }
  function seed() {
    const C = 'demo-consultant', K = 'demo-contractor';
    const items = [
      [169, 'observation', 'إزالة الصخور الكبيرة قبل استكمال طبقة الدفان التالية', 'critical', 'open', -2, C, 30],
      [169, 'inspection', 'دفان حول الخزان جاهز للاستلام — الطبقة الثالثة', 'normal', 'review', 0, K, 3],
      [172, 'request', 'تقديم تقارير اختبارات الخرسانة لصبة السقف الأول', 'normal', 'open', 2, C, 50],
      [158, 'observation', 'تسرب في عزل الحمام — المعالجة قبل التبليط', 'critical', 'review', 1, C, 70],
      [181, 'request', 'تقرير استلام مواد الحديد للدفعة الأخيرة', 'low', 'open', 6, C, 90],
      [172, 'observation', 'تعديل غطاء الخرسانة للحديد في الأعمدة C3–C5', 'normal', 'hold', 4, C, 120],
      [160, 'observation', 'تنظيف الموقع من مخلفات الطوب حول الفيلا', 'low', 'closed', -5, C, 200],
    ];
    const out = { seq: 0, eseq: 0, items: [], events: [], reads: {} };
    for (const [villa, type, title, priority, status, due, by, h] of items) {
      const id = ++out.seq;
      const it = { id, project_id: PROJECT.id, type, villa: String(villa), title, description: '', priority, status,
        hold_reason: status === 'hold' ? 'بانتظار اعتماد المصمم الإنشائي' : null, due_date: day(due),
        external_ref: null, return_count: 0, created_by: by, created_at: ago(h), updated_at: ago(h / 3),
        last_actor: by, closed_at: status === 'closed' ? ago(h / 4) : null, closed_by: status === 'closed' ? C : null, client_id: null };
      out.items.push(it);
      out.events.push({ id: ++out.eseq, item_id: id, project_id: PROJECT.id, actor: by, kind: 'created', body: '', photos: [], meta: {}, created_at: it.created_at });
      if (status === 'review' && type !== 'inspection') {
        it.last_actor = K;
        out.events.push({ id: ++out.eseq, item_id: id, project_id: PROJECT.id, actor: K, kind: 'submitted', body: 'تمت المعالجة وإعادة العزل، مرفق اختبار الغمر.', photos: [], meta: { phase: 'after' }, created_at: it.updated_at });
      }
      if (status === 'hold') out.events.push({ id: ++out.eseq, item_id: id, project_id: PROJECT.id, actor: C, kind: 'hold', body: it.hold_reason, photos: [], meta: {}, created_at: it.updated_at });
      if (status === 'closed') out.events.push({ id: ++out.eseq, item_id: id, project_id: PROJECT.id, actor: C, kind: 'closed', body: '', photos: [], meta: {}, created_at: it.closed_at });
    }
    return out;
  }
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.items) return j; } catch {}
    const s = seed(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
  function refresh() { db = load(); }
  function me() {
    let r = null; try { r = sessionStorage.getItem('jenan.demo.role'); } catch {}
    return PROFILES.find(p => p.role === r) || null;
  }
  function E(m) { return new Error(m); }
  // محاكاة الشبكة: عند انقطاع الإنترنت تُحفظ العمليات في الطابور كما في الوضع الفعلي
  const net = () => { if (!navigator.onLine) throw netErr(); };
  const subs = [];
  function broadcast(type, data) {
    for (const s of subs) (type === 'item' ? s.onItem : s.onEvent)(structuredClone(data));
    bc && bc.postMessage({ type, data });
  }
  bc && (bc.onmessage = ({ data }) => {
    refresh();
    for (const s of subs) (data.type === 'item' ? s.onItem : s.onEvent)(data.data);
  });
  function addEvent(it, kind, body, photos, meta, client_id) {
    const ev = { id: ++db.eseq, item_id: it.id, project_id: it.project_id, actor: me().id, kind, body: body || '',
      photos: photos || [], meta: meta || {}, created_at: new Date().toISOString(), client_id: client_id || null };
    db.events.push(ev); return ev;
  }

  return {
    mode: 'demo',
    async init() {},
    async session() { const m = me(); return m ? { userId: m.id, email: m.role + '@demo' } : null; },
    async signIn(role) {
      try { sessionStorage.setItem('jenan.demo.role', role); } catch {}
      return { userId: me().id };
    },
    async signOut() { try { sessionStorage.removeItem('jenan.demo.role'); } catch {} },
    async bootstrap() { refresh(); return { me: me(), project: PROJECT, profiles: PROFILES }; },
    async fetchItems() { refresh(); return structuredClone(db.items); },
    async fetchReads() {
      const r = db.reads[me().id] || {};
      return Object.entries(r).map(([item_id, seen_at]) => ({ item_id: +item_id, seen_at }));
    },
    async fetchEvents(itemId) { refresh(); return structuredClone(db.events.filter(e => e.item_id === itemId)); },
    async createItem(p) {
      refresh();
      net();
      const m = me();
      if (p.p_client_id) { const ex = db.items.find(i => i.client_id === p.p_client_id); if (ex) return ex; }
      if (m.role === 'contractor' && p.p_type !== 'inspection') throw E('المقاول يضيف طلبات فحص فقط');
      if (m.role === 'consultant' && p.p_type === 'inspection') throw E('طلب الفحص يضيفه المقاول');
      if (!p.p_villa?.trim()) throw E('رقم الفيلا مطلوب');
      if ((p.p_title || '').trim().length < 2) throw E('العنوان قصير جدًا');
      const now = new Date().toISOString();
      const it = { id: ++db.seq, project_id: PROJECT.id, type: p.p_type, villa: p.p_villa.trim(), title: p.p_title.trim(),
        description: p.p_description || '', priority: p.p_priority || 'normal',
        status: p.p_type === 'inspection' ? 'review' : 'open', hold_reason: null, due_date: p.p_due || null,
        external_ref: p.p_external_ref || null, return_count: 0, created_by: m.id, created_at: now, updated_at: now,
        last_actor: m.id, closed_at: null, closed_by: null, client_id: p.p_client_id || null };
      db.items.push(it);
      const ev = addEvent(it, 'created', it.description, p.p_photos, { phase: 'before' });
      save(); broadcast('item', it); broadcast('event', ev);
      return structuredClone(it);
    },
    async action(p) {
      refresh();
      net();
      const m = me(), r = m.role;
      const it = db.items.find(i => i.id === p.p_item);
      if (!it) throw E('البند غير موجود');
      if (p.p_client_id && db.events.some(e => e.client_id === p.p_client_id)) return it;
      const b = (p.p_body || '').trim(), np = (p.p_photos || []).length;
      let k;
      const need = (cond, msg) => { if (!cond) throw E(msg); };
      switch (p.p_action) {
        case 'comment': need(b || np, 'اكتب ردًا أو أرفق صورة'); k = 'comment'; break;
        case 'submit': need(r === 'contractor', 'هذا الإجراء للمقاول'); need(it.status === 'open', 'البند ليس عند المقاول حاليًا');
          need(b || np, 'اكتب الإجراء المنفذ أو أرفق صورة بعد المعالجة'); it.status = 'review'; k = 'submitted'; break;
        case 'close': need(r === 'consultant', 'الإغلاق للاستشاري فقط'); need(['open', 'review'].includes(it.status), 'لا يمكن إغلاق البند في حالته الحالية');
          it.status = 'closed'; it.closed_at = new Date().toISOString(); it.closed_by = m.id; k = 'closed'; break;
        case 'return': need(r === 'consultant', 'هذا الإجراء للاستشاري'); need(it.status === 'review', 'البند ليس بانتظار المراجعة');
          need(b, 'اكتب سبب الإعادة'); it.status = 'open'; it.return_count++; k = 'returned'; break;
        case 'hold': need(r === 'consultant', 'هذا الإجراء للاستشاري'); need(['open', 'review'].includes(it.status), 'لا يمكن إيقاف البند في حالته الحالية');
          need(b, 'اكتب سبب الإيقاف'); it.status = 'hold'; it.hold_reason = b; k = 'hold'; break;
        case 'resume': need(r === 'consultant', 'هذا الإجراء للاستشاري'); need(it.status === 'hold', 'البند ليس متوقفًا');
          it.status = 'open'; it.hold_reason = null; k = 'resumed'; break;
        case 'reopen': need(r === 'consultant', 'إعادة الفتح للاستشاري فقط'); need(it.status === 'closed', 'البند ليس مغلقًا');
          need(b, 'اكتب سبب إعادة الفتح'); it.status = 'open'; it.closed_at = null; it.closed_by = null; k = 'reopened'; break;
        default: throw E('إجراء غير معروف');
      }
      it.updated_at = new Date().toISOString(); it.last_actor = m.id;
      const ev = addEvent(it, k, b, p.p_photos, k === 'submitted' ? { phase: 'after' } : {}, p.p_client_id);
      save(); broadcast('item', it); broadcast('event', ev);
      return structuredClone(it);
    },
    async edit(id, fields) {
      refresh();
      net();
      if (me().role !== 'consultant') throw E('التعديل للاستشاري فقط');
      const it = db.items.find(i => i.id === id);
      const changes = {};
      for (const [k, v] of Object.entries(fields)) if ((it[k] ?? null) !== (v ?? null)) { changes[k] = [it[k], v]; it[k] = v; }
      if (Object.keys(changes).length) {
        it.updated_at = new Date().toISOString(); it.last_actor = me().id;
        const ev = addEvent(it, 'edited', '', [], { changes });
        save(); broadcast('item', it); broadcast('event', ev);
      }
      return structuredClone(it);
    },
    async upload(path, blob) {
      const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
      try { localStorage.setItem('jenan.demo.ph.' + path, url); }
      catch { throw E('مساحة الوضع التجريبي ممتلئة — الصور في الوضع الفعلي تُحفظ في السحابة'); }
    },
    async urls(paths) {
      const out = {};
      for (const p of paths) { const u = localStorage.getItem('jenan.demo.ph.' + p); if (u) out[p] = u; }
      return out;
    },
    async markRead(itemId, userId, seenAt) {
      refresh();
      (db.reads[userId] ||= {})[itemId] = seenAt; save();
    },
    subscribe(projectId, onItem, onEvent) {
      const s = { onItem, onEvent }; subs.push(s);
      setTimeout(() => emit('realtime', 'SUBSCRIBED'), 50);
      return () => subs.splice(subs.indexOf(s), 1);
    },
    resetDemo() { localStorage.removeItem(KEY); Object.keys(localStorage).filter(k => k.startsWith('jenan.demo.ph.')).forEach(k => localStorage.removeItem(k)); },
  };
}

export const api = LIVE ? liveApi() : demoApi();

// ============================================================
//  طابور الإرسال (يعمل بدون إنترنت)
// ============================================================
const IDB = 'jenan-outbox', STORE = 'ops';
let idbP = null;
function idb() {
  return idbP ||= new Promise((res, rej) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'qid' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}
const idbPut = op => idbDo('readwrite', s => s.put(op));
const idbDel = qid => idbDo('readwrite', s => s.delete(qid));
const idbAll = () => idbDo('readonly', s => s.getAll());

const ID_MAP_KEY = 'jenan.idmap';
let idMap = {};
try { idMap = JSON.parse(localStorage.getItem(ID_MAP_KEY)) || {}; } catch {}
function rememberId(cid, id) {
  idMap[cid] = id;
  const keys = Object.keys(idMap); if (keys.length > 300) delete idMap[keys[0]];
  try { localStorage.setItem(ID_MAP_KEY, JSON.stringify(idMap)); } catch {}
}
export function serverIdFor(cid) { return idMap[cid]; }

let seq = 0;
export async function enqueue(op) {
  op.qid = String(Date.now()).padStart(15, '0') + '-' + String(seq++).padStart(4, '0');
  op.client_id ||= uuid();
  op.created_at = new Date().toISOString();
  await idbPut(op);
  emit('outbox', await pendingOps());
  flush();
  return op;
}
export async function pendingOps() {
  try { return (await idbAll()).sort((a, b) => (a.qid < b.qid ? -1 : 1)); } catch { return []; }
}

async function runOp(op) {
  for (let i = 0; i < (op.blobs || []).length; i++) await api.upload(op.photoPaths[i], op.blobs[i]);
  if (op.kind === 'create') {
    const it = await api.createItem({ ...op.params, p_photos: op.photoPaths || [], p_client_id: op.client_id });
    rememberId(op.client_id, it.id);
    return it;
  }
  if (op.kind === 'action') {
    const id = op.itemRef.id ?? idMap[op.itemRef.client_id];
    if (!id) throw new Error('البند المرتبط لم يُحفظ في السحابة');
    return api.action({ p_item: id, ...op.params, p_photos: op.photoPaths || [], p_client_id: op.client_id });
  }
  throw new Error('عملية غير معروفة');
}

let flushing = false, again = false;
export async function flush() {
  if (flushing) { again = true; return; }
  flushing = true;
  try {
    do {
      again = false;
      for (const op of await pendingOps()) {
        try {
          const item = await runOp(op);
          await idbDel(op.qid);
          emit('sent', { op, item });
        } catch (e) {
          if (e.network) { emit('offline', e.message); again = false; break; }
          await idbDel(op.qid);
          emit('failed', { op, message: e.message });
        }
      }
    } while (again);
  } finally {
    flushing = false;
    emit('outbox', await pendingOps());
  }
}
window.addEventListener('online', () => flush());
setInterval(() => { if (navigator.onLine) flush(); }, 30000);

// ---------- ضغط الصور قبل الرفع ----------
export async function compressImage(file, maxSide = LIVE ? 1600 : 900, quality = LIVE ? 0.72 : 0.6) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    src = await new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  const w0 = src.width, h0 = src.height, s = Math.min(1, maxSide / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  src.close && src.close();
  return new Promise(res => c.toBlob(res, 'image/jpeg', quality));
}
