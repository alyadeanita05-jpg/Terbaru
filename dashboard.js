import {
  React, h, useCtx, card, btn, btn2, Icon, Ring, Bar, Avatar, StatusBadge, DeadlineChip, Empty,
  fmtDate, deadlineLabel, daysUntil, taskProgress, courseProgress, groupProgress,
} from './lib.js';
import { TaskForm } from './task.js';
import { ActivityItem, CourseForm } from './pages.js';
const { useState } = React;

const Section = ({ title, href, link, children }) => h`<section className=${card + ' p-4 sm:p-5'}>
  <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-gray-900">${title}</h3>
    ${href && h`<a href=${href} className="text-sm font-medium text-pink-600 hover:text-pink-700">${link} →</a>`}</div>${children}</section>`;

const Names = ({ ids }) => { const { byId } = useCtx(); return h`<span className="flex -space-x-1.5">${ids.slice(0, 3).map((u) => h`<span key=${u} title=${byId[u]?.name} className="rounded-full ring-2 ring-white"><${Avatar} p=${byId[u]} size=${22} /></span>`)}</span>`; };
const TaskLine = ({ t, courseName, color, who }) => h`<a href=${'#/tasks/' + t.id} className="lift flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
  <span className="h-9 w-1.5 shrink-0 rounded-full" style=${{ background: color || '#27293d' }}></span>
  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-gray-800">${t.title}</div><div className="truncate text-xs text-gray-400">${courseName || ''}</div></div>
  ${who && who.length > 0 && h`<span className="hidden shrink-0 sm:block"><${Names} ids=${who} /></span>`}<${StatusBadge} s=${t.status} /><${DeadlineChip} t=${t} />
  <div className=${'shrink-0 text-right text-xs ' + (t.deadline && daysUntil(t.deadline) < 0 ? 'font-semibold text-red-600' : 'text-gray-500')}>${t.deadline ? fmtDate(t.deadline) : ''}<br />${t.deadline ? deadlineLabel(t.deadline) : ''}</div></a>`;

