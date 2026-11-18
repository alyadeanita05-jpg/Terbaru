
import { React, h, sb, configured, Ctx, Toaster, Spinner, Icon, Avatar, btn2, q, toast, go } from './lib.js';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { SetupScreen, AuthScreen, RecoveryScreen, GroupGate } from './auth.js';
import { Dashboard, CoursesPage, CourseDetail, TasksPage } from './pages.js';
import { TaskDetail } from './task.js';
import { CalendarPage, ActivityPage, MembersPage, MemberProfile, NotificationsPage, SettingsPage } from './pages2.js';
const { useState, useEffect, useCallback, useMemo } = React;

// simpan kode undangan dari link (#/join/KODE) sebelum login
const m0 = location.hash.match(/^#\/join\/([A-Za-z0-9]+)/);
if (m0) localStorage.setItem('pendingInvite', m0[1].toUpperCase());

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
    Promise.all(Object.keys(SRC).map(load)).then(() => alive && setLoading(false));
    const ch = sb.channel('group-' + groupId + '-' + Math.random().toString(36).slice(2));
    Object.entries(SRC).forEach(([key, [table]]) => {
      const filter = key === 'notifs' ? `user_id=eq.${userId}` : `group_id=eq.${groupId}`;
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => load(key));
    });
    // event DELETE tidak membawa kolom filter -> muat ulang tabel utama juga
    ['tasks', 'checklists', 'comments', 'courses', 'weeks', 'task_members', 'revisions', 'attachments'].forEach((table) => {
      const key = Object.keys(SRC).find((k) => SRC[k][0] === table);
      ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () => load(key));
    });
    ch.subscribe();
    return () => { alive = false; sb.removeChannel(ch); };
  }, [groupId, userId]);

  return { d, loading, reload };
}

// ---------- shell ----------
const NAV = [
  ['dashboard', 'Dashboard', 'home'], ['courses', 'Mata Kuliah', 'book'], ['tasks', 'Semua Tugas', 'check'], ['calendar', 'Kalender', 'cal'],
  ['activity', 'Aktivitas', 'act'], ['members', 'Anggota Kelompok', 'users'], ['notifications', 'Notifikasi', 'bell'], ['settings', 'Pengaturan', 'set'],
];

function Workspace({ user, profile, memb, groups, app }) {
  const group = memb.groups;
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
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
  if (loading) page = h`<${Spinner} />`;
  else {
    const [r, id] = parts;
    if (r === 'courses') page = id ? h`<${CourseDetail} id=${id} />` : h`<${CoursesPage} />`;
    else if (r === 'tasks') page = id ? h`<${TaskDetail} id=${id} />` : h`<${TasksPage} />`;
    else if (r === 'calendar') page = h`<${CalendarPage} />`;
    else if (r === 'activity') page = h`<${ActivityPage} />`;
    else if (r === 'members') page = id ? h`<${MemberProfile} id=${id} />` : h`<${MembersPage} />`;
    else if (r === 'notifications') page = h`<${NotificationsPage} />`;
    else if (r === 'settings') page = h`<${SettingsPage} />`;
    else page = h`<${Dashboard} />`;
  }
  const active = parts[0] === 'join' || !parts[0] ? 'dashboard' : parts[0];

  const Side = () => h`<div className="flex flex-col h-full">
    <div className="px-5 py-5 flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-pink-500 text-white flex items-center justify-center"><${Icon} n="check" size=${20} /></div>
      <div><div className="font-bold leading-tight">Capstone Tracker</div><div className="text-[11px] text-gray-400">Achieve Together</div></div></div>
    <nav className="px-3 flex-1 space-y-1">${NAV.map(([k, l, ic]) => h`<a key=${k} href=${'#/' + k}
      className=${'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ' + (active === k ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-100')}>
      <${Icon} n=${ic} size=${18} />${l}${k === 'notifications' && unread > 0 ? h`<span className="ml-auto rounded-full bg-pink-500 text-white text-[11px] px-1.5 py-0.5">${unread}</span>` : ''}</a>`)}</nav>
    <div className="p-3 border-t border-gray-100">
      ${groups.length > 1 ? h`<select className="w-full rounded-xl border border-gray-200 text-sm px-2 py-2 mb-2" value=${group.id} onChange=${(e) => app.switchGroup(e.target.value)}>
        ${groups.map((g) => h`<option key=${g.group_id} value=${g.group_id}>${g.groups?.name}</option>`)}</select>`
        : h`<div className="text-xs text-gray-400 px-2 mb-2 truncate">Kelompok: <b className="text-gray-600">${group.name}</b></div>`}
      <div className="text-[11px] text-gray-400 px-2">${isLeader ? 'Anda adalah Ketua' : 'Anda adalah Anggota'}</div></div></div>`;

  return h`<${Ctx.Provider} value=${ctx}><div className="min-h-screen lg:flex">
    <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen"><${Side} /></aside>
    ${open && h`<div className="lg:hidden fixed inset-0 z-40 flex"><div className="w-64 bg-white shadow-xl"><${Side} /></div><div className="flex-1 bg-black/30" onClick=${() => setOpen(false)}></div></div>`}
    <div className="flex-1 min-w-0">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button className="lg:hidden text-gray-600" onClick=${() => setOpen(true)}><${Icon} n="menu" /></button>
        <div className="font-semibold text-gray-700 truncate">${group.name}</div>
        <div className="ml-auto flex items-center gap-3">
          <a href="#/notifications" className="relative text-gray-500 hover:text-pink-600"><${Icon} n="bell" size=${22} />
            ${unread > 0 && h`<span className="absolute -top-1.5 -right-1.5 rounded-full bg-pink-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center">${unread}</span>`}</a>
          <div className="relative"><button onClick=${() => setMenu(!menu)}><${Avatar} p=${profile} size=${34} /></button>
            ${menu && h`<div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-gray-100 shadow-lg py-1 text-sm fade-in">
              <div className="px-3 py-2 border-b border-gray-100"><div className="font-medium truncate">${profile.name}</div><div className="text-xs text-gray-400 truncate">${profile.email}</div></div>
              <a href=${'#/members/' + user.id} className="block px-3 py-2 hover:bg-gray-50">Profil saya</a>
              <a href="#/settings" className="block px-3 py-2 hover:bg-gray-50">Pengaturan</a>
              <button onClick=${app.signOut} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">Keluar</button></div>`}</div></div></header>
      <main className="p-4 sm:p-6 max-w-6xl mx-auto">${page}</main></div></div><//>`;
}

function AuthedApp({ user }) {
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState(null);
  const [gid, setGid] = useState(localStorage.getItem('cg'));

  const loadProfile = useCallback(async () => {
    let { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!data) {
      const ins = await sb.from('profiles').upsert({ id: user.id, name: user.user_metadata?.name || user.email.split('@')[0], email: user.email }).select().single();
      data = ins.data;
    }
    setProfile(data);
  }, [user.id]);
  const loadGroups = useCallback(async (pick) => {
    const { data } = await sb.from('group_members').select('group_id, role, groups(*)').eq('user_id', user.id);
    setGroups(data || []);
    if (pick) selectGroup(pick);
    return data || [];
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
  })(); }, [user.id]);

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
    sb.auth.getSession().then(({ data }) => setSession(data.session));
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
