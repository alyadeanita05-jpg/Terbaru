import {
  React, h, useCtx, sb, inp, btn, btn2, card, Icon, Avatar, Badge, Empty, Field, Modal, PageTitle,
  fmtDate, ago, q, toast, confirmDel,
} from './lib.js';
import { validUrl } from './work.js';
const { useState, useMemo } = React;

// ---------------- Link & Referensi ----------------
const PLATFORMS = {
  canva: { l: 'Canva', c: 'bg-teal-100 text-teal-700', i: 'Cv' },
  figma: { l: 'Figma', c: 'bg-violet-100 text-violet-700', i: 'Fg' },
  gdocs: { l: 'Google Docs', c: 'bg-sky-100 text-sky-700', i: 'Dc' },
  gsheets: { l: 'Google Sheets', c: 'bg-green-100 text-green-700', i: 'Sh' },
  gslides: { l: 'Google Slides', c: 'bg-amber-100 text-amber-700', i: 'Sl' },
  gdrive: { l: 'Google Drive', c: 'bg-lav-100 text-lav-700', i: 'Dr' },
  github: { l: 'GitHub', c: 'bg-gray-800 text-white', i: 'Gh' },
  lainnya: { l: 'Website lainnya', c: 'bg-cream-200 text-navy-600', i: 'Ln' },
};
const detect = (u) => {
  try {
    const x = new URL(u); const host = x.hostname.replace(/^www\./, ''); const p = x.pathname;
    if (host.endsWith('canva.com')) return 'canva';
    if (host.endsWith('figma.com')) return 'figma';
    if (host === 'docs.google.com') return p.startsWith('/spreadsheets') ? 'gsheets' : p.startsWith('/presentation') ? 'gslides' : 'gdocs';
    if (host === 'drive.google.com') return 'gdrive';
    if (host.endsWith('github.com')) return 'github';
  } catch { /* url belum valid */ }
  return 'lainnya';
};
const PlatChip = ({ p }) => h`<span className=${'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ' + (PLATFORMS[p] || PLATFORMS.lainnya).c}>${(PLATFORMS[p] || PLATFORMS.lainnya).i}</span>`;

function LinkForm({ link, onClose }) {
  const { d, group, user, reload, log } = useCtx();
  const [f, setF] = useState({ title: link?.title || '', url: link?.url || '', platform: link?.platform || 'lainnya', description: link?.description || '', task_id: link?.task_id || '' });
  const [touchedPlat, setTP] = useState(!!link);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onUrl = (e) => { const url = e.target.value; setF({ ...f, url, platform: touchedPlat ? f.platform : detect(url.trim()) }); };

  async function save(e) {
    e.preventDefault(); setErr('');
    const url = f.url.trim();
    if (!f.title.trim()) return setErr('Judul wajib diisi.');
    if (!url) return setErr('URL wajib diisi.');
    if (!validUrl(url)) return setErr('URL tidak valid. Gunakan alamat lengkap, mis. https://www.canva.com/...');
    const body = { title: f.title.trim(), url, platform: f.platform, description: f.description.trim() || null, task_id: f.task_id || null };
    setBusy(true);
    const r = link ? await q(sb.from('resource_links').update(body).eq('id', link.id), 'Link diperbarui')
      : await q(sb.from('resource_links').insert({ ...body, group_id: group.id, user_id: user.id }), 'Link ditambahkan');
    if (!r.error) { await log(`${link ? 'memperbarui' : 'menambahkan'} link referensi "${body.title}"`, body.task_id); await reload(['links', 'activity']); onClose(); }
    setBusy(false);
  }
  return h`<${Modal} title=${link ? 'Edit link' : 'Tambah link & referensi'} onClose=${onClose}>
    <form onSubmit=${save}>
      <${Field} label="Judul *"><input className=${inp} value=${f.title} onChange=${set('title')} placeholder="mis. Desain dashboard (Figma)" autoFocus /><//>
      <${Field} label="URL *"><input className=${inp} value=${f.url} onChange=${onUrl} placeholder="https://" inputMode="url" /><//>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <${Field} label="Platform"><select className=${inp} value=${f.platform} onChange=${(e) => { setTP(true); set('platform')(e); }}>${Object.entries(PLATFORMS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select><//>
        <${Field} label="Tugas terkait"><select className=${inp} value=${f.task_id} onChange=${set('task_id')}><option value="">Tanpa tugas tertentu</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select><//></div>
      <${Field} label="Deskripsi"><textarea rows="2" className=${inp} value=${f.description} onChange=${set('description')}></textarea><//>
      ${err && h`<div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">${err}</div>`}
      <div className="flex justify-end gap-2"><button type="button" className=${btn2} onClick=${onClose}>Batal</button><button className=${btn} disabled=${busy}>${busy ? 'Menyimpan...' : 'Simpan'}</button></div></form><//>`;
}

