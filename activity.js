import { React, h, useCtx, inp, card, Avatar, Badge, Empty, PageTitle, Bar, ago, fmtDate, memberTaskProgress, STATUS } from './lib.js';
import { ActivityItem } from './pages.js';
import { WLOG } from './work.js';
const { useState, useMemo } = React;

export function ActivityPage() {
  const { d, members } = useCtx();
  const [u, setU] = useState('');
  const [task, setTask] = useState('');
  const rows = useMemo(() => members.map((m) => {
    const ids = d.taskMembers.filter((x) => x.user_id === m.user_id).map((x) => x.task_id);
    const tasks = ids.map((id) => d.tasks.find((t) => t.id === id)).filter(Boolean);
    const doing = tasks.filter((t) => t.status !== 'selesai' && memberTaskProgress(d, t.id, m.user_id) < 100);
    const done = tasks.filter((t) => memberTaskProgress(d, t.id, m.user_id) === 100).length;
    const lastLog = d.workLogs.filter((w) => w.user_id === m.user_id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastAct = d.activity.find((a) => a.user_id === m.user_id);
    return { m, doing, done, total: tasks.length, lastLog, lastAct };
  }).filter((r) => (!u || r.m.user_id === u) && (!task || r.doing.some((t) => t.id === task) || d.taskMembers.some((x) => x.user_id === r.m.user_id && x.task_id === task))), [d, members, u, task]);
  const feed = d.activity.filter((a) => (!u || a.user_id === u) && (!task || a.task_id === task));

  return h`<div className="fade-in"><${PageTitle} title="Aktivitas Anggota" sub="Pantau siapa mengerjakan apa dan perkembangan terbaru kelompok"
    right=${h`<div className="flex flex-wrap gap-2"><select className=${inp + ' !w-auto'} value=${u} onChange=${(e) => setU(e.target.value)} aria-label="Filter anggota"><option value="">Semua anggota</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select>
      <select className=${inp + ' !w-auto max-w-[220px]'} value=${task} onChange=${(e) => setTask(e.target.value)} aria-label="Filter tugas"><option value="">Semua tugas</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select></div>`} />
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">${rows.length === 0 ? h`<div className=${card + ' md:col-span-2 xl:col-span-3'}><${Empty} title="Tidak ada data" text="Belum ada anggota yang cocok dengan filter." /></div>` : rows.map(({ m, doing, done, total, lastLog, lastAct }) => h`<article key=${m.user_id} className=${card + ' lift p-4'}>
      <a href=${'#/members/' + m.user_id} className="flex items-center gap-3"><${Avatar} p=${m.profile} size=${44} />
        <div className="min-w-0"><div className="truncate font-semibold text-gray-900">${m.profile?.name}</div><div className="text-xs text-gray-400">${lastAct ? 'Aktif ' + ago(lastAct.created_at) : 'Belum ada aktivitas'}</div></div></a>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-cream-50 py-2"><div className="text-lg font-extrabold text-navy-600">${total}</div><div className="text-[10px] text-gray-500">Tugas</div></div>
        <div className="rounded-xl bg-lav-50 py-2"><div className="text-lg font-extrabold text-navy-600">${doing.length}</div><div className="text-[10px] text-gray-500">Dikerjakan</div></div>
        <div className="rounded-xl bg-green-50 py-2"><div className="text-lg font-extrabold text-green-700">${done}</div><div className="text-[10px] text-gray-500">Selesai</div></div></div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sedang dikerjakan</div>
      ${doing.length === 0 ? h`<div className="text-sm text-gray-400">Tidak ada tugas aktif.</div>` : h`<ul className="mt-1 space-y-1.5">${doing.slice(0, 3).map((t) => h`<li key=${t.id}><a href=${'#/tasks/' + t.id} className="block text-sm text-gray-700 hover:underline"><span className="line-clamp-1">${t.title}</span>
        <${Bar} value=${memberTaskProgress(d, t.id, m.user_id)} slim /></a></li>`)}</ul>`}
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Catatan terbaru</div>
      ${lastLog ? h`<div className="mt-1 rounded-xl bg-gray-50 p-2.5 text-sm"><div className="flex items-center justify-between gap-2"><span className="line-clamp-1 font-medium text-gray-800">${lastLog.title}</span><${Badge} cls=${WLOG[lastLog.status].c}>${WLOG[lastLog.status].l}<//></div>
        <div className="text-xs text-gray-400">${fmtDate(lastLog.work_date)}</div></div>` : h`<div className="text-sm text-gray-400">Belum ada catatan pengerjaan.</div>`}</article>`)}</div>
    <div className=${card + ' p-4 sm:p-5'}><h3 className="mb-2 font-bold text-gray-900">Linimasa aktivitas</h3>
      ${feed.length === 0 ? h`<${Empty} title="Belum ada aktivitas" text="Aktivitas akan muncul saat anggota menambah atau memperbarui pekerjaan." />` : h`<ul className="divide-y divide-gray-50">${feed.slice(0, 80).map((a) => h`<${ActivityItem} key=${a.id} a=${a} />`)}</ul>`}</div></div>`;
}
