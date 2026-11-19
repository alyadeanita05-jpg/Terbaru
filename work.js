import {
  React, h, useCtx, sb, inp, btn, btn2, btnDanger, card, Icon, Avatar, Badge, Empty, Field, Modal, PageTitle, Skeleton,
  fmtDate, ago, q, toast, confirmDel, todayStr,
} from './lib.js';
const { useState, useMemo } = React;

export const WLOG = {
  belum: { l: 'Belum Mulai', c: 'bg-gray-100 text-gray-600' },
  proses: { l: 'Sedang Dikerjakan', c: 'bg-amber-100 text-amber-700' },
  selesai: { l: 'Selesai', c: 'bg-green-100 text-green-700' },
};

export const validUrl = (u) => { try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; } catch { return false; } };

function LogForm({ log: row, onClose }) {
  const { d, group, user, reload, log } = useCtx();
  const [f, setF] = useState({
    title: row?.title || '', task_id: row?.task_id || '', description: row?.description || '', result: row?.result || '',
    obstacles: row?.obstacles || '', status: row?.status || 'proses', work_date: row?.work_date || todayStr(), link_url: row?.link_url || '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr('');
    if (!f.title.trim()) return setErr('Judul catatan wajib diisi.');
    if (!f.work_date) return setErr('Tanggal pengerjaan wajib diisi.');
    if (f.link_url.trim() && !validUrl(f.link_url.trim())) return setErr('Link harus diawali http:// atau https://');
    const body = {
      title: f.title.trim(), task_id: f.task_id || null, description: f.description.trim() || null, result: f.result.trim() || null,
      obstacles: f.obstacles.trim() || null, status: f.status, work_date: f.work_date, link_url: f.link_url.trim() || null,
    };
    setBusy(true);
    const r = row
      ? await q(sb.from('work_logs').update({ ...body, updated_at: new Date().toISOString() }).eq('id', row.id), 'Catatan diperbarui')
      : await q(sb.from('work_logs').insert({ ...body, group_id: group.id, user_id: user.id }), 'Catatan ditambahkan');
    if (!r.error) {
      await log(`${row ? 'memperbarui' : 'menambahkan'} catatan pengerjaan "${body.title}"`, body.task_id);
      await reload(['workLogs', 'activity']);
      onClose(true);
    }
    setBusy(false);
  }
  return h`<${Modal} title=${row ? 'Edit catatan pengerjaan' : 'Tambah catatan pengerjaan'} onClose=${() => onClose(false)} wide>
    <form onSubmit=${save}>
      <${Field} label="Judul catatan *"><input className=${inp} value=${f.title} onChange=${set('title')} placeholder="mis. Membersihkan dataset penjualan" autoFocus /><//>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <${Field} label="Tugas terkait"><select className=${inp} value=${f.task_id} onChange=${set('task_id')}><option value="">Tanpa tugas tertentu</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select><//>
        <${Field} label="Tanggal pengerjaan *"><input type="date" className=${inp} value=${f.work_date} onChange=${set('work_date')} /><//></div>
      <${Field} label="Deskripsi pekerjaan"><textarea rows="3" className=${inp} value=${f.description} onChange=${set('description')} placeholder="Apa yang kamu kerjakan?"></textarea><//>
      <${Field} label="Hasil pekerjaan"><textarea rows="2" className=${inp} value=${f.result} onChange=${set('result')} placeholder="Hasil / output yang sudah jadi"></textarea><//>
      <${Field} label="Kendala"><textarea rows="2" className=${inp} value=${f.obstacles} onChange=${set('obstacles')} placeholder="Hambatan yang dialami (jika ada)"></textarea><//>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <${Field} label="Status pengerjaan"><select className=${inp} value=${f.status} onChange=${set('status')}>${Object.entries(WLOG).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select><//>
        <${Field} label="Link pendukung (opsional)"><input className=${inp} value=${f.link_url} onChange=${set('link_url')} placeholder="https://" inputMode="url" /><//></div>
      <p className="mb-3 rounded-xl bg-lav-50 px-3 py-2 text-xs text-lav-700">Status di sini hanya untuk catatan pribadi Anda. Status tugas kelompok tidak ikut berubah.</p>
      ${err && h`<div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">${err}</div>`}
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${() => onClose(false)}>Batal</button>
        <button className=${btn} disabled=${busy}>${busy ? 'Menyimpan...' : 'Simpan'}</button></div></form><//>`;
}

export function WorkLogCard({ w, onEdit, onDelete }) {
  const { d, byId, user, isLeader } = useCtx();
  const task = d.tasks.find((t) => t.id === w.task_id);
  const mineOrLeader = w.user_id === user.id || isLeader;
  const Row = ({ label, text }) => text ? h`<div><div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">${label}</div><p className="whitespace-pre-wrap text-sm text-gray-700">${text}</p></div>` : null;
  return h`<article className=${card + ' lift p-4'}>
    <div className="flex items-start gap-3"><${Avatar} p=${byId[w.user_id]} size=${38} />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-gray-900">${byId[w.user_id]?.name || 'Anggota'}</span><${Badge} cls=${WLOG[w.status].c}>${WLOG[w.status].l}<//></div>
        <div className="text-xs text-gray-400">${fmtDate(w.work_date)} · diperbarui ${ago(w.updated_at)}</div></div>
      ${mineOrLeader && h`<div className="flex shrink-0 gap-1"><button className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" onClick=${() => onEdit(w)} aria-label="Edit"><${Icon} n="edit" size=${16} /></button>
        <button className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick=${() => onDelete(w)} aria-label="Hapus"><${Icon} n="trash" size=${16} /></button></div>`}</div>
    <h3 className="mt-3 font-semibold text-gray-900">${w.title}</h3>
    ${task && h`<a href=${'#/tasks/' + task.id} className="mt-1 inline-flex items-center gap-1 rounded-full bg-lav-100 px-2.5 py-0.5 text-xs font-medium text-lav-700 hover:bg-lav-200"><${Icon} n="check" size=${12} />${task.title}</a>`}
    <div className="mt-3 space-y-2.5"><${Row} label="Deskripsi" text=${w.description} /><${Row} label="Hasil" text=${w.result} /><${Row} label="Kendala" text=${w.obstacles} /></div>
    ${w.link_url && validUrl(w.link_url) && h`<a href=${w.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:underline"><${Icon} n="link" size=${14} />Buka link pendukung</a>`}</article>`;
}

export function WorkPage() {
  const { d, members, user, reload, log } = useCtx();
  const [scope, setScope] = useState('mine');
  const [f, setF] = useState({ s: '', task: '', status: '', member: '' });
  const [modal, setModal] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = useMemo(() => d.workLogs.filter((w) =>
    (scope === 'all' || w.user_id === user.id) && (!f.task || w.task_id === f.task) && (!f.status || w.status === f.status) && (!f.member || w.user_id === f.member) &&
    (!f.s || (w.title + ' ' + (w.description || '') + ' ' + (w.result || '')).toLowerCase().includes(f.s.toLowerCase())))
    .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.created_at.localeCompare(a.created_at)), [d.workLogs, scope, f, user.id]);
  const mineAll = d.workLogs.filter((w) => w.user_id === user.id);

  async function del(w) {
    if (!confirmDel(`Hapus catatan "${w.title}"?`)) return;
    const r = await q(sb.from('work_logs').delete().eq('id', w.id), 'Catatan dihapus');
    if (!r.error) { await log(`menghapus catatan pengerjaan "${w.title}"`, w.task_id); reload(['workLogs', 'activity']); }
  }
  const chips = [['Total catatan', mineAll.length], ['Sedang dikerjakan', mineAll.filter((w) => w.status === 'proses').length], ['Selesai', mineAll.filter((w) => w.status === 'selesai').length]];

  return h`<div className="fade-in"><${PageTitle} title="Pengerjaan Saya" sub="Catat pekerjaan yang benar-benar kamu lakukan. Anggota lain bisa melihatnya, tetapi hanya kamu yang bisa mengubahnya."
    right=${h`<button className=${btn} onClick=${() => setModal('new')}><${Icon} n="plus" size=${16} />Tambah Catatan</button>`} />
    <div className="mb-4 grid grid-cols-3 gap-3">${chips.map(([l, v]) => h`<div key=${l} className=${card + ' p-3 sm:p-4'}><div className="text-2xl font-extrabold text-navy-600 sm:text-3xl">${v}</div><div className="text-xs text-gray-500">${l}</div></div>`)}</div>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">${[['mine', 'Catatan saya'], ['all', 'Semua anggota']].map(([k, l]) => h`<button key=${k} onClick=${() => setScope(k)} className=${'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ' + (scope === k ? 'bg-navy-600 text-white' : 'text-gray-500 hover:text-gray-800')}>${l}</button>`)}</div>
      <input className=${inp + ' !w-auto min-w-[180px] flex-1'} placeholder="Cari catatan…" value=${f.s} onChange=${set('s')} />
      <select className=${inp + ' !w-auto'} value=${f.status} onChange=${set('status')}><option value="">Semua status</option>${Object.entries(WLOG).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select>
      <select className=${inp + ' !w-auto max-w-[200px]'} value=${f.task} onChange=${set('task')}><option value="">Semua tugas</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select>
      ${scope === 'all' && h`<select className=${inp + ' !w-auto'} value=${f.member} onChange=${set('member')}><option value="">Semua anggota</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select>`}</div>
    ${list.length === 0 ? h`<div className=${card}><${Empty} title=${scope === 'mine' ? 'Belum ada catatan pengerjaan' : 'Belum ada catatan'} text="Tulis apa yang sudah kamu kerjakan, hasilnya, dan kendalanya agar kontribusimu tercatat."
        action=${h`<button className=${btn} onClick=${() => setModal('new')}><${Icon} n="plus" size=${16} />Tambah catatan pertama</button>`} /></div>`
      : h`<div className="grid gap-4 lg:grid-cols-2">${list.map((w) => h`<${WorkLogCard} key=${w.id} w=${w} onEdit=${setModal} onDelete=${del} />`)}</div>`}
    ${modal && h`<${LogForm} log=${modal === 'new' ? undefined : modal} onClose=${() => setModal(null)} />`}</div>`;
}
