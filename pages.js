import {
  React, h, useCtx, sb, inp, btn, btn2, btnDanger, card, Field, Modal, Icon, Avatar, Bar, Ring, StatusBadge, Badge, Empty, PageTitle,
  REV_STATUS, fmtDate, fmtDateTime, ago, deadlineLabel, daysUntil, taskProgress, weekProgress, courseProgress, groupProgress,
  q, toast, confirmDel, go,
} from './lib.js';
import { TaskForm, TaskRow } from './task.js';
const { useState } = React;

export function ActivityItem({ a }) {
  const { byId } = useCtx();
  const p = byId[a.user_id];
  return h`<li className="flex gap-3 py-2.5">
    <${Avatar} p=${p} size=${30} />
    <div className="min-w-0 flex-1 text-sm">
      <span className="font-medium text-gray-800">${p?.name || 'Seseorang'}</span> <span className="text-gray-600">${a.action}</span>
      <div className="text-xs text-gray-400">${fmtDateTime(a.created_at)} · ${ago(a.created_at)}</div></div></li>`;
}

// ======================= MATA KULIAH =======================
function CourseCard({ c }) {
  const { d } = useCtx();
  const tasks = d.tasks.filter((t) => t.course_id === c.id);
  const done = tasks.filter((t) => t.status === 'selesai').length;
  const next = tasks.filter((t) => t.deadline && t.status !== 'selesai').sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const p = courseProgress(d, c.id);
  return h`<div className=${card + ' lift overflow-hidden flex flex-col'}>
    <div className="h-1.5" style=${{ background: c.color || '#27293d' }}></div>
    <div className="p-4 flex-1 flex flex-col">
      <h4 className="font-semibold text-gray-900">${c.name}</h4><div className="text-sm text-gray-500">${c.lecturer || 'Dosen belum diisi'}</div>
      <div className="mt-3 flex items-center gap-3"><div className="flex-1"><${Bar} value=${p} /></div><span className="text-sm font-semibold">${p}%</span></div>
      <div className="mt-3 grid grid-cols-2 text-xs text-gray-500 gap-y-1"><span>${tasks.length} tugas</span><span>${done} selesai</span>
        <span className="col-span-2">Deadline terdekat: ${next ? fmtDate(next.deadline) + ' (' + deadlineLabel(next.deadline) + ')' : '-'}</span></div>
      <a href=${'#/courses/' + c.id} className=${btn2 + ' mt-4 w-full'}>Lihat Detail</a></div></div>`;
}

