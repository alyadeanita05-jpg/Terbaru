import {
  React, h, useCtx, sb, inp, btn, btn2, card, Icon, Avatar, Bar, Badge, Empty, PageTitle, PriorityBadge, StatusBadge, DeadlineChip,
  STATUS, REV_STATUS, fmtDate, daysUntil, taskProgress, q, confirmDel, go, todayStr,
} from './lib.js';
import { TaskForm } from './task.js';
const { useState, useMemo } = React;

const COLS = [
  { k: 'todo', l: 'To Do', hint: 'Belum mulai', st: 'belum', has: ['belum'], tone: 'bg-white/70' },
  { k: 'prog', l: 'In Progress', hint: 'Sedang dikerjakan', st: 'proses', has: ['proses', 'revisi'], tone: 'bg-lav-50' },
  { k: 'rev', l: 'Review', hint: 'Menunggu pemeriksaan', st: 'review', has: ['review'], tone: 'bg-cream-50' },
  { k: 'done', l: 'Done', hint: 'Selesai & disetujui', st: 'selesai', has: ['selesai'], tone: 'bg-green-50/60' },
];
const PRIO_W = { tinggi: 0, sedang: 1, rendah: 2 };
const SORTS = [['deadline', 'Deadline terdekat'], ['prio', 'Prioritas tertinggi'], ['new', 'Tugas terbaru'], ['done', 'Tugas selesai dahulu']];
const QUICK = [['all', 'Semua Tugas'], ['mine', 'Tugas Saya'], ['group', 'Tugas Kelompok'], ['late', 'Terlambat'], ['done', 'Selesai']];

function useTaskData() {
  const { d, user, byId } = useCtx();
  const who = useMemo(() => {
    const m = {};
    d.taskMembers.forEach((x) => { (m[x.task_id] = m[x.task_id] || []).push(x.user_id); });
    return m;
  }, [d.taskMembers]);
  return { who, d, user, byId };
}

const People = ({ ids, byId, size = 24, max = 4 }) => h`<div className="flex -space-x-1.5">${ids.slice(0, max).map((u) => h`<span key=${u} title=${byId[u]?.name} className="rounded-full ring-2 ring-white"><${Avatar} p=${byId[u]} size=${size} /></span>`)}
  ${ids.length > max && h`<span className="flex items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 ring-2 ring-white" style=${{ width: size, height: size }}>+${ids.length - max}</span>`}</div>`;

function KCard({ t, ids, onMove, onDragStart, dragging }) {
  const { d, byId } = useCtx();
  const course = d.courses.find((c) => c.id === t.course_id);
  const p = taskProgress(d, t.id);
  const chk = d.checks.filter((c) => c.task_id === t.id);
  return h`<div draggable="true" onDragStart=${(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(t.id); }}
    className=${'lift rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ' + (dragging ? 'opacity-40' : '')}>
    <a href=${'#/tasks/' + t.id} className="block">
      <div className="flex items-start justify-between gap-2"><div className="text-sm font-semibold leading-snug text-gray-900">${t.title}</div><${PriorityBadge} p=${t.priority} /></div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2 w-2 shrink-0 rounded-full" style=${{ background: course?.color || '#27293d' }}></span><span className="truncate">${course?.name || '-'}</span></div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5"><${DeadlineChip} t=${t} />${t.deadline && h`<span className="text-xs text-gray-500">${fmtDate(t.deadline)}</span>`}
        ${t.status === 'revisi' && h`<${StatusBadge} s="revisi" />`}</div>
      <div className="mt-2.5 flex items-center gap-2"><div className="flex-1"><${Bar} value=${p} slim /></div><span className="text-[11px] font-semibold text-gray-600">${chk.filter((c) => c.is_done).length}/${chk.length || 0} · ${p}%</span></div></a>
    <div className="mt-2.5 flex items-center justify-between gap-2">
      ${ids.length ? h`<${People} ids=${ids} byId=${byId} />` : h`<span className="text-xs text-gray-400">Belum ada anggota</span>`}
      <select aria-label="Pindahkan tugas" className="max-w-[120px] rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600" value="" onChange=${(e) => e.target.value && onMove(t, e.target.value)}>
        <option value="">Pindah ke…</option>${COLS.filter((c) => !c.has.includes(t.status)).map((c) => h`<option key=${c.k} value=${c.st}>${c.l}</option>`)}</select></div></div>`;
}