export function LinksPage() {
  const { d, byId, user, isLeader, reload, log } = useCtx();
  const [f, setF] = useState({ s: '', platform: '', task: '' });
  const [modal, setModal] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = useMemo(() => d.links.filter((l) => (!f.platform || l.platform === f.platform) && (!f.task || l.task_id === f.task) &&
    (!f.s || (l.title + ' ' + l.url + ' ' + (l.description || '')).toLowerCase().includes(f.s.toLowerCase()))), [d.links, f]);
  async function del(l) {
    if (!confirmDel(`Hapus link "${l.title}"?`)) return;
    const r = await q(sb.from('resource_links').delete().eq('id', l.id), 'Link dihapus');
    if (!r.error) { await log(`menghapus link referensi "${l.title}"`, l.task_id); reload(['links', 'activity']); }
  }
  return h`<div className="fade-in"><${PageTitle} title="Link & Referensi" sub="Simpan tautan hasil kerja di Canva, Figma, Google Docs, GitHub, dan lainnya"
    right=${h`<button className=${btn} onClick=${() => setModal('new')}><${Icon} n="plus" size=${16} />Tambah Link</button>`} />
    <div className="mb-4 flex flex-wrap gap-2">
      <input className=${inp + ' !w-auto min-w-[200px] flex-1'} placeholder="Cari judul, URL, atau deskripsi…" value=${f.s} onChange=${set('s')} />
      <select className=${inp + ' !w-auto'} value=${f.platform} onChange=${set('platform')}><option value="">Semua platform</option>${Object.entries(PLATFORMS).map(([k, v]) => h`<option key=${k} value=${k}>${v.l}</option>`)}</select>
      <select className=${inp + ' !w-auto max-w-[220px]'} value=${f.task} onChange=${set('task')}><option value="">Semua tugas</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select></div>
    ${list.length === 0 ? h`<div className=${card}><${Empty} title=${d.links.length ? 'Tidak ada link yang cocok' : 'Belum ada link'} text="Simpan link dokumen, desain, atau repositori agar mudah ditemukan seluruh anggota."
        action=${h`<button className=${btn} onClick=${() => setModal('new')}><${Icon} n="plus" size=${16} />Tambah link</button>`} /></div>`
      : h`<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${list.map((l) => {
        const task = d.tasks.find((t) => t.id === l.task_id); const pl = PLATFORMS[l.platform] || PLATFORMS.lainnya;
        let host = ''; try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch { /* abaikan */ }
        return h`<article key=${l.id} className=${card + ' lift flex flex-col p-4'}>
          <div className="flex items-start gap-3"><${PlatChip} p=${l.platform} />
            <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-gray-900" title=${l.title}>${l.title}</h3><div className="truncate text-xs text-gray-400">${host}</div>
              <div className="mt-1"><${Badge} cls=${pl.c}>${pl.l}<//></div></div>
            ${(l.user_id === user.id || isLeader) && h`<div className="flex shrink-0 gap-0.5"><button className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" onClick=${() => setModal(l)} aria-label="Edit"><${Icon} n="edit" size=${15} /></button>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick=${() => del(l)} aria-label="Hapus"><${Icon} n="trash" size=${15} /></button></div>`}</div>
          ${l.description && h`<p className="mt-3 line-clamp-3 text-sm text-gray-600">${l.description}</p>`}
          ${task && h`<a href=${'#/tasks/' + task.id} className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-lav-100 px-2.5 py-0.5 text-xs font-medium text-lav-700">${task.title}</a>`}
          <div className="mt-auto flex items-center justify-between gap-2 pt-4"><div className="flex min-w-0 items-center gap-2 text-xs text-gray-400"><${Avatar} p=${byId[l.user_id]} size=${22} /><span className="truncate">${byId[l.user_id]?.name || 'Anggota'} · ${fmtDate(l.created_at.slice(0, 10))}</span></div>
            <a href=${l.url} target="_blank" rel="noopener noreferrer" className=${btn + ' !px-3 !py-1.5'}><${Icon} n="out" size=${14} />Buka Link</a></div></article>`;
      })}</div>`}
    ${modal && h`<${LinkForm} link=${modal === 'new' ? undefined : modal} onClose=${() => setModal(null)} />`}</div>`;
}

// ---------------- File ----------------
const EXT = { pdf: ['PDF', 'bg-red-100 text-red-700'], doc: ['DOC', 'bg-sky-100 text-sky-700'], docx: ['DOCX', 'bg-sky-100 text-sky-700'], xls: ['XLS', 'bg-green-100 text-green-700'], xlsx: ['XLSX', 'bg-green-100 text-green-700'],
  ppt: ['PPT', 'bg-orange-100 text-orange-700'], pptx: ['PPTX', 'bg-orange-100 text-orange-700'], jpg: ['JPG', 'bg-lav-100 text-lav-700'], jpeg: ['JPEG', 'bg-lav-100 text-lav-700'], png: ['PNG', 'bg-lav-100 text-lav-700'] };
const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
const sizeText = (b) => (b == null ? '-' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const MAX = 20 * 1024 * 1024;

function UploadModal({ onClose }) {
  const { d, group, user, reload, log } = useCtx();
  const [file, setFile] = useState(null);
  const [task, setTask] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pick = (e) => {
    const x = e.target.files[0]; setErr('');
    if (!x) return setFile(null);
    if (!EXT[extOf(x.name)]) { setFile(null); return setErr('Jenis file tidak didukung. Gunakan PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, atau PNG.'); }
    if (x.size > MAX) { setFile(null); return setErr('Ukuran file maksimal 20 MB.'); }
    setFile(x);
  };
  async function upload() {
    if (!file) return setErr('Pilih file terlebih dahulu.');
    setBusy(true); setErr('');
    const path = `${group.id}/${task || 'umum'}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const up = await sb.storage.from('attachments').upload(path, file, { contentType: file.type || undefined });
    if (up.error) { setBusy(false); return setErr('Gagal mengunggah: ' + up.error.message); }
    const ins = await sb.from('attachments').insert({ group_id: group.id, task_id: task || null, user_id: user.id, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type || null });
    if (ins.error) { await sb.storage.from('attachments').remove([path]); setBusy(false); return setErr('Gagal menyimpan data file: ' + ins.error.message); }
    await log(`mengunggah file ${file.name}`, task || null);
    await reload(['attachments', 'activity']);
    toast('File berhasil diunggah'); setBusy(false); onClose();
  }
  return h`<${Modal} title="Unggah file" onClose=${() => !busy && onClose()}>
    <label className="mb-3 flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-lav-300 bg-lav-50 px-4 py-8 text-center transition-colors hover:bg-lav-100">
      <${Icon} n="clip" size=${24} className="text-navy-600" /><span className="text-sm font-semibold text-navy-600">${file ? file.name : 'Pilih file dari perangkat'}</span>
      <span className="text-xs text-gray-500">${file ? sizeText(file.size) : 'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG · maks. 20 MB'}</span>
      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange=${pick} /></label>
    <${Field} label="Tugas terkait (opsional)"><select className=${inp} value=${task} onChange=${(e) => setTask(e.target.value)}><option value="">Tanpa tugas tertentu</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select><//>
    ${err && h`<div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">${err}</div>`}
    <div className="flex justify-end gap-2"><button className=${btn2} onClick=${onClose} disabled=${busy}>Batal</button><button className=${btn} onClick=${upload} disabled=${busy || !file}>${busy ? 'Mengunggah...' : 'Unggah'}</button></div><//>`;
}

export function FilesPage() {
  const { d, byId, user, isLeader, reload, log } = useCtx();
  const [f, setF] = useState({ s: '', type: '', task: '' });
  const [up, setUp] = useState(false);
  const [prev, setPrev] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const types = useMemo(() => [...new Set(d.attachments.map((a) => extOf(a.file_name)))].sort(), [d.attachments]);
  const list = d.attachments.filter((a) => (!f.type || extOf(a.file_name) === f.type) && (!f.task || a.task_id === f.task) && (!f.s || a.file_name.toLowerCase().includes(f.s.toLowerCase())))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function url(a, download) {
    const r = await q(sb.storage.from('attachments').createSignedUrl(a.file_path, 300, download ? { download: a.file_name } : undefined));
    return r.error ? null : r.data.signedUrl;
  }
  async function open(a) {
    const e = extOf(a.file_name);
    const u = await url(a, false); if (!u) return;
    if (['jpg', 'jpeg', 'png'].includes(e)) setPrev({ a, u }); else window.open(u, '_blank', 'noopener');
  }
  async function download(a) { const u = await url(a, true); if (u) window.location.assign(u); }
  async function del(a) {
    if (!confirmDel(`Hapus file "${a.file_name}"?`)) return;
    await sb.storage.from('attachments').remove([a.file_path]);
    const r = await q(sb.from('attachments').delete().eq('id', a.id), 'File dihapus');
    if (!r.error) { await log(`menghapus file ${a.file_name}`, a.task_id); reload(['attachments', 'activity']); }
  }
  return h`<div className="fade-in"><${PageTitle} title="File" sub="Dokumen dan gambar yang diunggah kelompok. Untuk tautan eksternal, gunakan Link & Referensi."
    right=${h`<button className=${btn} onClick=${() => setUp(true)}><${Icon} n="plus" size=${16} />Unggah File</button>`} />
    <div className="mb-4 flex flex-wrap gap-2">
      <input className=${inp + ' !w-auto min-w-[200px] flex-1'} placeholder="Cari nama file…" value=${f.s} onChange=${set('s')} />
      <select className=${inp + ' !w-auto'} value=${f.type} onChange=${set('type')}><option value="">Semua jenis</option>${types.map((t) => h`<option key=${t} value=${t}>${(EXT[t] || [t.toUpperCase()])[0]}</option>`)}</select>
      <select className=${inp + ' !w-auto max-w-[220px]'} value=${f.task} onChange=${set('task')}><option value="">Semua tugas</option>${d.tasks.map((t) => h`<option key=${t.id} value=${t.id}>${t.title}</option>`)}</select></div>
    ${list.length === 0 ? h`<div className=${card}><${Empty} title=${d.attachments.length ? 'Tidak ada file yang cocok' : 'Belum ada file'} text="Unggah laporan, presentasi, atau gambar agar bisa diakses seluruh anggota."
        action=${h`<button className=${btn} onClick=${() => setUp(true)}><${Icon} n="plus" size=${16} />Unggah file</button>`} /></div>`
      : h`<div className=${card + ' divide-y divide-gray-50'}>${list.map((a) => {
        const e = extOf(a.file_name); const [lab, cls] = EXT[e] || [e.toUpperCase() || 'FILE', 'bg-gray-100 text-gray-600']; const task = d.tasks.find((t) => t.id === a.task_id);
        return h`<div key=${a.id} className="flex flex-wrap items-center gap-3 p-3.5 transition-colors hover:bg-lav-50/50 sm:flex-nowrap">
          <span className=${'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ' + cls}>${lab}</span>
          <div className="min-w-0 flex-1"><button className="block max-w-full truncate text-left text-sm font-semibold text-gray-900 hover:underline" onClick=${() => open(a)}>${a.file_name}</button>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400"><span>${sizeText(a.file_size)}</span><span>· ${byId[a.user_id]?.name || 'Anggota'}</span><span>· ${fmtDate(a.created_at.slice(0, 10))}</span>
              ${task && h`<a href=${'#/tasks/' + task.id} className="rounded-full bg-lav-100 px-2 py-0.5 text-lav-700">${task.title}</a>`}</div></div>
          <div className="flex shrink-0 gap-1"><button className=${btn2 + ' !px-3 !py-1.5'} onClick=${() => open(a)}>Lihat</button>
            <button className=${btn2 + ' !px-3 !py-1.5'} onClick=${() => download(a)}>Unduh</button>
            ${(a.user_id === user.id || isLeader) && h`<button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick=${() => del(a)} aria-label="Hapus"><${Icon} n="trash" size=${16} /></button>`}</div></div>`;
      })}</div>`}
    ${up && h`<${UploadModal} onClose=${() => setUp(false)} />`}
    ${prev && h`<${Modal} title=${prev.a.file_name} onClose=${() => setPrev(null)} wide><img src=${prev.u} alt=${prev.a.file_name} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
      <div className="mt-3 flex justify-end"><button className=${btn} onClick=${() => download(prev.a)}>Unduh</button></div><//>`}</div>`;
}
