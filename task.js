import {
  React, h, useCtx, sb, inp, btn, btn2, btnDanger, card, Field, Modal, Icon, Avatar, Bar, StatusBadge, PriorityBadge, Badge, Empty,
  STATUS, PRIORITY, WORK_STATUS, REV_STATUS, fmtDate, fmtDateTime, ago, deadlineLabel, daysUntil, taskProgress, memberTaskProgress,
  q, toast, confirmDel, go,
} from './lib.js';
const { useState, useEffect, useRef } = React;

// ======================= FORM TUGAS =======================
export function TaskForm({ task, defaults = {}, onClose }) {
  const { d, group, user, members, notify, log, reload, me } = useCtx();
  const [f, setF] = useState({
    title: task?.title || '', description: task?.description || '',
    course_id: task?.course_id || defaults.course_id || d.courses[0]?.id || '',
    week_id: task?.week_id || defaults.week_id || '',
    start_date: task?.start_date || '', deadline: task?.deadline || '',
    priority: task?.priority || 'sedang', status: task?.status || 'belum', reference_link: task?.reference_link || '',
  });
  const [assigned, setAssigned] = useState(task ? d.taskMembers.filter((m) => m.task_id === task.id).map((m) => m.user_id) : []);
  const [busy, setBusy] = useState(false);
  const weeks = d.weeks.filter((w) => w.course_id === f.course_id).sort((a, b) => a.number - b.number);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (id) => setAssigned(assigned.includes(id) ? assigned.filter((x) => x !== id) : [...assigned, id]);
  const allIds = members.map((m) => m.user_id);

  async function save(e) {
    e.preventDefault();
    if (!f.course_id) { toast('Pilih mata kuliah terlebih dahulu', 'error'); return; }
    if (f.start_date && f.deadline && f.deadline < f.start_date) { toast('Deadline tidak boleh sebelum tanggal mulai', 'error'); return; }
    setBusy(true);
    const body = {
      title: f.title.trim(), description: f.description.trim() || null, course_id: f.course_id, week_id: f.week_id || null,
      start_date: f.start_date || null, deadline: f.deadline || null, priority: f.priority, status: f.status,
      reference_link: f.reference_link.trim() || null,
    };
    let id = task?.id;
    if (task) {
      const r = await q(sb.from('tasks').update(body).eq('id', id));
      if (r.error) return setBusy(false);
      if (task.deadline !== body.deadline) {
        await notify(allIds, 'deadline', `${me.name} mengubah deadline tugas "${body.title}" menjadi ${fmtDate(body.deadline)}`, id);
        await log(`mengubah deadline tugas ${body.title}`, id);
      } else await log(`mengedit tugas ${body.title}`, id);
    } else {
      const r = await q(sb.from('tasks').insert({ ...body, group_id: group.id, created_by: user.id }).select().single());
      if (r.error) return setBusy(false);
      id = r.data.id;
      await notify(allIds, 'task', `${me.name} menambahkan tugas baru "${body.title}"`, id);
      await log(`menambahkan tugas ${body.title}`, id);
    }
    // sinkronkan anggota yang ditugaskan
    const before = task ? d.taskMembers.filter((m) => m.task_id === id).map((m) => m.user_id) : [];
    const added = assigned.filter((x) => !before.includes(x));
    const removed = before.filter((x) => !assigned.includes(x));
    if (added.length) {
      await q(sb.from('task_members').insert(added.map((u) => ({ task_id: id, user_id: u, group_id: group.id }))));
      await notify(added, 'assign', `${me.name} membagikan pekerjaan "${body.title}" kepada Anda`, id);
    }
    if (removed.length) await q(sb.from('task_members').delete().eq('task_id', id).in('user_id', removed));
    await reload(['tasks', 'taskMembers', 'work', 'activity', 'notifs']);
    setBusy(false);
    toast(task ? 'Tugas diperbarui' : 'Tugas ditambahkan');
    onClose(id);
  }

  return h`<${Modal} title=${task ? 'Edit Tugas' : 'Tambah Tugas'} onClose=${() => onClose()} wide>
    <form onSubmit=${save}>
      <${Field} label="Nama tugas"><input className=${inp} required value=${f.title} onChange=${set('title')} placeholder="mis. Pembuatan PPT" /><//>
      <${Field} label="Deskripsi"><textarea className=${inp} rows="3" value=${f.description} onChange=${set('description')}></textarea><//>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <${Field} label="Mata kuliah"><select className=${inp} required value=${f.course_id} onChange=${(e) => setF({ ...f, course_id: e.target.value, week_id: '' })}>
          <option value="">Pilih...</option>${d.courses.map((c) => h`<option key=${c.id} value=${c.id}>${c.name}</option>`)}</select><//>
        <${Field} label="Week pengerjaan"><select className=${inp} value=${f.week_id} onChange=${set('week_id')}>
          <option value="">Tanpa week</option>${weeks.map((w) => h`<option key=${w.id} value=${w.id}>Week ${w.number}${w.title ? ' — ' + w.title : ''}</option>`)}</select><//>
        <${Field} label="Tanggal mulai"><input type="date" className=${inp} value=${f.start_date} onChange=${set('start_date')} /><//>
        <${Field} label="Deadline"><input type="date" className=${inp} value=${f.deadline} onChange=${set('deadline')} /><//>
        <${Field} label="Prioritas"><select className=${inp} value=${f.priority} onChange=${set('priority')}>
          ${Object.entries(PRIORITY).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select><//>
        <${Field} label="Status"><select className=${inp} value=${f.status} onChange=${set('status')}>
          ${Object.entries(STATUS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select><//>
      </div>
      <${Field} label="Link referensi"><input type="url" className=${inp} value=${f.reference_link} onChange=${set('reference_link')} placeholder="https://..." /><//>
      <div className="mb-3"><span className="block text-xs font-medium text-gray-500 mb-1.5">Ditugaskan kepada (bisa lebih dari satu)</span>
        <div className="flex flex-wrap gap-2">${members.map((m) => h`<button type="button" key=${m.user_id} onClick=${() => toggle(m.user_id)}
          className=${'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ' + (assigned.includes(m.user_id) ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
          <${Avatar} p=${m.profile} size=${20} />${m.profile?.name}</button>`)}</div></div>
      <p className="text-xs text-gray-400 mb-4">Lampiran file dapat diunggah di halaman detail tugas setelah tugas disimpan.</p>
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${() => onClose()}>Batal</button>
        <button className=${btn} disabled=${busy}>${busy ? 'Menyimpan...' : 'Simpan'}</button></div>
    </form><//>`;
}

// ======================= BARIS TUGAS =======================
export function TaskRow({ t }) {
  const { d, byId } = useCtx();
  const course = d.courses.find((c) => c.id === t.course_id);
  const week = d.weeks.find((w) => w.id === t.week_id);
  const p = taskProgress(d, t.id);
  const people = d.taskMembers.filter((m) => m.task_id === t.id).map((m) => byId[m.user_id]);
  const late = t.deadline && t.status !== 'selesai' && daysUntil(t.deadline) < 0;
  return h`<a href=${'#/tasks/' + t.id} className="lift block rounded-2xl border border-gray-100 bg-white p-3.5">
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <div className="min-w-0"><div className="font-medium text-gray-800 truncate">${t.title}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style=${{ background: course?.color || '#27293d' }}></span>${course?.name || '-'}${week ? ' · Week ' + week.number : ''}</div></div>
      <div className="flex items-center gap-1.5 flex-wrap"><${PriorityBadge} p=${t.priority} /><${StatusBadge} s=${t.status} /></div></div>
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1"><${Bar} value=${p} slim /></div><span className="text-xs text-gray-500 w-9 text-right">${p}%</span>
      <div className="flex -space-x-1.5">${people.slice(0, 4).map((x) => h`<span key=${x?.id} className="ring-2 ring-white rounded-full"><${Avatar} p=${x} size=${22} /></span>`)}</div>
      <span className=${'text-xs ' + (late ? 'text-red-600 font-medium' : 'text-gray-400')}>${t.deadline ? deadlineLabel(t.deadline) : ''}</span></div></a>`;
}

// ======================= KARTU PROGRES ANGGOTA =======================
function MemberCard({ task, uid }) {
  const { d, byId, user, isLeader, group, reload, syncStatus, log, notify, members, me } = useCtx();
  const p = byId[uid];
  const work = d.work.find((w) => w.task_id === task.id && w.user_id === uid);
  const items = d.checks.filter((c) => c.task_id === task.id && c.user_id === uid);
  const canEdit = uid === user.id || isLeader;
  const [draft, setDraft] = useState({ responsibility: '', done_notes: '', todo_notes: '', obstacles: '', status: 'belum' });
  const [newText, setNewText] = useState('');
  const dirty = useRef(false);
  const prog = memberTaskProgress(d, task.id, uid);

  useEffect(() => {
    if (work && !dirty.current) setDraft({
      responsibility: work.responsibility || '', done_notes: work.done_notes || '', todo_notes: work.todo_notes || '',
      obstacles: work.obstacles || '', status: work.status,
    });
  }, [work?.updated_at, work?.id]);

  const edit = (k) => (e) => { dirty.current = true; setDraft({ ...draft, [k]: e.target.value }); };

  async function save() {
    const body = { ...draft, updated_by: user.id };
    const r = work
      ? await q(sb.from('member_work_items').update(body).eq('id', work.id), 'Catatan disimpan')
      : await q(sb.from('member_work_items').insert({ ...body, task_id: task.id, user_id: uid, group_id: group.id }), 'Catatan disimpan');
    if (r.error) return;
    dirty.current = false;
    await log(`memperbarui catatan progres${uid === user.id ? '' : ' ' + p?.name} pada tugas ${task.title}`, task.id);
    await notify(members.map((m) => m.user_id), 'progress', `${me.name} memperbarui progres "${task.title}"`, task.id);
    reload(['work', 'activity', 'notifs']);
  }
  async function addItem(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    const r = await q(sb.from('checklists').insert({ group_id: group.id, task_id: task.id, user_id: uid, text: newText.trim() }));
    if (r.error) return;
    setNewText('');
    await syncStatus(task.id, uid);
    await log(`menambahkan pekerjaan "${newText.trim()}" pada tugas ${task.title}`, task.id);
    reload(['checks', 'work', 'tasks', 'activity']);
  }
  async function toggle(it) {
    const r = await q(sb.from('checklists').update({ is_done: !it.is_done, done_at: !it.is_done ? new Date().toISOString() : null }).eq('id', it.id));
    if (r.error) return;
    await syncStatus(task.id, uid);
    if (!it.is_done) {
      await log(`menyelesaikan pekerjaan "${it.text}" pada tugas ${task.title}`, task.id);
      await notify(members.map((m) => m.user_id), 'check', `${me.name} menyelesaikan "${it.text}" di ${task.title}`, task.id);
    }
    reload(['checks', 'work', 'tasks', 'activity', 'notifs']);
  }
  async function del(it) {
    await q(sb.from('checklists').delete().eq('id', it.id));
    await syncStatus(task.id, uid);
    reload(['checks', 'work', 'tasks']);
  }

  const upd = work?.updated_by ? byId[work.updated_by] : null;
  return h`<div className=${card + ' p-4'}>
    <div className="flex items-center gap-3 mb-3">
      <${Avatar} p=${p} size=${40} />
      <div className="flex-1 min-w-0"><div className="font-semibold text-gray-800">${p?.name}${uid === user.id ? ' (Anda)' : ''}</div>
        <div className="flex items-center gap-2 text-xs text-gray-400">${items.filter((i) => i.is_done).length}/${items.length} pekerjaan selesai</div></div>
      <div className="text-right"><div className="text-lg font-bold text-pink-600">${prog}%</div></div></div>
    <${Bar} value=${prog} />
    ${!canEdit && h`<div className="text-xs text-gray-400 mt-2">Hanya pemilik atau ketua yang dapat mengubah bagian ini.</div>`}
    <div className="grid md:grid-cols-2 gap-x-4 mt-4">
      <${Field} label="Bagian pekerjaan / tanggung jawab"><textarea rows="2" className=${inp} disabled=${!canEdit} value=${draft.responsibility} onChange=${edit('responsibility')} placeholder="mis. Slide latar belakang & analisis"></textarea><//>
      <${Field} label="Kendala yang dihadapi"><textarea rows="2" className=${inp} disabled=${!canEdit} value=${draft.obstacles} onChange=${edit('obstacles')}></textarea><//>
      <${Field} label="Sudah dikerjakan"><textarea rows="3" className=${inp} disabled=${!canEdit} value=${draft.done_notes} onChange=${edit('done_notes')}></textarea><//>
      <${Field} label="Belum dikerjakan"><textarea rows="3" className=${inp} disabled=${!canEdit} value=${draft.todo_notes} onChange=${edit('todo_notes')}></textarea><//>
    </div>
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <select className=${inp + ' !w-auto'} disabled=${!canEdit} value=${draft.status} onChange=${edit('status')}>
        ${Object.entries(WORK_STATUS).map(([k, v]) => h`<option key=${k} value=${k}>${v}</option>`)}</select>
      ${canEdit && h`<button className=${btn} onClick=${save}>Simpan catatan</button>`}
      <span className="text-xs text-gray-400">${work ? `Terakhir diperbarui ${fmtDateTime(work.updated_at)}${upd ? ' oleh ' + upd.name : ''}` : 'Belum ada catatan'}</span></div>
    <div className="border-t border-gray-100 pt-3">
      <div className="text-xs font-medium text-gray-500 mb-2">Checklist pekerjaan</div>
      ${items.length === 0 && h`<div className="text-sm text-gray-400 mb-2">Belum ada pekerjaan. Tambahkan di bawah.</div>`}
      <ul className="space-y-1.5 mb-2">${items.map((it) => h`<li key=${it.id} className="flex items-center gap-2 group">
        <input type="checkbox" className="h-4 w-4 accent-pink-500" checked=${it.is_done} disabled=${!canEdit} onChange=${() => toggle(it)} />
        <span className=${'flex-1 text-sm ' + (it.is_done ? 'line-through text-gray-400' : 'text-gray-700')}>${it.text}</span>
        ${canEdit && h`<button onClick=${() => del(it)} className="text-gray-300 hover:text-red-500 sm:opacity-0 group-hover:opacity-100"><${Icon} n="x" size=${14} /></button>`}</li>`)}</ul>
      ${canEdit && h`<form onSubmit=${addItem} className="flex gap-2"><input className=${inp} value=${newText} onChange=${(e) => setNewText(e.target.value)} placeholder="+ Tambah pekerjaan baru" />
        <button className=${btn2}><${Icon} n="plus" size=${16} /></button></form>`}</div></div>`;
}

// ======================= KOMENTAR =======================
function renderBody(body, members) {
  const names = members.map((m) => m.profile?.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return body;
  const esc = names.map((n) => n.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')).join('|');
  const re = new RegExp('(@(?:' + esc + '))', 'g');
  return body.split(re).map((p, i) => (p.startsWith('@') && names.includes(p.slice(1))
    ? h`<span key=${i} className="text-pink-600 font-medium bg-pink-50 rounded px-0.5">${p}</span>` : p));
}

function Comments({ task }) {
  const { d, byId, user, isLeader, group, members, reload, log, notify, me } = useCtx();
  const [body, setBody] = useState('');
  const [reply, setReply] = useState(null);
  const all = d.comments.filter((c) => c.task_id === task.id);
  const top = all.filter((c) => !c.parent_id);
  const ta = useRef();

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const mentions = members.filter((m) => m.user_id !== user.id && text.includes('@' + m.profile?.name)).map((m) => m.user_id);
    const r = await q(sb.from('comments').insert({ group_id: group.id, task_id: task.id, user_id: user.id, parent_id: reply?.id || null, body: text, mentions }));
    if (r.error) return;
    setBody(''); setReply(null);
    await notify(mentions, 'mention', `${me.name} menyebut Anda di tugas "${task.title}"`, task.id);
    const others = d.taskMembers.filter((m) => m.task_id === task.id).map((m) => m.user_id).filter((x) => !mentions.includes(x));
    await notify(others, 'comment', `${me.name} berkomentar di tugas "${task.title}"`, task.id);
    await log(`memberi komentar pada tugas ${task.title}`, task.id);
    reload(['comments', 'activity', 'notifs']);
  }
  async function del(c) {
    if (!confirmDel('Hapus komentar ini?')) return;
    await q(sb.from('comments').delete().eq('id', c.id), 'Komentar dihapus');
    reload(['comments']);
  }
  const Item = ({ c, child }) => {
    const p = byId[c.user_id];
    return h`<div className=${'flex gap-3 ' + (child ? 'ml-10 mt-3' : '')}>
      <${Avatar} p=${p} size=${child ? 28 : 34} />
      <div className="flex-1 min-w-0"><div className="rounded-2xl bg-gray-50 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs"><b className="text-gray-800">${p?.name}</b><span className="text-gray-400">${fmtDateTime(c.created_at)}</span></div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">${renderBody(c.body, members)}</div></div>
        <div className="flex gap-3 text-xs text-gray-400 mt-1 ml-2">
          ${!child && h`<button className="hover:text-pink-600" onClick=${() => { setReply(c); ta.current?.focus(); }}>Balas</button>`}
          ${(c.user_id === user.id || isLeader) && h`<button className="hover:text-red-500" onClick=${() => del(c)}>Hapus</button>`}</div></div></div>`;
  };
  return h`<div>
    ${top.length === 0 && h`<${Empty} title="Belum ada diskusi" text="Mulai diskusi: beri instruksi, tanyakan progres, atau sebut anggota dengan @nama." />`}
    <div className="space-y-4">${top.map((c) => h`<div key=${c.id}><${Item} c=${c} />
      ${all.filter((x) => x.parent_id === c.id).map((x) => h`<${Item} key=${x.id} c=${x} child />`)}</div>`)}</div>
    <form onSubmit=${send} className="mt-5 sticky bottom-0 bg-white pt-3 border-t border-gray-100">
      ${reply && h`<div className="text-xs text-gray-500 mb-1.5 flex items-center gap-2">Membalas ${byId[reply.user_id]?.name}
        <button type="button" onClick=${() => setReply(null)} className="text-pink-600">batal</button></div>`}
      <div className="flex flex-wrap gap-1.5 mb-2">${members.filter((m) => m.user_id !== user.id).map((m) => h`<button type="button" key=${m.user_id}
        onClick=${() => { setBody((b) => (b ? b + ' ' : '') + '@' + m.profile?.name + ' '); ta.current?.focus(); }}
        className="text-xs rounded-full bg-pink-50 text-pink-600 px-2.5 py-1 hover:bg-pink-100">@${m.profile?.name}</button>`)}</div>
      <div className="flex gap-2"><textarea ref=${ta} rows="2" className=${inp} value=${body} onChange=${(e) => setBody(e.target.value)} placeholder="Tulis pesan... gunakan @nama untuk mention"></textarea>
        <button className=${btn + ' self-end'}><${Icon} n="send" size=${16} /></button></div></form></div>`;
}

// ======================= REVISI =======================
export function RevisionForm({ task, rev, onClose }) {
  const { d, group, user, members, reload, notify, log, me } = useCtx();
  const [f, setF] = useState({
    section: rev?.section || '', lecturer_notes: rev?.lecturer_notes || '', assignee_id: rev?.assignee_id || '',
    deadline: rev?.deadline || '', status: rev?.status || 'baru', result_notes: rev?.result_notes || '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const body = { ...f, assignee_id: f.assignee_id || null, deadline: f.deadline || null };
    if (rev) {
      const r = await q(sb.from('revisions').update(body).eq('id', rev.id), 'Revisi diperbarui');
      if (r.error) return;
      const others = d.revisions.filter((x) => x.task_id === task.id && x.id !== rev.id);
      if (task.status === 'revisi' && body.status === 'selesai' && others.every((x) => x.status === 'selesai')) {
        await q(sb.from('tasks').update({ status: 'review' }).eq('id', task.id));
      }
      await log(`memperbarui revisi pada tugas ${task.title}`, task.id);
    } else {
      const r = await q(sb.from('revisions').insert({ ...body, group_id: group.id, task_id: task.id, created_by: user.id }), 'Revisi ditambahkan');
      if (r.error) return;
      // riwayat pengerjaan (checklist, catatan) tidak dihapus; tugas hanya dibuka kembali
      await q(sb.from('tasks').update({ status: 'revisi' }).eq('id', task.id));
      const targets = f.assignee_id ? [f.assignee_id] : members.map((m) => m.user_id);
      await notify(targets, 'revision', `${me.name} menambahkan revisi pada "${task.title}"`, task.id);
      await log(`menambahkan catatan revisi pada tugas ${task.title}`, task.id);
    }
    reload(['revisions', 'tasks', 'activity', 'notifs']);
    onClose();
  }
  return h`<${Modal} title=${rev ? 'Edit Revisi' : 'Tambah Revisi'} onClose=${onClose}>
    <form onSubmit=${save}>
      <${Field} label="Bagian yang perlu diperbaiki"><input className=${inp} required value=${f.section} onChange=${set('section')} /><//>
      <${Field} label="Catatan revisi dari dosen"><textarea rows="4" className=${inp} required value=${f.lecturer_notes} onChange=${set('lecturer_notes')}></textarea><//>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <${Field} label="Penanggung jawab"><select className=${inp} value=${f.assignee_id} onChange=${set('assignee_id')}>
          <option value="">Semua / belum ditentukan</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select><//>
        <${Field} label="Deadline revisi"><input type="date" className=${inp} value=${f.deadline} onChange=${set('deadline')} /><//>
        <${Field} label="Status revisi"><select className=${inp} value=${f.status} onChange=${set('status')}>
          ${Object.entries(REV_STATUS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select><//>
      </div>
      <${Field} label="Catatan hasil perbaikan"><textarea rows="3" className=${inp} value=${f.result_notes} onChange=${set('result_notes')}></textarea><//>
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${onClose}>Batal</button><button className=${btn}>Simpan</button></div>
    </form><//>`;
}

function Revisions({ task }) {
  const { d, byId, isLeader, reload } = useCtx();
  const [modal, setModal] = useState(null);
  const list = d.revisions.filter((r) => r.task_id === task.id);
  async function del(r) {
    if (!confirmDel('Hapus revisi ini?')) return;
    await q(sb.from('revisions').delete().eq('id', r.id), 'Revisi dihapus');
    reload(['revisions']);
  }
  return h`<div>
    <div className="flex justify-end mb-3"><button className=${btn} onClick=${() => setModal({})}><${Icon} n="plus" size=${16} />Tambah revisi</button></div>
    ${list.length === 0 && h`<${Empty} title="Belum ada revisi" text="Catat masukan dosen di sini. Riwayat pengerjaan tetap tersimpan." />`}
    <div className="space-y-3">${list.map((r) => h`<div key=${r.id} className="rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap justify-between gap-2"><div className="font-medium">${r.section}</div><${Badge} cls=${REV_STATUS[r.status].c}>${REV_STATUS[r.status].l}<//></div>
      <div className="text-sm text-gray-600 whitespace-pre-wrap mt-2">${r.lecturer_notes}</div>
      ${r.result_notes && h`<div className="mt-2 rounded-lg bg-green-50 text-green-800 text-sm p-2.5"><b>Hasil perbaikan:</b> ${r.result_notes}</div>`}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
        ${r.assignee_id && h`<span className="flex items-center gap-1.5"><${Avatar} p=${byId[r.assignee_id]} size=${20} />${byId[r.assignee_id]?.name}</span>`}
        <span>Deadline: ${fmtDate(r.deadline)}</span><span>Dibuat ${fmtDateTime(r.created_at)}</span>
        <span className="ml-auto flex gap-3"><button className="text-pink-600" onClick=${() => setModal(r)}>Edit</button>
          ${isLeader && h`<button className="text-red-500" onClick=${() => del(r)}>Hapus</button>`}</span></div></div>`)}</div>
    ${modal && h`<${RevisionForm} task=${task} rev=${modal.id ? modal : null} onClose=${() => setModal(null)} />`}</div>`;
}

// ======================= LAMPIRAN =======================
function Attachments({ task }) {
  const { d, byId, user, isLeader, group, reload, log } = useCtx();
  const [busy, setBusy] = useState(false);
  const list = d.attachments.filter((a) => a.task_id === task.id);
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast('Ukuran file maksimal 20 MB', 'error'); return; }
    setBusy(true);
    const path = `${group.id}/${task.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const up = await q(sb.storage.from('attachments').upload(path, file));
    if (!up.error) {
      await q(sb.from('attachments').insert({ group_id: group.id, task_id: task.id, user_id: user.id, file_name: file.name, file_path: path }), 'File diunggah');
      await log(`mengunggah lampiran ${file.name} pada tugas ${task.title}`, task.id);
      reload(['attachments', 'activity']);
    }
    setBusy(false); e.target.value = '';
  }
  async function open(a) {
    const r = await q(sb.storage.from('attachments').createSignedUrl(a.file_path, 120));
    if (!r.error) window.open(r.data.signedUrl, '_blank');
  }
  async function del(a) {
    if (!confirmDel('Hapus lampiran ini?')) return;
    await sb.storage.from('attachments').remove([a.file_path]);
    await q(sb.from('attachments').delete().eq('id', a.id), 'Lampiran dihapus');
    reload(['attachments']);
  }
  return h`<div>
    <label className=${btn + ' cursor-pointer mb-3'}><${Icon} n="clip" size=${16} />${busy ? 'Mengunggah...' : 'Unggah file'}<input type="file" className="hidden" onChange=${upload} disabled=${busy} /></label>
    ${list.length === 0 && h`<${Empty} title="Belum ada lampiran" />`}
    <ul className="divide-y divide-gray-100">${list.map((a) => h`<li key=${a.id} className="flex items-center gap-3 py-2.5">
      <${Icon} n="clip" size=${16} className="text-gray-400" />
      <button className="flex-1 text-left text-sm text-pink-600 hover:underline truncate" onClick=${() => open(a)}>${a.file_name}</button>
      <span className="text-xs text-gray-400 hidden sm:block">${byId[a.user_id]?.name} · ${ago(a.created_at)}</span>
      ${(isLeader || a.user_id === user.id) && h`<button onClick=${() => del(a)} className="text-gray-300 hover:text-red-500"><${Icon} n="trash" size=${16} /></button>`}</li>`)}</ul></div>`;
}

// ======================= DETAIL TUGAS =======================
export function TaskDetail({ id }) {
  const { d, isLeader, reload, log } = useCtx();
  const [tab, setTab] = useState('progres');
  const [edit, setEdit] = useState(false);
  const task = d.tasks.find((t) => t.id === id);
  if (!task) return h`<${Empty} title="Tugas tidak ditemukan" action=${h`<a href="#/tasks" className=${btn2}>Kembali</a>`} />`;
  const course = d.courses.find((c) => c.id === task.course_id);
  const week = d.weeks.find((w) => w.id === task.week_id);
  const uids = d.taskMembers.filter((m) => m.task_id === id).map((m) => m.user_id);
  const prog = taskProgress(d, id);
  const late = task.deadline && task.status !== 'selesai' && daysUntil(task.deadline) < 0;

  async function setStatus(s) {
    await q(sb.from('tasks').update({ status: s }).eq('id', id), 'Status diperbarui');
    await log(`mengubah status tugas ${task.title} menjadi ${STATUS[s].l}`, id);
    reload(['tasks', 'activity']);
  }
  async function del() {
    if (!confirmDel(`Hapus tugas "${task.title}" beserta seluruh catatan, komentar, dan revisinya?`)) return;
    const r = await q(sb.from('tasks').delete().eq('id', id), 'Tugas dihapus');
    if (!r.error) { await log(`menghapus tugas ${task.title}`); await reload(); go('#/courses/' + task.course_id); }
  }
  const counts = { komentar: d.comments.filter((c) => c.task_id === id).length, revisi: d.revisions.filter((r) => r.task_id === id).length, lampiran: d.attachments.filter((a) => a.task_id === id).length };
  const tabs = [['progres', 'Progres Anggota'], ['komentar', `Diskusi (${counts.komentar})`], ['revisi', `Revisi (${counts.revisi})`], ['lampiran', `Lampiran (${counts.lampiran})`]];

  return h`<div className="fade-in">
    <a href=${'#/courses/' + task.course_id} className="text-sm text-gray-400 hover:text-pink-600">← ${course?.name}${week ? ' · Week ' + week.number : ''}</a>
    <div className=${card + ' p-5 mt-2 mb-5'}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0"><h1 className="text-xl sm:text-2xl font-bold">${task.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2"><${PriorityBadge} p=${task.priority} />
            <span className=${'text-sm ' + (late ? 'text-red-600 font-medium' : 'text-gray-500')}>Deadline: ${fmtDate(task.deadline)}${task.deadline ? ' (' + deadlineLabel(task.deadline) + ')' : ''}</span>
            ${task.start_date && h`<span className="text-sm text-gray-400">Mulai: ${fmtDate(task.start_date)}</span>`}</div></div>
        <div className="flex flex-wrap gap-2 items-start">
          <select className=${inp + ' !w-auto'} value=${task.status} onChange=${(e) => setStatus(e.target.value)}>
            ${Object.entries(STATUS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select>
          <button className=${btn2} onClick=${() => setEdit(true)}><${Icon} n="edit" size=${15} />Edit</button>
          ${isLeader && h`<button className=${btnDanger} onClick=${del}><${Icon} n="trash" size=${15} /></button>`}</div></div>
      ${task.description && h`<p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">${task.description}</p>`}
      ${task.reference_link && h`<a href=${task.reference_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-pink-600 mt-2 hover:underline"><${Icon} n="link" size=${14} />Link referensi</a>`}
      <div className="mt-4 flex items-center gap-3"><div className="flex-1"><${Bar} value=${prog} /></div><span className="text-sm font-semibold">${prog}%</span></div>
      <div className="text-xs text-gray-400 mt-1">Progres tugas dihitung otomatis dari seluruh checklist anggota.</div>
      ${task.status === 'review' && h`<div className="mt-3 rounded-xl bg-violet-50 border border-violet-100 p-3 flex flex-wrap items-center gap-3 text-sm text-violet-800">
        Semua pekerjaan selesai dan menunggu persetujuan kelompok.
        <button className=${btn} onClick=${() => setStatus('selesai')}>Setujui: Selesai</button>
        <button className=${btn2} onClick=${() => setTab('revisi')}>Minta revisi</button></div>`}</div>
    <div className="flex gap-1 overflow-x-auto mb-4 border-b border-gray-200">${tabs.map(([k, l]) => h`<button key=${k} onClick=${() => setTab(k)}
      className=${'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ' + (tab === k ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-800')}>${l}</button>`)}</div>
    ${tab === 'progres' && h`<div className="space-y-4">
      ${uids.length === 0 && h`<${Empty} title="Belum ada anggota yang ditugaskan" text="Edit tugas ini lalu pilih satu atau beberapa anggota." action=${h`<button className=${btn} onClick=${() => setEdit(true)}>Tugaskan anggota</button>`} />`}
      ${uids.map((u) => h`<${MemberCard} key=${u} task=${task} uid=${u} />`)}</div>`}
    ${tab === 'komentar' && h`<div className=${card + ' p-4'}><${Comments} task=${task} /></div>`}
    ${tab === 'revisi' && h`<div className=${card + ' p-4'}><${Revisions} task=${task} /></div>`}
    ${tab === 'lampiran' && h`<div className=${card + ' p-4'}><${Attachments} task=${task} /></div>`}
    ${edit && h`<${TaskForm} task=${task} onClose=${() => setEdit(false)} />`}</div>`;
}
