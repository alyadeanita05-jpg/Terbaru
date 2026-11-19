import { React, h, sb, configured, Ctx, Toaster, Spinner, Skeleton, Icon, Avatar, btn, btn2, q, toast, go } from './lib.js';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { SetupScreen, AuthScreen, RecoveryScreen, GroupGate } from './auth.js';
import { CoursesPage, CourseDetail } from './pages.js';
import { TasksPage } from './tasks.js';
import { WorkPage } from './work.js';
import { LinksPage, FilesPage } from './resources.js';
import { ActivityPage } from './activity.js';
import { Dashboard } from './dashboard.js';
import { TaskDetail } from './task.js';
import { CalendarPage, MembersPage, MemberProfile, NotificationsPage, SettingsPage } from './pages2.js';
const { useState, useEffect, useCallback, useMemo } = React;

// simpan kode undangan dari link (#/join/KODE) sebelum login
const m0 = location.hash.match(/^#\/join\/([A-Za-z0-9]+)/);
if (m0) localStorage.setItem('pendingInvite', m0[1].toUpperCase());

// Pesan error yang jelas (menggantikan loading tanpa akhir)
const explain = (e) => {
  const m = String((e && (e.message || e.details)) || e || '');
  if ((e && (e.code === '42501' || e.status === 403)) || /permission denied|forbidden/i.test(m)) return 'Database menolak akses (izin tabel belum diatur di Supabase). Hubungi admin proyek.';
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Tidak dapat terhubung ke Supabase. Periksa koneksi internet Anda.';
  if (/jwt|expired|not authenticated/i.test(m)) return 'Sesi Anda sudah berakhir. Silakan keluar lalu masuk kembali.';
  return m || 'Terjadi kesalahan saat memuat data.';
};

const useHash = () => {
  const [hash, setHash] = useState(location.hash || '#/dashboard');
  useEffect(() => { const f = () => setHash(location.hash || '#/dashboard'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return hash;
};

// ---------- data kelompok + realtime ----------
const SRC = {
  courses: ['courses', 'created_at', true], weeks: ['weeks', 'number', true], tasks: ['tasks', 'created_at', true],
  taskMembers: ['task_members', null, true], work: ['member_work_items', 'updated_at', true], checks: ['checklists', 'created_at', true],
  comments: ['comments', 'created_at', true], revisions: ['revisions', 'created_at', true], attachments: ['attachments', 'created_at', true],
  activity: ['activity_logs', 'created_at', false], members: ['group_members', 'joined_at', true], notifs: ['notifications', 'created_at', false],
  workLogs: ['work_logs', 'created_at', false], links: ['resource_links', 'created_at', false],
};
const emptyData = () => Object.fromEntries(Object.keys(SRC).map((k) => [k, []]));

function useGroupData(groupId, userId) {
  const [d, setD] = useState(emptyData());
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (key) => {
    const [table, order, asc] = SRC[key];
    let query = sb.from(table).select(key === 'members' ? '*, profile:profiles(*)' : '*').eq('group_id', groupId);
    if (key === 'notifs') query = query.eq('user_id', userId);
    if (order) query = query.order(order, { ascending: asc });
    if (key === 'activity' || key === 'notifs') query = query.limit(200);
    const { data, error } = await query;
    if (error) { console.error(key, error); return; }
    setD((prev) => ({ ...prev, [key]: data || [] }));
  }, [groupId, userId]);

  const reload = useCallback(async (keys) => { await Promise.all((keys || Object.keys(SRC)).map(load)); }, [load]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setD(emptyData());
    Promise.all(Object.keys(SRC).map(load)).catch((e) => console.error(e)).finally(() => alive && setLoading(false));
    const ch = sb.channel('group-' + groupId + '-' + Math.random().toString(36).slice(2));
    Object.entries(SRC).forEach(([key, [table]]) => {
      const filter = key === 'notifs' ? `user_id=eq.${userId}` : `group_id=eq.${groupId}`;
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => load(key));
    });
    // event DELETE tidak membawa kolom filter -> muat ulang tabel utama juga
    ['tasks', 'checklists', 'comments', 'courses', 'weeks', 'task_members', 'revisions', 'attachments', 'work_logs', 'resource_links'].forEach((table) => {
      const key = Object.keys(SRC).find((k) => SRC[k][0] === table);
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () => load(key));
    });
    ch.subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [groupId, userId]);

  return { d, loading, reload };
}

// ---------- shell ----------
// [kunci, label, ikon, href(opsional)]
const NAV_MAIN = [
  ['dashboard', 'Dashboard', 'home'], ['tasks', 'Daftar Tugas', 'check'], ['work', 'Pengerjaan Saya', 'edit'],
  ['activity', 'Aktivitas Anggota', 'act'], ['links', 'Link & Referensi', 'link'], ['files', 'File', 'clip'],
];
const NAV_MORE = [['courses', 'Mata Kuliah', 'book'], ['calendar', 'Kalender', 'cal'], ['members', 'Anggota', 'users'], ['notifications', 'Notifikasi', 'bell']];

function Workspace({ user, profile, memb, groups, app }) {
  const group = memb.groups;
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [slim, setSlim] = useState(() => { try { return localStorage.getItem('sb-slim') === '1'; } catch { return false; } });
  const toggleSlim = () => setSlim((v) => { try { localStorage.setItem('sb-slim', v ? '0' : '1'); } catch { /* abaikan */ } return !v; });
  const { d, loading, reload } = useGroupData(group.id, user.id);
  const members = d.members;
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m.profile])), [members]);
  const isLeader = memb.role === 'leader';

  const notify = useCallback(async (userIds, type, message, taskId) => {
    const rows = [...new Set(userIds)].filter((u) => u && u !== user.id).map((u) => ({ group_id: group.id, user_id: u, type, message, task_id: taskId || null }));
    if (rows.length) await sb.from('notifications').insert(rows);
  }, [group.id, user.id]);
  const log = useCallback(async (action, taskId) => {
    await sb.from('activity_logs').insert({ group_id: group.id, user_id: user.id, action, task_id: taskId || null });
  }, [group.id, user.id]);

  // Hitung ulang status pekerjaan anggota & status tugas dari checklist (progres otomatis)
  const syncStatus = useCallback(async (taskId, uid) => {
    const [{ data: items }, { data: tms }, { data: task }] = await Promise.all([
      sb.from('checklists').select('*').eq('task_id', taskId),
      sb.from('task_members').select('user_id').eq('task_id', taskId),
      sb.from('tasks').select('*').eq('id', taskId).single(),
    ]);
    if (!items || !task) return;
    const mine = items.filter((i) => i.user_id === uid);
    if (mine.length) {
      const done = mine.filter((i) => i.is_done).length;
      const st = done === mine.length ? 'selesai' : done > 0 ? 'proses' : 'belum';
      await sb.from('member_work_items').update({ status: st, updated_by: user.id }).eq('task_id', taskId).eq('user_id', uid);
    }
    const ids = (tms || []).map((m) => m.user_id);
    const allDone = ids.length > 0 && ids.every((u) => { const it = items.filter((i) => i.user_id === u); return it.length > 0 && it.every((i) => i.is_done); });
    const anyDone = items.some((i) => i.is_done);
    if (allDone && ['belum', 'proses'].includes(task.status)) {
      await sb.from('tasks').update({ status: 'review' }).eq('id', taskId);
      await notify(members.map((m) => m.user_id), 'review', `Semua pekerjaan pada "${task.title}" selesai. Menunggu review kelompok.`, taskId);
      await sb.from('activity_logs').insert({ group_id: group.id, user_id: user.id, action: `menyelesaikan seluruh pekerjaan tugas ${task.title} (menunggu review)`, task_id: taskId });
    } else if (!allDone && task.status === 'review') {
      await sb.from('tasks').update({ status: 'proses' }).eq('id', taskId);
    } else if (anyDone && task.status === 'belum') {
      await sb.from('tasks').update({ status: 'proses' }).eq('id', taskId);
    }
  }, [group.id, user.id, members]);

  const ctx = { sb, user, me: profile, group, isLeader, d, members, byId, reload, notify, log, syncStatus, app };
  const unread = d.notifs.filter((n) => !n.is_read).length;

  // routing
  const parts = hash.replace(/^#\//, '').split('/');
  useEffect(() => { setOpen(false); setMenu(false); window.scrollTo(0, 0); }, [hash]);
  let page = null;
  if (loading) page = h`<${Skeleton} />`;
  else {
    const [r, id] = parts;
    if (r === 'work') page = h`<${WorkPage} />`;
    else if (r === 'links') page = h`<${LinksPage} />`;
    else if (r === 'files') page = h`<${FilesPage} />`;
    else if (r === 'courses') page = id ? h`<${CourseDetail} id=${id} />` : h`<${CoursesPage} />`;
    else if (r === 'tasks') page = id ? h`<${TaskDetail} id=${id} />` : h`<${TasksPage} />`;
    else if (r === 'calendar') page = h`<${CalendarPage} />`;
    else if (r === 'activity') page = h`<${ActivityPage} />`;
    else if (r === 'members') page = id ? h`<${MemberProfile} id=${id} />` : h`<${MembersPage} />`;
    else if (r === 'notifications') page = h`<${NotificationsPage} />`;
    else if (r === 'settings') page = h`<${SettingsPage} />`;
    else page = h`<${Dashboard} />`;
  }
  const active = parts[0] === 'join' || !parts[0] ? 'dashboard' : parts[0] === 'members' && parts[1] === user.id ? 'profile' : parts[0];

  const Item = ([k, l, ic, href]) => h`<a key=${k} href=${href || '#/' + k} title=${slim ? l : undefined} aria-label=${l}
      className=${'group flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-colors ' + (slim ? 'justify-center px-2 lg:px-2 ' : 'px-2.5 ') + (active === k ? 'bg-white/10 text-white' : 'text-[#b2d4dd]/80 hover:bg-white/5 hover:text-white')}>
      <span className=${'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ' + (active === k ? 'bg-[#b2d4dd] text-[#27293d]' : 'text-[#b2d4dd] group-hover:text-white')}><${Icon} n=${ic} size=${18} /></span>
      ${!slim && h`<span className="truncate">${l}</span>`}
      ${k === 'notifications' && unread > 0 ? h`<span className=${'rounded-full bg-[#b2d4dd] px-1.5 py-0.5 text-[11px] font-semibold text-[#27293d] ' + (slim ? 'absolute right-1 top-1' : 'ml-auto')}>${unread}</span>` : ''}</a>`;

  const Side = ({ drawer }) => { const sl = slim && !drawer; return h`<div className="flex h-full flex-col bg-[#27293d] text-white">
    <div className=${'flex items-center gap-3 py-5 ' + (sl ? 'justify-center px-2' : 'px-5')}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#b2d4dd] text-[#27293d]"><${Icon} n="check" size=${20} /></div>
      ${!sl && h`<div className="min-w-0"><div className="font-bold leading-tight">Capstone Tracker</div><div className="text-[11px] text-[#b2d4dd]/70">Achieve Together</div></div>`}</div>
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
      ${NAV_MAIN.map(Item)}
      ${Item(['profile', 'Profil', 'user', '#/members/' + user.id])}${Item(['settings', 'Pengaturan', 'set'])}
      ${!sl ? h`<div className="mb-1 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#b2d4dd]/50">Lainnya</div>` : h`<div className="my-3 border-t border-white/10"></div>`}
      ${NAV_MORE.map(Item)}</nav>
    <div className="safe-b border-t border-white/10 p-3">
      ${!sl && (groups.length > 1 ? h`<select className="mb-2 w-full rounded-xl border-0 bg-white/10 px-2 py-2 text-sm text-white" value=${group.id} onChange=${(e) => app.switchGroup(e.target.value)}>
        ${groups.map((g) => h`<option key=${g.group_id} value=${g.group_id} className="text-gray-800">${g.groups?.name}</option>`)}</select>`
        : h`<div className="mb-1 truncate px-2 text-xs text-[#b2d4dd]/70">Kelompok: <b className="text-white">${group.name}</b></div>`)}
      ${!sl && h`<div className="px-2 text-[11px] text-[#b2d4dd]/60">${isLeader ? 'Anda adalah Ketua' : 'Anda adalah Anggota'}</div>`}
      ${drawer ? h`<button onClick=${app.signOut} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-300 hover:bg-white/5">Keluar</button>`
        : h`<button onClick=${toggleSlim} className=${'mt-2 hidden w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#b2d4dd]/80 hover:bg-white/5 hover:text-white lg:flex ' + (sl ? 'justify-center' : '')} title=${sl ? 'Perbesar sidebar' : 'Perkecil sidebar'} aria-label="Ubah ukuran sidebar"><${Icon} n=${sl ? 'chr' : 'chl'} size=${18} />${!sl && 'Perkecil'}</button>`}</div></div>`; };

  const Tab = ([k, l, ic, href]) => h`<a key=${k} href=${href || '#/' + k} className=${'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ' + (active === k ? 'text-pink-600' : 'text-gray-400')}>
    <${Icon} n=${ic} size=${22} />${l}</a>`;

  return h`<${Ctx.Provider} value=${ctx}><div className="min-h-screen lg:flex">
    <aside className=${'sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block ' + (slim ? 'w-[76px]' : 'w-64')}><${Side} /></aside>
    ${open && h`<div className="fixed inset-0 z-50 flex lg:hidden"><div className="slide-right w-72 max-w-[85vw] shadow-xl"><${Side} drawer=${true} /></div><div className="flex-1 bg-gray-900/30 backdrop-blur-[2px] fade-in" onClick=${() => setOpen(false)}></div></div>`}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <button className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-50 lg:hidden" onClick=${() => setOpen(true)} aria-label="Buka menu"><${Icon} n="menu" /></button>
        <div className="truncate font-semibold text-gray-700">${group.name}</div>
        <div className="ml-auto flex items-center gap-3">
          <a href="#/notifications" className="relative rounded-lg p-2 text-gray-500 hover:text-pink-600" aria-label="Notifikasi"><${Icon} n="bell" size=${22} />
            ${unread > 0 && h`<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] text-white">${unread}</span>`}</a>
          <div className="relative"><button onClick=${() => setMenu(!menu)} aria-label="Akun"><${Avatar} p=${profile} size=${34} /></button>
            ${menu && h`<div className="pop-in absolute right-0 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-1 text-sm shadow-lg">
              <div className="border-b border-gray-100 px-3 py-2"><div className="truncate font-medium">${profile.name}</div><div className="truncate text-xs text-gray-400">${profile.email}</div></div>
              <a href=${'#/members/' + user.id} className="block px-3 py-2 hover:bg-gray-50">Profil saya</a>
              <a href="#/settings" className="block px-3 py-2 hover:bg-gray-50">Pengaturan</a>
              <button onClick=${app.signOut} className="w-full px-3 py-2 text-left text-red-600 hover:bg-gray-50">Keluar</button></div>`}</div></div></header>
      <main key=${active} className="page-in mx-auto max-w-6xl p-4 pb-28 sm:p-6 sm:pb-28 lg:pb-8">${page}</main></div>
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-gray-100 bg-white/95 px-1 backdrop-blur lg:hidden" aria-label="Navigasi utama">
      ${Tab(['dashboard', 'Beranda', 'home'])}${Tab(['tasks', 'Tugas', 'check'])}${Tab(['work', 'Pengerjaan', 'edit'])}
      ${Tab(['files', 'File', 'clip'])}
      <button onClick=${() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-gray-400"><${Icon} n="menu" size=${22} />Menu</button></nav></div><//>`;
}

function AuthedApp({ user }) {
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState(null);
  const [gid, setGid] = useState(localStorage.getItem('cg'));
  const [err, setErr] = useState('');
  const [attempt, setAttempt] = useState(0);

  const loadProfile = useCallback(async () => {
    try {
      let { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const ins = await sb.from('profiles').upsert({ id: user.id, name: user.user_metadata?.name || user.email.split('@')[0], email: user.email }).select().single();
        if (ins.error) throw ins.error;
        data = ins.data;
      }
      setProfile(data);
    } catch (e) { console.error('profil', e); setErr(explain(e)); }
  }, [user.id]);
  const loadGroups = useCallback(async (pick) => {
    try {
      const { data, error } = await sb.from('group_members').select('group_id, role, groups(*)').eq('user_id', user.id);
      if (error) throw error;
      setGroups(data || []);
      if (pick) selectGroup(pick);
      return data || [];
    } catch (e) { console.error('kelompok', e); setErr(explain(e)); return []; }
  }, [user.id]);
  const selectGroup = (id) => { localStorage.setItem('cg', id); setGid(id); go('#/dashboard'); };

  useEffect(() => { loadProfile(); (async () => {
    const pending = localStorage.getItem('pendingInvite');
    if (pending) {
      const r = await sb.rpc('join_group', { code: pending });
      localStorage.removeItem('pendingInvite');
      if (r.error) toast(r.error.message, 'error'); else { toast('Berhasil bergabung ke kelompok'); localStorage.setItem('cg', r.data.id); setGid(r.data.id); }
    }
    await loadGroups();
  })(); }, [user.id, attempt]);

  // pengaman: jangan pernah menunggu tanpa batas
  useEffect(() => {
    if (profile && groups) return;
    const t = setTimeout(() => setErr((e) => e || 'Memuat terlalu lama. Periksa koneksi internet Anda lalu coba lagi.'), 15000);
    return () => clearTimeout(t);
  }, [profile, groups, attempt]);

  // link undangan dibuka saat sudah login
  useEffect(() => {
    const f = async () => {
      const m = location.hash.match(/^#\/join\/([A-Za-z0-9]+)/);
      if (!m) return;
      const r = await sb.rpc('join_group', { code: m[1] });
      if (r.error) toast(r.error.message, 'error'); else { toast('Berhasil bergabung ke kelompok'); await loadGroups(r.data.id); }
    };
    f(); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f);
  }, []);

  const signOut = async () => { localStorage.removeItem('cg'); await sb.auth.signOut(); go('#/dashboard'); };
  if (err && (!profile || !groups)) return h`<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-lav-100 via-white to-cream-100">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-pink-100 p-6 text-center fade-in">
      <h2 className="font-semibold text-gray-800 mb-2">Data belum bisa dimuat</h2>
      <p className="text-sm text-gray-600 mb-5">${err}</p>
      <div className="flex gap-2 justify-center">
        <button className=${btn} onClick=${() => { setErr(''); setProfile(null); setGroups(null); setAttempt((a) => a + 1); }}>Coba lagi</button>
        <button className=${btn2} onClick=${signOut}>Keluar</button></div></div></div>`;
  if (!profile || !groups) return h`<${Spinner} />`;
  const memb = groups.find((g) => g.group_id === gid) || groups[0];
  if (!memb) return h`<${GroupGate} profile=${profile} onJoined=${(id) => loadGroups(id)} onLogout=${signOut} />`;

  const app = {
    groups, signOut, switchGroup: selectGroup, refreshProfile: loadProfile,
    reloadGroups: async (left, pick) => { const g = await loadGroups(pick); if (left) { localStorage.removeItem('cg'); setGid(g[0]?.group_id || null); } },
  };
  return h`<${Workspace} key=${memb.group_id} user=${user} profile=${profile} memb=${memb} groups=${groups} app=${app} />`;
}

function App() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data: { subscription } } = sb.auth.onAuthStateChange((ev, s) => { setSession(s); if (ev === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => subscription.unsubscribe();
  }, []);
  if (!configured) return h`<${SetupScreen} />`;
  if (session === undefined) return h`<${Spinner} />`;
  if (recovery && session) return h`<${RecoveryScreen} onDone=${() => setRecovery(false)} />`;
  if (!session) return h`<${AuthScreen} />`;
  return h`<${AuthedApp} key=${session.user.id} user=${session.user} />`;
}

createRoot(document.getElementById('root')).render(h`<div><${App} /><${Toaster} /></div>`);