export function CourseForm({ course, onClose }) {
  const { group, user, reload, log } = useCtx();
  const [f, setF] = useState({ name: course?.name || '', lecturer: course?.lecturer || '', description: course?.description || '', semester: course?.semester || '', academic_year: course?.academic_year || '', color: course?.color || '#27293d' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const body = { ...f, name: f.name.trim() };
    const r = course
      ? await q(sb.from('courses').update(body).eq('id', course.id), 'Mata kuliah diperbarui')
      : await q(sb.from('courses').insert({ ...body, group_id: group.id, created_by: user.id }), 'Mata kuliah ditambahkan');
    if (r.error) return;
    await log(`${course ? 'mengedit' : 'menambahkan'} mata kuliah ${body.name}`);
    reload(['courses', 'activity']); onClose();
  }
  return h`<${Modal} title=${course ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'} onClose=${onClose}>
    <form onSubmit=${save}>
      <${Field} label="Nama mata kuliah"><input className=${inp} required value=${f.name} onChange=${set('name')} placeholder="mis. Business Valuation" /><//>
      <${Field} label="Dosen pengampu"><input className=${inp} value=${f.lecturer} onChange=${set('lecturer')} /><//>
      <${Field} label="Deskripsi"><textarea rows="3" className=${inp} value=${f.description} onChange=${set('description')}></textarea><//>
      <div className="grid grid-cols-3 gap-3">
        <${Field} label="Semester"><input className=${inp} value=${f.semester} onChange=${set('semester')} placeholder="Ganjil" /><//>
        <${Field} label="Tahun akademik"><input className=${inp} value=${f.academic_year} onChange=${set('academic_year')} placeholder="2026/2027" /><//>
        <${Field} label="Warna"><input type="color" className="h-10 w-full rounded-xl border border-gray-200 bg-white p-1" value=${f.color} onChange=${set('color')} /><//></div>
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${onClose}>Batal</button><button className=${btn}>Simpan</button></div>
    </form><//>`;
}

export function CoursesPage() {
  const { d } = useCtx();
  const [modal, setModal] = useState(false);
  return h`<div className="fade-in"><${PageTitle} title="Mata Kuliah" sub="Kelola seluruh mata kuliah Capstone kelompok Anda"
    right=${h`<button className=${btn} onClick=${() => setModal(true)}><${Icon} n="plus" size=${16} />Tambah Mata Kuliah</button>`} />
    ${d.courses.length === 0 ? h`<div className=${card}><${Empty} title="Belum ada mata kuliah" text="Tambahkan mata kuliah seperti Project Management, Business Valuation, dan lainnya." /></div>`
      : h`<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">${d.courses.map((c) => h`<${CourseCard} key=${c.id} c=${c} />`)}</div>`}
    ${modal && h`<${CourseForm} onClose=${() => setModal(false)} />`}</div>`;
}

// ======================= DETAIL MATA KULIAH =======================
function WeekForm({ course, week, onClose }) {
  const { d, group, reload, log } = useCtx();
  const nextNum = Math.max(0, ...d.weeks.filter((w) => w.course_id === course.id).map((w) => w.number)) + 1;
  const [f, setF] = useState({ number: week?.number || nextNum, title: week?.title || '', description: week?.description || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const body = { number: Number(f.number), title: f.title.trim() || null, description: f.description.trim() || null };
    const r = week
      ? await q(sb.from('weeks').update(body).eq('id', week.id), 'Week diperbarui')
      : await q(sb.from('weeks').insert({ ...body, group_id: group.id, course_id: course.id }), 'Week ditambahkan');
    if (r.error) return;
    await log(`${week ? 'mengedit' : 'menambahkan'} Week ${body.number} pada ${course.name}`);
    reload(['weeks', 'activity']); onClose();
  }
  return h`<${Modal} title=${week ? 'Edit Week' : 'Tambah Week'} onClose=${onClose}>
    <form onSubmit=${save}>
      <${Field} label="Nomor week"><input type="number" min="1" required className=${inp} value=${f.number} onChange=${set('number')} /><//>
      <${Field} label="Nama / keterangan week"><input className=${inp} value=${f.title} onChange=${set('title')} placeholder="mis. Analisis bisnis" /><//>
      <${Field} label="Deskripsi"><textarea rows="2" className=${inp} value=${f.description} onChange=${set('description')}></textarea><//>
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${onClose}>Batal</button><button className=${btn}>Simpan</button></div>
    </form><//>`;
}

export function CourseDetail({ id }) {
  const { d, isLeader, reload, log } = useCtx();
  const [modal, setModal] = useState(null); // {type, week?, defaults?}
  const c = d.courses.find((x) => x.id === id);
  if (!c) return h`<${Empty} title="Mata kuliah tidak ditemukan" action=${h`<a href="#/courses" className=${btn2}>Kembali</a>`} />`;
  const tasks = d.tasks.filter((t) => t.course_id === id);
  const weeks = d.weeks.filter((w) => w.course_id === id).sort((a, b) => a.number - b.number);
  const done = tasks.filter((t) => t.status === 'selesai').length;
  const p = courseProgress(d, id);
  const loose = tasks.filter((t) => !t.week_id);

  async function delCourse() {
    if (!confirmDel(`Hapus mata kuliah "${c.name}" beserta semua week dan tugasnya? Tindakan ini tidak dapat dibatalkan.`)) return;
    const r = await q(sb.from('courses').delete().eq('id', id), 'Mata kuliah dihapus');
    if (!r.error) { await log(`menghapus mata kuliah ${c.name}`); await reload(); go('#/courses'); }
  }
  async function delWeek(w) {
    if (!confirmDel(`Hapus Week ${w.number}? Tugas di dalamnya tidak dihapus, hanya dipindah ke "Tanpa Week".`)) return;
    await q(sb.from('weeks').delete().eq('id', w.id), 'Week dihapus');
    reload(['weeks', 'tasks']);
  }
  const Section = ({ title, sub, prog, tasks: list, week }) => h`<div className=${card + ' p-4 mb-4'}>
    <div className="flex flex-wrap items-center gap-3 justify-between mb-3">
      <div><h3 className="font-semibold">${title}</h3>${sub && h`<div className="text-xs text-gray-500">${sub}</div>`}</div>
      <div className="flex items-center gap-2">
        ${prog !== undefined && h`<div className="flex items-center gap-2 w-36"><div className="flex-1"><${Bar} value=${prog} slim /></div><span className="text-xs font-medium">${prog}%</span></div>`}
        <button className=${btn2} onClick=${() => setModal({ type: 'task', defaults: { course_id: id, week_id: week?.id || '' } })}><${Icon} n="plus" size=${14} />Tugas</button>
        ${week && h`<button className=${btn2} onClick=${() => setModal({ type: 'week', week })}><${Icon} n="edit" size=${14} /></button>`}
        ${week && isLeader && h`<button className=${btnDanger} onClick=${() => delWeek(week)}><${Icon} n="trash" size=${14} /></button>`}</div></div>
    ${list.length === 0 ? h`<div className="text-sm text-gray-400 py-3 text-center">Belum ada tugas pada bagian ini.</div>`
      : h`<div className="space-y-2">${list.map((t) => h`<${TaskRow} key=${t.id} t=${t} />`)}</div>`}</div>`;

  return h`<div className="fade-in">
    <a href="#/courses" className="text-sm text-gray-400 hover:text-pink-600">← Semua mata kuliah</a>
    <div className=${card + ' mt-2 mb-5 overflow-hidden'}><div className="h-2" style=${{ background: c.color }}></div>
      <div className="p-5"><div className="flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold">${c.name}</h1><div className="text-sm text-gray-500">Dosen: ${c.lecturer || '-'} ${c.semester ? '· Semester ' + c.semester : ''} ${c.academic_year ? '· ' + c.academic_year : ''}</div></div>
        <div className="flex gap-2"><button className=${btn2} onClick=${() => setModal({ type: 'course' })}><${Icon} n="edit" size=${15} />Edit</button>
          ${isLeader && h`<button className=${btnDanger} onClick=${delCourse}><${Icon} n="trash" size=${15} /></button>`}</div></div>
        ${c.description && h`<p className="text-sm text-gray-600 mt-2">${c.description}</p>`}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          ${[['Total tugas', tasks.length], ['Selesai', done], ['Belum selesai', tasks.length - done], ['Progres', p + '%']].map(([l, v]) => h`<div key=${l} className="rounded-xl bg-pink-50/60 py-2.5"><div className="text-xl font-bold">${v}</div><div className="text-xs text-gray-500">${l}</div></div>`)}</div>
        <div className="mt-3"><${Bar} value=${p} /></div></div></div>
    <div className="flex justify-between items-center mb-3"><h2 className="font-semibold text-gray-800">Pengelolaan Week</h2>
      <button className=${btn} onClick=${() => setModal({ type: 'week' })}><${Icon} n="plus" size=${16} />Tambah Week</button></div>
    ${weeks.length === 0 && loose.length === 0 && h`<div className=${card}><${Empty} title="Belum ada week" text="Tambahkan Week 1, Week 2, dan seterusnya. Jumlah week tidak dibatasi." /></div>`}
    ${weeks.map((w) => h`<${Section} key=${w.id} title=${'Week ' + w.number + (w.title ? ' — ' + w.title : '')} sub=${w.description} prog=${weekProgress(d, w.id)} tasks=${tasks.filter((t) => t.week_id === w.id)} week=${w} />`)}
    ${(loose.length > 0 || weeks.length === 0) && h`<${Section} title="Tanpa Week" tasks=${loose} />`}
    ${modal?.type === 'course' && h`<${CourseForm} course=${c} onClose=${() => setModal(null)} />`}
    ${modal?.type === 'week' && h`<${WeekForm} course=${c} week=${modal.week} onClose=${() => setModal(null)} />`}
    ${modal?.type === 'task' && h`<${TaskForm} defaults=${modal.defaults} onClose=${(tid) => setModal(null)} />`}</div>`;
}

// ======================= SEMUA TUGAS & REVISI =======================
export function TasksPage() {
  const { d, members, byId } = useCtx();
  const [tab, setTab] = useState('tugas');
  const [f, setF] = useState({ s: '', course: '', status: '', prio: '', member: '' });
  const [modal, setModal] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = d.tasks.filter((t) =>
    (!f.s || t.title.toLowerCase().includes(f.s.toLowerCase())) && (!f.course || t.course_id === f.course) &&
    (!f.status || t.status === f.status) && (!f.prio || t.priority === f.prio) &&
    (!f.member || d.taskMembers.some((m) => m.task_id === t.id && m.user_id === f.member)))
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  const revs = d.revisions.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  return h`<div className="fade-in"><${PageTitle} title="Semua Tugas" sub="Seluruh tugas dari semua mata kuliah"
    right=${h`<button className=${btn} onClick=${() => setModal(true)} disabled=${d.courses.length === 0}><${Icon} n="plus" size=${16} />Tambah Tugas</button>`} />
    <div className="flex gap-1 mb-4 border-b border-gray-200">${[['tugas', `Tugas (${d.tasks.length})`], ['revisi', `Revisi (${revs.length})`]].map(([k, l]) => h`<button key=${k} onClick=${() => setTab(k)}
      className=${'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ' + (tab === k ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500')}>${l}</button>`)}</div>
    ${tab === 'tugas' ? h`<div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <input className=${inp + ' col-span-2 lg:col-span-1'} placeholder="Cari tugas..." value=${f.s} onChange=${set('s')} />
        <select className=${inp} value=${f.course} onChange=${set('course')}><option value="">Semua mata kuliah</option>${d.courses.map((c) => h`<option key=${c.id} value=${c.id}>${c.name}</option>`)}</select>
        <select className=${inp} value=${f.status} onChange=${set('status')}><option value="">Semua status</option>${['belum', 'proses', 'review', 'revisi', 'selesai'].map((s) => h`<option key=${s} value=${s}>${{ belum: 'Belum Dikerjakan', proses: 'Sedang Dikerjakan', review: 'Menunggu Review', revisi: 'Perlu Revisi', selesai: 'Selesai' }[s]}</option>`)}</select>
        <select className=${inp} value=${f.prio} onChange=${set('prio')}><option value="">Semua prioritas</option><option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option></select>
        <select className=${inp} value=${f.member} onChange=${set('member')}><option value="">Semua anggota</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select></div>
      ${list.length === 0 ? h`<div className=${card}><${Empty} title="Tidak ada tugas" text=${d.courses.length === 0 ? 'Tambahkan mata kuliah terlebih dahulu.' : 'Belum ada tugas yang cocok.'} /></div>`
        : h`<div className="space-y-2">${list.map((t) => h`<${TaskRow} key=${t.id} t=${t} />`)}</div>`}</div>`
      : h`<div>${revs.length === 0 ? h`<div className=${card}><${Empty} title="Belum ada revisi" text="Revisi dibuat dari halaman detail tugas." /></div>`
        : h`<div className="space-y-3">${revs.map((r) => { const t = d.tasks.find((x) => x.id === r.task_id); return h`<a key=${r.id} href=${'#/tasks/' + r.task_id} className=${card + ' block p-4 hover:border-pink-200'}>
          <div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">${t?.title} <span className="text-gray-400 font-normal">— ${r.section}</span></div>
            <div className="text-sm text-gray-600 line-clamp-2 mt-1">${r.lecturer_notes}</div></div><${Badge} cls=${REV_STATUS[r.status].c}>${REV_STATUS[r.status].l}<//></div>
          <div className="text-xs text-gray-400 mt-2">${r.assignee_id ? 'PJ: ' + byId[r.assignee_id]?.name + ' · ' : ''}Deadline ${fmtDate(r.deadline)}</div></a>`; })}</div>`}</div>`}
    ${modal && h`<${TaskForm} onClose=${(tid) => { setModal(false); if (tid) go('#/tasks/' + tid); }} />`}</div>`;
}