export function Dashboard() {
  const { d, me, group, user } = useCtx();
  const [form, setForm] = useState(null);
  const open = d.tasks.filter((t) => t.status !== 'selesai');
  const done = d.tasks.length - open.length;
  const course = (id) => d.courses.find((c) => c.id === id);
  const mineIds = new Set(d.taskMembers.filter((m) => m.user_id === user.id).map((m) => m.task_id));
  const mine = open.filter((t) => mineIds.has(t.id)).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9')).slice(0, 5);
  const upcoming = open.filter((t) => t.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4);
  const whoOf = (id) => d.taskMembers.filter((m) => m.task_id === id).map((m) => m.user_id);
  const near = upcoming.filter((t) => daysUntil(t.deadline) <= 2);
  const active = d.courses.map((c) => ({ c, p: courseProgress(d, c.id) })).filter((x) => x.p < 100 || d.tasks.every((t) => t.course_id !== x.c.id)).slice(0, 6);
  const prog = groupProgress(d);
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const cntS = (s) => d.tasks.filter((t) => t.status === s).length;
  const stats = [['Total tugas', d.tasks.length, 'check', 'bg-lav-100 text-navy-600'], ['To Do', cntS('belum'), 'clock', 'bg-gray-100 text-gray-600'], ['In Progress', cntS('proses') + cntS('revisi'), 'act', 'bg-amber-100 text-amber-700'], ['Review', cntS('review'), 'rev', 'bg-cream-200 text-navy-600'], ['Done', done, 'tick', 'bg-green-100 text-green-700']];
  const unused = [['Berjalan', d.tasks.filter((t) => t.status === 'proses').length, 'bg-amber-50 text-amber-700'], ['Review', d.tasks.filter((t) => t.status === 'review').length, 'bg-lav-100 text-lav-700'], ['Revisi', d.tasks.filter((t) => t.status === 'revisi').length, 'bg-red-50 text-red-600'], ['Selesai', done, 'bg-green-50 text-green-700']];

  return h`<div className="fade-in space-y-5">
    <div className="hero-bg flex flex-col gap-5 rounded-3xl border border-pink-100 p-5 sm:flex-row sm:items-center sm:p-7">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · ${group.name}</div>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900 sm:text-3xl">${greet}, ${me.name.split(' ')[0]}!</h1>
        <p className="mt-1 text-sm text-gray-600">${open.length === 0 ? 'Tidak ada tugas yang menunggu. Saatnya menambah tugas baru.' : `Ada ${open.length} tugas yang belum selesai${mine.length ? `, ${mine.length} di antaranya milik Anda` : ''}.`}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className=${btn} onClick=${() => setForm('task')}><${Icon} n="plus" size=${16} />Tambah tugas</button>
          <button className=${btn2} onClick=${() => setForm('course')}><${Icon} n="folder" size=${16} />Mata kuliah baru</button></div></div>
      <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 sm:flex-col sm:gap-2">
        <${Ring} value=${prog} size=${96} />
        <div className="text-sm sm:text-center"><div className="font-bold text-gray-900">${prog}% selesai</div><div className="text-xs text-gray-500">Progres seluruh proyek</div></div></div></div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">${stats.map(([l, v, ic, c]) => h`<div key=${l} className=${card + ' lift p-4'}>
      <div className=${'mb-3 flex h-9 w-9 items-center justify-center rounded-xl ' + c}><${Icon} n=${ic} size=${18} /></div>
      <div className="text-3xl font-extrabold text-navy-600">${v}</div><div className="text-xs font-medium text-gray-500">${l}</div></div>`)}</div>

    <div className=${card + ' p-4 sm:p-5'}><div className="mb-2 flex items-end justify-between gap-2"><div><h3 className="font-bold text-gray-900">Progres keseluruhan</h3>
      <p className="text-xs text-gray-500">${done} dari ${d.tasks.length} tugas selesai${d.tasks.length ? ` · ${d.tasks.length - done} tugas tersisa` : ''}</p></div><div className="text-3xl font-extrabold text-navy-600">${prog}%</div></div>
      <${Bar} value=${prog} /><p className="mt-2 text-xs text-gray-400">${d.tasks.length === 0 ? 'Belum ada tugas.' : prog >= 100 ? 'Semua tugas selesai. Kerja bagus!' : prog >= 60 ? 'Sudah lebih dari separuh jalan, pertahankan ritmenya.' : 'Progres dihitung otomatis dari checklist yang sudah diselesaikan.'}</p></div>

    ${near.length > 0 && h`<div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><b>Deadline dekat:</b>
      ${near.map((t) => h`<a key=${t.id} href=${'#/tasks/' + t.id} className="ml-2 underline">${t.title} (${deadlineLabel(t.deadline)})</a>`)}</div>`}

    ${d.courses.length === 0 && d.tasks.length === 0 ? h`<div className=${card}><${Empty} title="Belum ada proyek" text="Mulai dengan menambahkan mata kuliah atau proyek pertama kelompok Anda."
      action=${h`<button className=${btn} onClick=${() => setForm('course')}><${Icon} n="plus" size=${16} />Buat mata kuliah</button>`} /></div>` : h`
    <div className="grid gap-5 lg:grid-cols-2">
      <${Section} title="Tugas saya" href="#/tasks" link="Semua tugas">
        ${mine.length === 0 ? h`<${Empty} title="Semua beres" text="Tidak ada tugas aktif yang ditugaskan kepada Anda." />`
          : h`<div className="space-y-2">${mine.map((t) => h`<${TaskLine} key=${t.id} t=${t} courseName=${course(t.course_id)?.name} color=${course(t.course_id)?.color} />`)}</div>`}<//>
      <${Section} title="Deadline terdekat" href="#/calendar" link="Kalender">
        ${upcoming.length === 0 ? h`<${Empty} title="Tidak ada deadline" text="Tugas dengan deadline akan muncul di sini." />`
          : h`<div className="space-y-2">${upcoming.map((t) => h`<${TaskLine} key=${t.id} t=${t} courseName=${course(t.course_id)?.name} color=${course(t.course_id)?.color} who=${whoOf(t.id)} />`)}</div>`}<//></div>

    <${Section} title="Proyek aktif" href="#/courses" link="Kelola">
      ${active.length === 0 ? h`<${Empty} title="Semua proyek selesai" text="Tambahkan mata kuliah baru untuk proyek berikutnya." />`
        : h`<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${active.map(({ c, p }) => {
          const n = d.tasks.filter((t) => t.course_id === c.id).length;
          return h`<a key=${c.id} href=${'#/courses/' + c.id} className="lift block rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style=${{ background: c.color || '#27293d' }}></span><div className="truncate font-semibold text-gray-900">${c.name}</div></div>
            <div className="mt-3 flex items-center gap-3"><div className="flex-1"><${Bar} value=${p} slim /></div><span className="text-xs font-semibold text-gray-600">${p}%</span></div>
            <div className="mt-2 text-xs text-gray-400">${n} tugas</div></a>`;
        })}</div>`}<//>

    <${Section} title="Aktivitas tim" href="#/activity" link="Lihat semua">
      ${d.activity.length === 0 ? h`<${Empty} title="Belum ada aktivitas" />` : h`<ul className="divide-y divide-gray-50">${d.activity.slice(0, 5).map((a) => h`<${ActivityItem} key=${a.id} a=${a} />`)}</ul>`}<//>`}

    ${form === 'task' && h`<${TaskForm} onClose=${() => setForm(null)} />`}
    ${form === 'course' && h`<${CourseForm} onClose=${() => setForm(null)} />`}</div>`;
}
