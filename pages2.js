import {
  React, h, useCtx, sb, inp, btn, btn2, btnDanger, card, Field, Icon, Avatar, Bar, Ring, Empty, PageTitle, Badge, StatusBadge,
  PRIORITY, fmtDate, fmtDateTime, ago, deadlineLabel, daysUntil, ymd, todayStr, parseD,
  memberTaskProgress, userProgress, q, toast, confirmDel, go,
} from './lib.js';
import { ActivityItem } from './pages.js';
const { useState } = React;

// ======================= KALENDER =======================
export function CalendarPage() {
  const { d } = useCtx();
  const [view, setView] = useState('month');
  const [cur, setCur] = useState(new Date());
  const [sel, setSel] = useState(todayStr());
  const [fc, setFc] = useState('');
  const [fs, setFs] = useState('');
  const tasks = d.tasks.filter((t) => t.deadline && (!fc || t.course_id === fc) && (!fs || t.status === fs));
  const byDay = {};
  tasks.forEach((t) => { (byDay[t.deadline] = byDay[t.deadline] || []).push(t); });

  let days = [];
  if (view === 'month') {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    days = Array.from({ length: 42 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
  } else {
    const start = new Date(cur); start.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
    days = Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
  }
  const move = (n) => { const x = new Date(cur); if (view === 'month') x.setMonth(x.getMonth() + n); else x.setDate(x.getDate() + 7 * n); setCur(x); };
  const title = view === 'month'
    ? cur.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : `${days[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const upcoming = tasks.filter((t) => t.status !== 'selesai' && daysUntil(t.deadline) >= 0).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 8);
  const selTasks = byDay[sel] || [];

  const Chip = ({ t }) => h`<a href=${'#/tasks/' + t.id} onClick=${(e) => e.stopPropagation()} title=${t.title}
    className=${'block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ' + PRIORITY[t.priority].c + (t.status === 'selesai' ? ' line-through opacity-60' : '')}>${t.title}</a>`;

  return h`<div className="fade-in"><${PageTitle} title="Kalender" sub="Seluruh deadline dari semua mata kuliah" />
    <div className="flex flex-wrap gap-2 mb-4">
      <select className=${inp + ' !w-auto'} value=${fc} onChange=${(e) => setFc(e.target.value)}><option value="">Semua mata kuliah</option>${d.courses.map((c) => h`<option key=${c.id} value=${c.id}>${c.name}</option>`)}</select>
      <select className=${inp + ' !w-auto'} value=${fs} onChange=${(e) => setFs(e.target.value)}><option value="">Semua status</option><option value="belum">Belum Dikerjakan</option><option value="proses">Sedang Dikerjakan</option><option value="review">Menunggu Review</option><option value="revisi">Perlu Revisi</option><option value="selesai">Selesai</option></select>
      <div className="ml-auto flex gap-1 rounded-xl bg-white border border-gray-200 p-1">${[['month', 'Bulan'], ['week', 'Minggu']].map(([k, l]) => h`<button key=${k} onClick=${() => setView(k)} className=${'px-3 py-1 rounded-lg text-sm ' + (view === k ? 'bg-pink-500 text-white' : 'text-gray-600')}>${l}</button>`)}</div></div>
    <div className="grid lg:grid-cols-3 gap-5">
      <div className=${card + ' p-4 lg:col-span-2'}>
        <div className="flex items-center justify-between mb-3"><button className=${btn2} onClick=${() => move(-1)}><${Icon} n="chl" size=${16} /></button>
          <div className="font-semibold capitalize">${title}</div><button className=${btn2} onClick=${() => move(1)}><${Icon} n="chr" size=${16} /></button></div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((x) => h`<div key=${x}>${x}</div>`)}</div>
        <div className="grid grid-cols-7 gap-1">${days.map((x) => {
          const k = ymd(x); const list = byDay[k] || []; const out = view === 'month' && x.getMonth() !== cur.getMonth();
          return h`<div key=${k} onClick=${() => setSel(k)} className=${'cursor-pointer rounded-lg border p-1 ' + (view === 'week' ? 'min-h-[140px]' : 'min-h-[64px] sm:min-h-[88px]') + ' ' + (k === sel ? 'border-pink-400 bg-pink-50' : 'border-gray-100 hover:bg-gray-50') + (out ? ' opacity-40' : '')}>
            <div className=${'text-xs mb-0.5 ' + (k === todayStr() ? 'font-bold text-pink-600' : 'text-gray-500')}>${x.getDate()}</div>
            <div className="space-y-0.5 hidden sm:block">${list.slice(0, view === 'week' ? 8 : 2).map((t) => h`<${Chip} key=${t.id} t=${t} />`)}${list.length > (view === 'week' ? 8 : 2) && h`<div className="text-[10px] text-gray-400">+${list.length - 2} lagi</div>`}</div>
            ${list.length > 0 && h`<div className="sm:hidden flex gap-0.5 flex-wrap">${list.slice(0, 4).map((t) => h`<span key=${t.id} className=${'h-1.5 w-1.5 rounded-full ' + PRIORITY[t.priority].dot}></span>`)}</div>`}</div>`;
        })}</div>
        <div className="flex gap-3 mt-3 text-xs text-gray-500">${Object.values(PRIORITY).map((p) => h`<span key=${p.l} className="flex items-center gap-1"><span className=${'h-2 w-2 rounded-full ' + p.dot}></span>${p.l}</span>`)}</div></div>
      <div className="space-y-5">
        <div className=${card + ' p-4'}><h3 className="font-semibold mb-2">Tugas tanggal ${fmtDate(sel)}</h3>
          ${selTasks.length === 0 ? h`<div className="text-sm text-gray-400 py-3">Tidak ada deadline pada tanggal ini.</div>`
            : h`<div className="space-y-2">${selTasks.map((t) => h`<a key=${t.id} href=${'#/tasks/' + t.id} className="block rounded-xl border border-gray-100 p-2.5 hover:border-pink-200"><div className="text-sm font-medium">${t.title}</div>
              <div className="flex gap-1.5 mt-1"><${StatusBadge} s=${t.status} /><${Badge} cls=${PRIORITY[t.priority].c}>${PRIORITY[t.priority].l}<//></div></a>`)}</div>`}</div>
        <div className=${card + ' p-4'}><h3 className="font-semibold mb-2">Deadline terdekat</h3>
          ${upcoming.length === 0 ? h`<div className="text-sm text-gray-400 py-3">Tidak ada deadline mendatang.</div>`
            : h`<ul className="space-y-2">${upcoming.map((t) => h`<li key=${t.id}><a href=${'#/tasks/' + t.id} className="flex justify-between gap-2 text-sm hover:text-pink-600"><span className="truncate">${t.title}</span>
              <span className=${'text-xs whitespace-nowrap ' + (daysUntil(t.deadline) <= 2 ? 'text-red-600 font-medium' : 'text-gray-400')}>${deadlineLabel(t.deadline)}</span></a></li>`)}</ul>`}</div></div></div></div>`;
}

// ======================= AKTIVITAS =======================
export function ActivityPage() {
  const { d, members } = useCtx();
  const [u, setU] = useState('');
  const list = d.activity.filter((a) => !u || a.user_id === u);
  return h`<div className="fade-in"><${PageTitle} title="Riwayat Aktivitas" sub="Seluruh perubahan di kelompok Anda"
    right=${h`<select className=${inp + ' !w-auto'} value=${u} onChange=${(e) => setU(e.target.value)}><option value="">Semua anggota</option>${members.map((m) => h`<option key=${m.user_id} value=${m.user_id}>${m.profile?.name}</option>`)}</select>`} />
    <div className=${card + ' p-4'}>${list.length === 0 ? h`<${Empty} title="Belum ada aktivitas" text="Aktivitas akan muncul saat anggota menambah atau memperbarui pekerjaan." />`
      : h`<ul className="divide-y divide-gray-50">${list.map((a) => h`<${ActivityItem} key=${a.id} a=${a} />`)}</ul>`}</div></div>`;
}

// ======================= ANGGOTA =======================
export function MembersPage() {
  const { d, members, user, isLeader, group, reload } = useCtx();
  async function setRole(m, role) {
    await q(sb.from('group_members').update({ role }).eq('group_id', group.id).eq('user_id', m.user_id), 'Peran diperbarui');
    reload(['members']);
  }
  async function remove(m) {
    if (!confirmDel(`Keluarkan ${m.profile?.name} dari kelompok?`)) return;
    await q(sb.from('group_members').delete().eq('group_id', group.id).eq('user_id', m.user_id), 'Anggota dikeluarkan');
    reload(['members']);
  }
  return h`<div className="fade-in"><${PageTitle} title="Anggota Kelompok" sub=${`${members.length} anggota di ${group.name}`}
    right=${h`<a href="#/settings" className=${btn}><${Icon} n="plus" size=${16} />Undang anggota</a>`} />
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">${members.map((m) => {
      const mine = d.taskMembers.filter((t) => t.user_id === m.user_id);
      const done = mine.filter((t) => memberTaskProgress(d, t.task_id, m.user_id) === 100).length;
      const p = userProgress(d, m.user_id);
      return h`<div key=${m.user_id} className=${card + ' p-4'}>
        <a href=${'#/members/' + m.user_id} className="flex items-center gap-3"><${Avatar} p=${m.profile} size=${46} />
          <div className="min-w-0"><div className="font-semibold truncate">${m.profile?.name}${m.user_id === user.id ? ' (Anda)' : ''}</div>
            <${Badge} cls=${m.role === 'leader' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}>${m.role === 'leader' ? 'Ketua' : 'Anggota'}<//></div></a>
        <div className="mt-3 flex items-center gap-2"><div className="flex-1"><${Bar} value=${p} slim /></div><span className="text-xs font-medium">${p}%</span></div>
        <div className="text-xs text-gray-500 mt-2">${mine.length} tugas · ${done} selesai · ${mine.length - done} belum</div>
        <div className="flex gap-2 mt-3"><a href=${'#/members/' + m.user_id} className=${btn2 + ' flex-1'}>Lihat pekerjaan</a>
          ${isLeader && m.user_id !== user.id && h`<button className=${btn2} onClick=${() => setRole(m, m.role === 'leader' ? 'member' : 'leader')}>${m.role === 'leader' ? 'Jadikan anggota' : 'Jadikan ketua'}</button>
            <button className=${btnDanger} onClick=${() => remove(m)}><${Icon} n="x" size=${14} /></button>`}</div></div>`;
    })}</div></div>`;
}

export function MemberProfile({ id }) {
  const { d, members, group } = useCtx();
  const m = members.find((x) => x.user_id === id);
  if (!m) return h`<${Empty} title="Anggota tidak ditemukan" action=${h`<a href="#/members" className=${btn2}>Kembali</a>`} />`;
  const mine = d.taskMembers.filter((t) => t.user_id === id).map((t) => d.tasks.find((x) => x.id === t.task_id)).filter(Boolean);
  const withP = mine.map((t) => ({ t, p: memberTaskProgress(d, t.id, id) }));
  const done = withP.filter((x) => x.p === 100), todo = withP.filter((x) => x.p < 100);
  const courses = d.courses.filter((c) => mine.some((t) => t.course_id === c.id));
  const List = ({ title, list }) => h`<div className=${card + ' p-4'}><h3 className="font-semibold mb-2">${title} (${list.length})</h3>
    ${list.length === 0 ? h`<div className="text-sm text-gray-400 py-2">Tidak ada.</div>` : h`<div className="space-y-2">${list.map(({ t, p }) => h`<a key=${t.id} href=${'#/tasks/' + t.id} className="block rounded-xl border border-gray-100 p-2.5 hover:border-pink-200">
      <div className="flex justify-between gap-2"><span className="text-sm font-medium truncate">${t.title}</span><span className="text-xs font-semibold">${p}%</span></div>
      <div className="text-xs text-gray-400 mb-1.5">${d.courses.find((c) => c.id === t.course_id)?.name}</div><${Bar} value=${p} slim /></a>`)}</div>`}</div>`;
  return h`<div className="fade-in"><a href="#/members" className="text-sm text-gray-400 hover:text-pink-600">← Anggota</a>
    <div className=${card + ' p-5 mt-2 mb-5 flex flex-wrap items-center gap-5'}><${Avatar} p=${m.profile} size=${72} />
      <div className="flex-1 min-w-[200px]"><h1 className="text-xl font-bold">${m.profile?.name}</h1><div className="text-sm text-gray-500">${m.profile?.email}</div><div className="text-xs text-gray-400">Kelompok: ${group.name}</div>
        <div className="mt-1"><${Badge} cls=${m.role === 'leader' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}>${m.role === 'leader' ? 'Ketua' : 'Anggota'}<//></div>
        <div className="flex flex-wrap gap-1.5 mt-2">${courses.map((c) => h`<a key=${c.id} href=${'#/courses/' + c.id} className="text-xs rounded-full px-2.5 py-1 text-white" style=${{ background: c.color }}>${c.name}</a>`)}</div></div>
      <div className="text-center"><${Ring} value=${userProgress(d, id)} size=${100} /><div className="text-xs text-gray-400 mt-1">Progres individu</div></div></div>
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">${[['Tugas dikerjakan', mine.length], ['Tugas selesai', done.length], ['Catatan pengerjaan', d.workLogs.filter((w) => w.user_id === id).length], ['Aktivitas', d.activity.filter((a) => a.user_id === id).length]].map(([l, v]) => h`<div key=${l} className=${card + ' p-4'}><div className="text-2xl font-extrabold text-navy-600">${v}</div><div className="text-xs text-gray-500">${l}</div></div>`)}</div>
    <div className="grid md:grid-cols-2 gap-5"><${List} title="Belum selesai" list=${todo} /><${List} title="Sudah selesai" list=${done} /></div>
    <div className=${card + ' mt-5 p-4 sm:p-5'}><h3 className="mb-2 font-semibold">Riwayat aktivitas</h3>${(() => { const acts = d.activity.filter((a) => a.user_id === id).slice(0, 15); return acts.length === 0 ? h`<div className="py-2 text-sm text-gray-400">Belum ada aktivitas.</div>` : h`<ul className="divide-y divide-gray-50">${acts.map((a) => h`<${ActivityItem} key=${a.id} a=${a} />`)}</ul>`; })()}</div></div>`;
}

// ======================= NOTIFIKASI =======================
export function NotificationsPage() {
  const { d, reload, user, group } = useCtx();
  const reminders = d.tasks.filter((t) => t.deadline && t.status !== 'selesai' && daysUntil(t.deadline) <= 2)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .filter((t) => d.taskMembers.some((m) => m.task_id === t.id && m.user_id === user.id) || d.taskMembers.every((m) => m.task_id !== t.id));
  const unread = d.notifs.filter((n) => !n.is_read), read = d.notifs.filter((n) => n.is_read);
  async function mark(ids) { await sb.from('notifications').update({ is_read: true }).in('id', ids); reload(['notifs']); }
  async function clearRead() { await q(sb.from('notifications').delete().eq('user_id', user.id).eq('is_read', true), 'Notifikasi dibersihkan'); reload(['notifs']); }
  const Row = ({ n }) => h`<li className=${'flex gap-3 items-start py-3 ' + (n.is_read ? 'opacity-70' : '')}>
    <span className=${'mt-1.5 h-2 w-2 rounded-full shrink-0 ' + (n.is_read ? 'bg-gray-300' : 'bg-pink-500')}></span>
    <a className="flex-1 min-w-0 text-sm" href=${n.task_id ? '#/tasks/' + n.task_id : '#/notifications'} onClick=${() => !n.is_read && mark([n.id])}>
      <div className="text-gray-800">${n.message}</div><div className="text-xs text-gray-400">${fmtDateTime(n.created_at)}</div></a>
    ${!n.is_read && h`<button className="text-xs text-pink-600" onClick=${() => mark([n.id])}>Tandai dibaca</button>`}</li>`;
  return h`<div className="fade-in"><${PageTitle} title="Notifikasi" sub=${`${unread.length} belum dibaca`}
    right=${h`${unread.length > 0 && h`<button className=${btn2} onClick=${() => mark(unread.map((n) => n.id))}>Tandai semua dibaca</button>`}${read.length > 0 && h`<button className=${btn2} onClick=${clearRead}>Hapus yang sudah dibaca</button>`}`} />
    ${reminders.length > 0 && h`<div className=${card + ' p-4 mb-5 border-red-100'}><h3 className="font-semibold text-red-600 mb-2">⏰ Pengingat deadline</h3>
      <ul className="space-y-1.5">${reminders.map((t) => h`<li key=${t.id}><a href=${'#/tasks/' + t.id} className="text-sm hover:text-pink-600">${t.title} — <b className=${daysUntil(t.deadline) < 0 ? 'text-red-600' : ''}>${deadlineLabel(t.deadline)}</b> (${fmtDate(t.deadline)})</a></li>`)}</ul></div>`}
    <div className=${card + ' p-4 mb-5'}><h3 className="font-semibold mb-1">Belum dibaca</h3>
      ${unread.length === 0 ? h`<${Empty} title="Tidak ada notifikasi baru" />` : h`<ul className="divide-y divide-gray-50">${unread.map((n) => h`<${Row} key=${n.id} n=${n} />`)}</ul>`}</div>
    <div className=${card + ' p-4'}><h3 className="font-semibold mb-1">Sudah dibaca</h3>
      ${read.length === 0 ? h`<div className="text-sm text-gray-400 py-3">Belum ada.</div>` : h`<ul className="divide-y divide-gray-50">${read.slice(0, 50).map((n) => h`<${Row} key=${n.id} n=${n} />`)}</ul>`}</div></div>`;
}

// ======================= PENGATURAN =======================
export function SettingsPage() {
  const { me, user, group, isLeader, app, reload, members } = useCtx();
  const [name, setName] = useState(me.name || '');
  const [gname, setGname] = useState(group.name);
  const [pw, setPw] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [code, setCode] = useState('');
  const link = `${location.origin}${location.pathname}#/join/${group.invite_code}`;
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Tersalin'); } catch { toast('Gagal menyalin', 'error'); } };

  async function saveProfile(e) {
    e.preventDefault();
    const r = await q(sb.from('profiles').update({ name: name.trim() }).eq('id', user.id), 'Profil diperbarui');
    if (!r.error) app.refreshProfile();
  }
  async function avatar(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast('Foto maksimal 3 MB', 'error');
    const path = `${user.id}/avatar-${Date.now()}`;
    const up = await q(sb.storage.from('avatars').upload(path, file, { upsert: true }));
    if (up.error) return;
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    await q(sb.from('profiles').update({ avatar_url: url }).eq('id', user.id), 'Foto profil diperbarui');
    app.refreshProfile(); reload(['members']);
  }
  async function saveGroup(e) {
    e.preventDefault();
    await q(sb.from('groups').update({ name: gname.trim() }).eq('id', group.id), 'Nama kelompok diperbarui');
    app.reloadGroups();
  }
  async function changePw(e) {
    e.preventDefault();
    if (pw.length < 6) return toast('Password minimal 6 karakter', 'error');
    const r = await q(sb.auth.updateUser({ password: pw }), 'Password diperbarui');
    if (!r.error) setPw('');
  }
  async function leave() {
    const leaders = members.filter((m) => m.role === 'leader');
    if (isLeader && leaders.length === 1 && members.length > 1) return toast('Jadikan anggota lain sebagai ketua sebelum keluar', 'error');
    if (!confirmDel('Keluar dari kelompok ini?')) return;
    const r = await q(sb.from('group_members').delete().eq('group_id', group.id).eq('user_id', user.id), 'Anda keluar dari kelompok');
    if (!r.error) app.reloadGroups(true);
  }
  async function create(e) { e.preventDefault(); const r = await q(sb.rpc('create_group', { group_name: newGroup.trim() }), 'Kelompok dibuat'); if (!r.error) { setNewGroup(''); app.reloadGroups(false, r.data.id); } }
  async function join(e) { e.preventDefault(); const r = await q(sb.rpc('join_group', { code }), 'Berhasil bergabung'); if (!r.error) { setCode(''); app.reloadGroups(false, r.data.id); } }

  return h`<div className="fade-in max-w-3xl"><${PageTitle} title="Pengaturan" />
    <div className=${card + ' p-5 mb-5'}><h3 className="font-semibold mb-3">Profil</h3>
      <div className="flex items-center gap-4 mb-4"><${Avatar} p=${me} size=${64} />
        <label className=${btn2 + ' cursor-pointer'}>Ganti foto<input type="file" accept="image/*" className="hidden" onChange=${avatar} /></label></div>
      <form onSubmit=${saveProfile}><${Field} label="Nama"><input className=${inp} required value=${name} onChange=${(e) => setName(e.target.value)} /><//>
        <${Field} label="Email"><input className=${inp} disabled value=${me.email || ''} /><//><button className=${btn}>Simpan profil</button></form>
      <form onSubmit=${changePw} className="mt-5 pt-4 border-t border-gray-100"><${Field} label="Ganti password"><input type="password" className=${inp} value=${pw} onChange=${(e) => setPw(e.target.value)} placeholder="Password baru (min. 6 karakter)" /><//>
        <button className=${btn2}>Perbarui password</button></form></div>
    <div className=${card + ' p-5 mb-5'}><h3 className="font-semibold mb-3">Kelompok: ${group.name}</h3>
      ${isLeader && h`<form onSubmit=${saveGroup} className="flex gap-2 mb-4"><input className=${inp} required value=${gname} onChange=${(e) => setGname(e.target.value)} /><button className=${btn}>Simpan</button></form>`}
      <div className="rounded-xl bg-pink-50 p-4 mb-3"><div className="text-xs text-pink-700 mb-1">Kode undangan</div>
        <div className="flex items-center gap-2"><span className="text-2xl font-bold tracking-widest text-pink-700">${group.invite_code}</span>
          <button className=${btn2} onClick=${() => copy(group.invite_code)}><${Icon} n="copy" size=${14} />Salin kode</button></div></div>
      <div className="flex gap-2 mb-4"><input readOnly className=${inp} value=${link} /><button className=${btn2} onClick=${() => copy(link)}><${Icon} n="link" size=${14} />Salin link</button></div>
      <button className=${btnDanger} onClick=${leave}>Keluar dari kelompok</button></div>
    <div className=${card + ' p-5 mb-5'}><h3 className="font-semibold mb-3">Kelompok lain</h3>
      ${app.groups.length > 1 && h`<div className="flex flex-wrap gap-2 mb-4">${app.groups.map((g) => h`<button key=${g.group_id} onClick=${() => app.switchGroup(g.group_id)}
        className=${'rounded-full px-3 py-1 text-sm border ' + (g.group_id === group.id ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-200')}>${g.groups?.name}</button>`)}</div>`}
      <form onSubmit=${create} className="flex gap-2 mb-2"><input className=${inp} required placeholder="Nama kelompok baru" value=${newGroup} onChange=${(e) => setNewGroup(e.target.value)} /><button className=${btn2}>Buat</button></form>
      <form onSubmit=${join} className="flex gap-2"><input className=${inp + ' uppercase'} required placeholder="Kode undangan" value=${code} onChange=${(e) => setCode(e.target.value)} /><button className=${btn2}>Gabung</button></form></div>
    <button className=${btn2} onClick=${app.signOut}><${Icon} n="out" size=${16} />Keluar dari akun</button></div>`;
}