function Kanban({ tasks, who, onMove }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  return h`<div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">${COLS.map((c) => {
    const items = tasks.filter((t) => c.has.includes(t.status));
    return h`<section key=${c.k} className=${'kcol min-h-[14rem] w-[82vw] shrink-0 snap-start rounded-3xl border border-white/80 p-3 transition-colors sm:w-auto ' + c.tone + (over === c.k ? ' over' : '')}
      onDragOver=${(e) => { e.preventDefault(); setOver(c.k); }} onDragLeave=${() => setOver(null)}
      onDrop=${(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain') || drag; setDrag(null); const t = tasks.find((x) => x.id === id); if (t && !c.has.includes(t.status)) onMove(t, c.st); }}>
      <div className="mb-3 flex items-center justify-between px-1"><div><div className="text-sm font-bold text-gray-900">${c.l}</div><div className="text-[11px] text-gray-400">${c.hint}</div></div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-700 shadow-sm">${items.length}</span></div>
      <div className="space-y-2.5">${items.length === 0 ? h`<div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">Tarik tugas ke sini</div>`
        : items.map((t) => h`<${KCard} key=${t.id} t=${t} ids=${who[t.id] || []} onMove=${onMove} onDragStart=${setDrag} dragging=${drag === t.id} />`)}</div></section>`;
  })}</div>`;
}

function ListView({ tasks, who, onEdit, onDelete }) {
  const { d, byId, isLeader } = useCtx();
  return h`<div className=${card + ' overflow-x-auto'}><table className="w-full min-w-[860px] text-left text-sm">
    <thead className="border-b border-gray-100 bg-cream-50 text-xs uppercase tracking-wide text-gray-500"><tr>
      ${['Nama tugas', 'Kategori', 'Anggota', 'Prioritas', 'Status', 'Deadline', 'Progress', 'Aksi'].map((x) => h`<th key=${x} className="px-3 py-3 font-semibold">${x}</th>`)}</tr></thead>
    <tbody className="divide-y divide-gray-50">${tasks.map((t) => {
      const course = d.courses.find((c) => c.id === t.course_id);
      const p = taskProgress(d, t.id);
      const ids = who[t.id] || [];
      return h`<tr key=${t.id} className="transition-colors hover:bg-lav-50/60">
        <td className="max-w-[260px] px-3 py-3"><a href=${'#/tasks/' + t.id} className="font-semibold text-gray-900 hover:text-lav-700 hover:underline">${t.title}</a></td>
        <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-gray-600"><span className="h-2 w-2 rounded-full" style=${{ background: course?.color || '#27293d' }}></span>${course?.name || '-'}</span></td>
        <td className="px-3 py-3">${ids.length ? h`<div className="flex items-center gap-2"><${People} ids=${ids} byId=${byId} size=${24} max=${3} /><span className="hidden text-xs text-gray-500 xl:inline">${ids.map((u) => byId[u]?.name?.split(' ')[0]).slice(0, 2).join(', ')}</span></div>` : h`<span className="text-gray-300">-</span>`}</td>
        <td className="px-3 py-3"><${PriorityBadge} p=${t.priority} /></td>
        <td className="px-3 py-3"><${StatusBadge} s=${t.status} /></td>
        <td className="px-3 py-3"><div className="text-gray-700">${fmtDate(t.deadline)}</div><div className="mt-0.5"><${DeadlineChip} t=${t} /></div></td>
        <td className="w-32 px-3 py-3"><div className="flex items-center gap-2"><div className="flex-1"><${Bar} value=${p} slim /></div><span className="text-xs font-semibold">${p}%</span></div></td>
        <td className="px-3 py-3"><div className="flex gap-1"><a href=${'#/tasks/' + t.id} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Buka"><${Icon} n="chr" size=${16} /></a>
          <button className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Edit" onClick=${() => onEdit(t)}><${Icon} n="edit" size=${16} /></button>
          ${isLeader && h`<button className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Hapus" onClick=${() => onDelete(t)}><${Icon} n="trash" size=${16} /></button>`}</div></td></tr>`;
    })}</tbody></table></div>`;
}

export function TasksPage() {
  const { d, members, user, reload, log, notify } = useCtx();
  const { who, byId } = useTaskData();
  const [tab, setTab] = useState('tugas');
  const [view, setView] = useState(() => { try { return localStorage.getItem('task-view') || 'kanban'; } catch { return 'kanban'; } });
  const [f, setF] = useState({ s: '', quick: 'all', status: '', member: '', prio: '', course: '', when: '', sort: 'deadline' });
  const [modal, setModal] = useState(null);
  const [showF, setShowF] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickView = (v) => { setView(v); try { localStorage.setItem('task-view', v); } catch { /* abaikan */ } };
  const today = todayStr();

  const list = useMemo(() => {
    let r = d.tasks.filter((t) => {
      const ids = who[t.id] || [];
      if (f.s && !(t.title + ' ' + (t.description || '')).toLowerCase().includes(f.s.toLowerCase())) return false;
      if (f.quick === 'mine' && !ids.includes(user.id)) return false;
      if (f.quick === 'group' && ids.length < 2) return false;
      if (f.quick === 'late' && !(t.deadline && t.status !== 'selesai' && t.deadline < today)) return false;
      if (f.quick === 'done' && t.status !== 'selesai') return false;
      if (f.status && t.status !== f.status) return false;
      if (f.member && !ids.includes(f.member)) return false;
      if (f.prio && t.priority !== f.prio) return false;
      if (f.course && t.course_id !== f.course) return false;
      if (f.when) {
        if (!t.deadline) return false;
        const n = daysUntil(t.deadline);
        if (f.when === 'late' && !(n < 0 && t.status !== 'selesai')) return false;
        if (f.when === 'today' && n !== 0) return false;
        if (f.when === 'week' && !(n >= 0 && n <= 7)) return false;
      }
      return true;
    });
    const cmp = {
      deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
      prio: (a, b) => PRIO_W[a.priority] - PRIO_W[b.priority] || (a.deadline || '9999').localeCompare(b.deadline || '9999'),
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      done: (a, b) => (b.status === 'selesai') - (a.status === 'selesai') || (a.deadline || '9999').localeCompare(b.deadline || '9999'),
    }[f.sort];
    return r.sort(cmp);
  }, [d.tasks, who, f, user.id, today]);

  async function move(t, st) {
    if (t.status === st) return;
    const r = await q(sb.from('tasks').update({ status: st }).eq('id', t.id), 'Status diperbarui ke ' + STATUS[st].l);
    if (r.error) return;
    await log(`mengubah status tugas ${t.title} menjadi ${STATUS[st].l}`, t.id);
    await notify(who[t.id] || [], 'status', `Status tugas "${t.title}" berubah menjadi ${STATUS[st].l}`, t.id);
    reload(['tasks', 'activity']);
  }
  async function del(t) {
    if (!confirmDel(`Hapus tugas "${t.title}" beserta seluruh catatan, komentar, dan revisinya?`)) return;
    const r = await q(sb.from('tasks').delete().eq('id', t.id), 'Tugas dihapus');
    if (!r.error) { await log(`menghapus tugas ${t.title}`); reload(); }
  }
  const revs = d.revisions.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const active = Object.entries(f).filter(([k, v]) => v && !['quick', 'sort'].includes(k)).length;
  const reset = () => setF({ s: '', quick: 'all', status: '', member: '', prio: '', course: '', when: '', sort: f.sort });

  return h`<div className="fade-in"><${PageTitle} title="Daftar Tugas" sub="Pusat pengelolaan seluruh pekerjaan kelompok"
    right=${h`<button className=${btn} onClick=${() => setModal('new')} disabled=${d.courses.length === 0}><${Icon} n="plus" size=${16} />Tambah Tugas</button>`} />
    <div className="mb-4 flex gap-1 border-b border-gray-200/80">${[['tugas', `Tugas (${d.tasks.length})`], ['revisi', `Revisi (${revs.length})`]].map(([k, l]) => h`<button key=${k} onClick=${() => setTab(k)}
      className=${'-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ' + (tab === k ? 'border-navy-600 text-navy-600' : 'border-transparent text-gray-500 hover:text-gray-800')}>${l}</button>`)}</div>
    ${tab === 'tugas' ? h`<div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><input className=${inp + ' !pl-9'} placeholder="Cari nama tugas…" value=${f.s} onChange=${set('s')} /><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><${Icon} n="act" size=${15} /></span></div>
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">${[['kanban', 'Kanban'], ['list', 'List']].map(([k, l]) => h`<button key=${k} onClick=${() => pickView(k)} className=${'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ' + (view === k ? 'bg-navy-600 text-white' : 'text-gray-500 hover:text-gray-800')}>${l}</button>`)}</div>
        <button className=${btn2} onClick=${() => setShowF(!showF)}>Filter${active ? ` (${active})` : ''}</button>
        <select className=${inp + ' !w-auto'} value=${f.sort} onChange=${set('sort')} aria-label="Urutkan">${SORTS.map(([k, l]) => h`<option key=${k} value=${k}>${l}</option>`)}</select></div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">${QUICK.map(([k, l]) => h`<button key=${k} onClick=${() => setF({ ...f, quick: k })}
        className=${'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ' + (f.quick === k ? 'bg-navy-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-lav-50')}>${l}</button>`)}</div>
      ${showF && h`<div className=${card + ' mb-4 grid grid-cols-2 gap-2 p-3 fade-in lg:grid-cols-6'}>
        <select className=${inp} value=${f.status} onChange=${set('status')}><option value="">Semua status</option>${Object.entries(STATUS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select>
        <select className=${inp} value=${f.member} onChange=${set('member')}><option value="">Semua anggota</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select>
        <select className=${inp} value=${f.prio} onChange=${set('prio')}><option value="">Semua prioritas</option><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select>
        <select className=${inp} value=${f.course} onChange=${set('course')}><option value="">Semua kategori</option>${d.courses.map((c) => h`<option key=${c.id} value=${c.id}>${c.name}</option>`)}</select>
        <select className=${inp} value=${f.when} onChange=${set('when')}><option value="">Semua deadline</option><option value="today">Hari ini</option><option value="week">7 hari ke depan</option><option value="late">Terlambat</option></select>
        <button className=${btn2} onClick=${reset}>Reset</button></div>`}
      ${list.length === 0 ? h`<div className=${card}><${Empty} title=${d.tasks.length ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'} text=${d.courses.length === 0 ? 'Tambahkan mata kuliah terlebih dahulu, lalu buat tugas.' : d.tasks.length ? 'Ubah kata kunci atau filter Anda.' : 'Klik "Tambah Tugas" untuk membuat tugas pertama kelompok.'}
          action=${d.tasks.length ? h`<button className=${btn2} onClick=${reset}>Reset filter</button>` : d.courses.length ? h`<button className=${btn} onClick=${() => setModal('new')}><${Icon} n="plus" size=${16} />Tambah Tugas</button>` : h`<a href="#/courses" className=${btn}>Ke Mata Kuliah</a>`} /></div>`
        : view === 'kanban' ? h`<${Kanban} tasks=${list} who=${who} onMove=${move} />` : h`<${ListView} tasks=${list} who=${who} onEdit=${(t) => setModal(t)} onDelete=${del} />`}
      <p className="mt-3 text-xs text-gray-400">${view === 'kanban' ? 'Tarik kartu antar kolom, atau gunakan menu "Pindah ke…" di HP. Perubahan langsung tersimpan.' : `${list.length} tugas ditampilkan.`}</p></div>`
      : h`<div>${revs.length === 0 ? h`<div className=${card}><${Empty} title="Belum ada revisi" text="Revisi dibuat dari halaman detail tugas." /></div>`
        : h`<div className="space-y-3">${revs.map((r) => { const t = d.tasks.find((x) => x.id === r.task_id); return h`<a key=${r.id} href=${'#/tasks/' + r.task_id} className=${card + ' lift block p-4'}>
          <div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">${t?.title} <span className="font-normal text-gray-400">— ${r.section}</span></div>
            <div className="mt-1 line-clamp-2 text-sm text-gray-600">${r.lecturer_notes}</div></div><${Badge} cls=${REV_STATUS[r.status].c}>${REV_STATUS[r.status].l}<//></div>
          <div className="mt-2 text-xs text-gray-400">${r.assignee_id ? 'PJ: ' + byId[r.assignee_id]?.name + ' · ' : ''}Deadline ${fmtDate(r.deadline)}</div></a>`; })}</div>`}</div>`}
    ${modal && h`<${TaskForm} task=${modal === 'new' ? undefined : modal} onClose=${(tid) => { const wasNew = modal === 'new'; setModal(null); if (tid && wasNew) go('#/tasks/' + tid); }} />`}</div>`;
}
