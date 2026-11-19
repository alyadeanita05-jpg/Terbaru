
import React, { useState, useEffect, useContext, createContext } from 'https://esm.sh/react@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export { React };
export const h = htm.bind(React.createElement);
export const configured = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON');
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const Ctx = createContext(null);
export const useCtx = () => useContext(Ctx);

// ---------- styles ----------
export const inp = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-pink-300 focus:ring-4 focus:ring-pink-100 disabled:bg-gray-50 disabled:text-gray-500 transition';
export const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-pink-500/20 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed';
export const btn2 = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50';
export const card = 'rounded-2xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(60,30,70,.04)]';

// ---------- konstanta ----------
export const STATUS = {
  belum: { l: 'Belum Dikerjakan', c: 'bg-gray-100 text-gray-600' },
  proses: { l: 'Sedang Dikerjakan', c: 'bg-amber-100 text-amber-700' },
  review: { l: 'Menunggu Review', c: 'bg-violet-100 text-violet-700' },
  revisi: { l: 'Perlu Revisi', c: 'bg-red-100 text-red-700' },
  selesai: { l: 'Selesai', c: 'bg-green-100 text-green-700' },
};
export const PRIORITY = {
  rendah: { l: 'Rendah', c: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400' },
  sedang: { l: 'Sedang', c: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  tinggi: { l: 'Tinggi', c: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};
export const WORK_STATUS = { belum: 'Belum Dikerjakan', proses: 'Sedang Dikerjakan', selesai: 'Selesai' };
export const REV_STATUS = {
  baru: { l: 'Revisi Baru', c: 'bg-red-100 text-red-700' },
  direvisi: { l: 'Sedang Direvisi', c: 'bg-amber-100 text-amber-700' },
  selesai: { l: 'Revisi Selesai', c: 'bg-green-100 text-green-700' },
};

// ---------- tanggal ----------
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayStr = () => ymd(new Date());
export const parseD = (s) => new Date(s + 'T00:00:00');
export const fmtDate = (s) => (s ? parseD(s.slice(0, 10)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const daysUntil = (s) => Math.round((parseD(s) - parseD(todayStr())) / 864e5);
export const ago = (s) => {
  const m = Math.floor((Date.now() - new Date(s)) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return m + ' menit lalu';
  if (m < 1440) return Math.floor(m / 60) + ' jam lalu';
  return Math.floor(m / 1440) + ' hari lalu';
};
export const deadlineLabel = (s) => {
  if (!s) return 'Tanpa deadline';
  const n = daysUntil(s);
  if (n < 0) return `Terlambat ${-n} hari`;
  if (n === 0) return 'Hari ini';
  if (n === 1) return 'Besok';
  return `${n} hari lagi`;
};

// ---------- progres otomatis ----------
export const pct = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

export function taskProgress(d, taskId) {
  const t = d.tasks.find((x) => x.id === taskId);
  if (!t) return 0;
  if (t.status === 'selesai') return 100;
  const items = d.checks.filter((c) => c.task_id === taskId);
  if (!items.length) return 0;
  return Math.round((items.filter((c) => c.is_done).length / items.length) * 100);
}
export function memberTaskProgress(d, taskId, uid) {
  const items = d.checks.filter((c) => c.task_id === taskId && c.user_id === uid);
  if (items.length) return Math.round((items.filter((c) => c.is_done).length / items.length) * 100);
  const w = d.work.find((x) => x.task_id === taskId && x.user_id === uid);
  return w && w.status === 'selesai' ? 100 : 0;
}
export const weekProgress = (d, weekId) => pct(d.tasks.filter((t) => t.week_id === weekId).map((t) => taskProgress(d, t.id)));
export const courseProgress = (d, courseId) => pct(d.tasks.filter((t) => t.course_id === courseId).map((t) => taskProgress(d, t.id)));
export const groupProgress = (d) => pct(d.tasks.map((t) => taskProgress(d, t.id)));
export const userProgress = (d, uid) => {
  const ids = d.taskMembers.filter((m) => m.user_id === uid).map((m) => m.task_id);
  return pct(ids.map((id) => memberTaskProgress(d, id, uid)));
};

// ---------- toast ----------
let toastSetter = null;
export function toast(msg, type = 'ok') {
  if (toastSetter) toastSetter({ msg, type, id: Date.now() });
}
export function Toaster() {
  const [t, setT] = useState(null);
  useEffect(() => { toastSetter = setT; return () => { toastSetter = null; }; }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 3200);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return null;
  const cls = t.type === 'error' ? 'bg-red-600' : 'bg-gray-900';
  return h`<div className="fixed left-1/2 -translate-x-1/2 z-[100] pop-in w-[calc(100%-2rem)] max-w-md bottom-24 lg:bottom-6" role="status">
    <div className=${'flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-white shadow-xl ' + cls}>
      <span className=${'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ' + (t.type === 'error' ? 'bg-white/25' : 'bg-green-500')}>${t.type === 'error' ? '!' : '✓'}</span>${t.msg}</div></div>`;
}

// helper: jalankan query supabase & tampilkan error
export async function q(promise, okMsg) {
  const r = await promise;
  if (r.error) { toast(r.error.message || 'Terjadi kesalahan', 'error'); return { error: r.error, data: null }; }
  if (okMsg) toast(okMsg);
  return { data: r.data, error: null };
}

// ---------- UI ----------
const P = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  check: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  cal: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
  act: 'M22 12h-4l-3 9L9 3l-3 9H2',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  set: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  plus: 'M12 5v14 M5 12h14',
  x: 'M18 6L6 18 M6 6l12 12',
  menu: 'M3 12h18 M3 6h18 M3 18h18',
  trash: 'M3 6h18 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6 M9 6V4h6v2',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  clip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  chl: 'M15 18l-6-6 6-6',
  chr: 'M9 18l6-6-6-6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  copy: 'M9 9h13v13H9z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  rev: 'M1 4v6h6 M3.51 15a9 9 0 1 0 2.13-9.36L1 10',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 3v4 M21 5h-4 M5 17v4 M7 19H3',
  dots: 'M5 12h.01 M12 12h.01 M19 12h.01',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  tick: 'M20 6L9 17l-5-5',
};
export const Icon = ({ n, size = 18, className = '' }) => h`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=${className}>${(P[n] || '').split(' M').map((d, i) => h`<path key=${i} d=${(i ? 'M' : '') + d} />`)}</svg>`;

export const Spinner = ({ label = 'Memuat...' }) => h`<div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
  <span className="spin inline-block h-5 w-5 rounded-full border-2 border-pink-300 border-t-transparent"></span>${label}</div>`;

// Kerangka loading untuk halaman (lebih halus daripada spinner)
export const Skeleton = () => h`<div className="space-y-4 fade-in" aria-busy="true" aria-label="Memuat">
  <div className="skeleton h-28 w-full"></div>
  <div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-44"></div><div className="skeleton h-44"></div></div>
  <div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-32"></div><div className="skeleton h-32"></div><div className="skeleton h-32"></div></div></div>`;

export const Empty = ({ title, text, action }) => h`<div className="flex flex-col items-center text-center py-12 px-4 fade-in">
  <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-lav-200 to-cream-100 flex items-center justify-center text-pink-500 mb-3"><${Icon} n="spark" size=${28} /></div>
  <div className="font-semibold text-gray-700">${title}</div>
  ${text && h`<div className="text-sm text-gray-400 mt-1 max-w-sm">${text}</div>`}
  ${action && h`<div className="mt-4">${action}</div>`}</div>`;

const colors = ['bg-lav-200 text-lav-700', 'bg-cream-200 text-navy-600', 'bg-pink-200 text-pink-700', 'bg-amber-100 text-amber-800', 'bg-teal-100 text-teal-800', 'bg-sky-100 text-sky-800', 'bg-slate-200 text-slate-700'];
export function Avatar({ p, size = 32 }) {
  if (!p) return h`<span className="inline-block rounded-full bg-gray-200" style=${{ width: size, height: size }}></span>`;
  if (p.avatar_url) return h`<img src=${p.avatar_url} alt=${p.name} className="rounded-full object-cover shrink-0" style=${{ width: size, height: size }} />`;
  const i = (p.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const c = colors[[...(p.id || 'x')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % colors.length];
  return h`<span className=${'inline-flex items-center justify-center rounded-full font-semibold shrink-0 ' + c} style=${{ width: size, height: size, fontSize: size * 0.38 }}>${i}</span>`;
}

export const Badge = ({ cls, children }) => h`<span className=${'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ' + cls}>${children}</span>`;
export const StatusBadge = ({ s }) => h`<${Badge} cls=${STATUS[s]?.c}>${STATUS[s]?.l}<//>`;
export const PriorityBadge = ({ p }) => h`<${Badge} cls=${PRIORITY[p]?.c}>${PRIORITY[p]?.l}<//>`;

export function Bar({ value, color = 'bg-gradient-to-r from-lav-400 to-navy-600', slim }) {
  const col = value >= 100 ? 'bg-green-500' : color;
  return h`<div className=${'w-full rounded-full bg-gray-100 overflow-hidden ' + (slim ? 'h-1.5' : 'h-2.5')}>
    <div className=${'h-full rounded-full transition-all duration-500 ' + col} style=${{ width: Math.min(100, value) + '%' }}></div></div>`;
}

export function Ring({ value, size = 120 }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r;
  return h`<div className="relative" style=${{ width: size, height: size }}>
    <svg width=${size} height=${size} className="-rotate-90">
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke="#e3eff3" strokeWidth="12" />
      <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" stroke=${value >= 100 ? '#22c55e' : '#27293d'} strokeWidth="12" strokeLinecap="round"
        strokeDasharray=${c} strokeDashoffset=${c * (1 - value / 100)} style=${{ transition: 'stroke-dashoffset .6s' }} />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-800">${value}%</div></div>`;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return h`<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-[2px] p-0 sm:p-4" onMouseDown=${(e) => e.target === e.currentTarget && onClose()}>
    <div className=${'slide-up bg-white w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-xl ' + (wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
      <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
        <h3 className="font-semibold text-gray-800">${title}</h3>
        <button onClick=${onClose} className="text-gray-400 hover:text-gray-700"><${Icon} n="x" /></button></div>
      <div className="p-5">${children}</div></div></div>`;
}

export const Field = ({ label, children, hint }) => h`<label className="block mb-3">
  <span className="block text-xs font-medium text-gray-500 mb-1">${label}</span>${children}
  ${hint && h`<span className="block text-xs text-gray-400 mt-1">${hint}</span>`}</label>`;

export const PageTitle = ({ title, sub, right }) => h`<div className="flex flex-wrap items-start justify-between gap-3 mb-5">
  <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">${title}</h1>${sub && h`<p className="text-sm text-gray-500 mt-0.5">${sub}</p>`}</div>
  <div className="flex gap-2 flex-wrap">${right}</div></div>`;

export const confirmDel = (msg) => window.confirm(msg);
export const go = (hash) => { location.hash = hash; };

// Indikator deadline: Aman / Mendekati deadline / Terlambat
export function DeadlineChip({ t }) {
  if (t.status === 'selesai') return h`<${Badge} cls="bg-green-100 text-green-700">Selesai<//>`;
  if (!t.deadline) return h`<${Badge} cls="bg-gray-100 text-gray-500">Tanpa deadline<//>`;
  const n = daysUntil(t.deadline);
  const [c, l] = n < 0 ? ['bg-red-100 text-red-700', 'Terlambat'] : n <= 3 ? ['bg-amber-100 text-amber-700', 'Mendekati'] : ['bg-lav-100 text-lav-700', 'Aman'];
  return h`<${Badge} cls=${c}>${l}<//>`;
}
