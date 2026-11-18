import { React, h, sb, inp, btn, btn2, Field, toast, q, Icon } from './lib.js';
const { useState } = React;

const Logo = () => h`<div className="text-center mb-6">
  <div className="mx-auto h-14 w-14 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-md"><${Icon} n="check" size=${28} /></div>
  <h1 className="mt-3 text-2xl font-bold text-gray-900">Capstone Tracker</h1>
  <p className="text-sm text-pink-600 mt-1">Organize Your Tasks, Track Your Progress, Achieve Together.</p></div>`;

const Shell = ({ children }) => h`<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-pink-100">
  <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-pink-100 p-6 sm:p-8 fade-in"><${Logo} />${children}</div></div>`;

export function SetupScreen() {
  return h`<${Shell}>
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
      <b>Supabase belum dikonfigurasi.</b>
      <ol className="list-decimal ml-5 mt-2 space-y-1">
        <li>Buat proyek di supabase.com.</li>
        <li>Jalankan isi <code>schema.sql</code> di SQL Editor.</li>
        <li>Isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di <code>config.js</code>.</li>
        <li>Muat ulang halaman ini.</li>
      </ol></div><//>`;
}

export function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const invite = localStorage.getItem('pendingInvite');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setInfo('');
    const friendly = (m = '') => {
      if (/invalid login credentials/i.test(m)) return 'Email atau password salah. Jika baru mendaftar, pastikan email sudah dikonfirmasi.';
      if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Buka email Anda dan klik link konfirmasi.';
      if (/already registered|already been registered/i.test(m)) return 'Email sudah terdaftar. Silakan login.';
      if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
      if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Tidak dapat terhubung ke Supabase. Periksa SUPABASE_URL dan koneksi internet.';
      if (/invalid api key|apikey/i.test(m)) return 'API key Supabase salah. Periksa SUPABASE_PUBLISHABLE_KEY di Vercel.';
      return m || 'Terjadi kesalahan';
    };
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) toast(friendly(error.message), 'error');
      } else if (mode === 'register') {
        if (f.password.length < 6) { toast('Password minimal 6 karakter', 'error'); setBusy(false); return; }
        const { data, error } = await sb.auth.signUp({
          email: f.email.trim(), password: f.password,
          options: { data: { name: f.name.trim() }, emailRedirectTo: location.origin + location.pathname },
        });
        if (error) toast(friendly(error.message), 'error');
        else if (data.user && data.user.identities && data.user.identities.length === 0) toast('Email sudah terdaftar. Silakan login.', 'error');
        else if (!data.session) setInfo('Pendaftaran berhasil. Cek email Anda (juga folder spam) untuk konfirmasi, lalu login.');
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.origin + location.pathname });
        if (error) toast(friendly(error.message), 'error'); else setInfo('Link reset password sudah dikirim ke email Anda.');
      }
    } catch (err) {
      toast(friendly(String(err && err.message)), 'error');
    }
    setBusy(false);
  }

  const title = { login: 'Masuk ke akun', register: 'Buat akun baru', forgot: 'Lupa password' }[mode];
  return h`<${Shell}>
    ${invite && h`<div className="mb-4 rounded-xl bg-pink-50 text-pink-700 text-sm p-3">Anda diundang ke sebuah kelompok (kode <b>${invite}</b>). Masuk atau daftar untuk bergabung.</div>`}
    <h2 className="font-semibold text-gray-800 mb-4">${title}</h2>
    <form onSubmit=${submit}>
      ${mode === 'register' && h`<${Field} label="Nama lengkap"><input className=${inp} required value=${f.name} onChange=${set('name')} placeholder="Nama Anda" /><//>`}
      <${Field} label="Email"><input type="email" className=${inp} required value=${f.email} onChange=${set('email')} placeholder="nama@email.com" /><//>
      ${mode !== 'forgot' && h`<${Field} label="Password"><input type="password" className=${inp} required value=${f.password} onChange=${set('password')} placeholder="Minimal 6 karakter" /><//>`}
      ${info && h`<div className="mb-3 rounded-xl bg-green-50 text-green-700 text-sm p-3">${info}</div>`}
      <button className=${btn + ' w-full mt-1'} disabled=${busy}>${busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : mode === 'register' ? 'Daftar' : 'Kirim link reset'}</button>
    </form>
    <div className="mt-4 text-sm text-center text-gray-500 space-y-1">
      ${mode === 'login' && h`<div><button className="text-pink-600 hover:underline" onClick=${() => setMode('forgot')}>Lupa password?</button></div>`}
      ${mode === 'login' ? h`<div>Belum punya akun? <button className="text-pink-600 font-medium hover:underline" onClick=${() => setMode('register')}>Daftar</button></div>`
        : h`<div><button className="text-pink-600 font-medium hover:underline" onClick=${() => setMode('login')}>Kembali ke login</button></div>`}
    </div><//>`;
}

export function RecoveryScreen({ onDone }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    const r = await q(sb.auth.updateUser({ password: pw }), 'Password berhasil diperbarui');
    setBusy(false);
    if (!r.error) onDone();
  }
  return h`<${Shell}><h2 className="font-semibold mb-4">Buat password baru</h2>
    <form onSubmit=${submit}><${Field} label="Password baru"><input type="password" minLength="6" required className=${inp} value=${pw} onChange=${(e) => setPw(e.target.value)} /><//>
    <button className=${btn + ' w-full'} disabled=${busy}>Simpan password</button></form><//>`;
}

export function GroupGate({ profile, onJoined, onLogout }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(localStorage.getItem('pendingInvite') || '');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault(); setBusy(true);
    const r = await q(sb.rpc('create_group', { group_name: name.trim() }), 'Kelompok dibuat');
    setBusy(false);
    if (!r.error) onJoined(r.data.id);
  }
  async function join(e) {
    e.preventDefault(); setBusy(true);
    const r = await q(sb.rpc('join_group', { code }), 'Berhasil bergabung');
    setBusy(false);
    if (!r.error) { localStorage.removeItem('pendingInvite'); onJoined(r.data.id); }
  }
  return h`<${Shell}>
    <p className="text-center text-sm text-gray-500 -mt-3 mb-5">Halo, <b>${profile?.name}</b>! Buat kelompok baru atau gabung dengan kode undangan.</p>
    <form onSubmit=${create} className="rounded-2xl border border-gray-100 p-4 mb-4">
      <h3 className="font-semibold text-sm mb-2">Buat kelompok baru</h3>
      <input className=${inp + ' mb-2'} required value=${name} onChange=${(e) => setName(e.target.value)} placeholder="Nama kelompok, mis. Kelompok 5 Capstone" />
      <button className=${btn + ' w-full'} disabled=${busy}>Buat kelompok (jadi Ketua)</button></form>
    <form onSubmit=${join} className="rounded-2xl border border-gray-100 p-4">
      <h3 className="font-semibold text-sm mb-2">Gabung ke kelompok</h3>
      <input className=${inp + ' mb-2 uppercase tracking-widest'} required value=${code} onChange=${(e) => setCode(e.target.value)} placeholder="KODE UNDANGAN" />
      <button className=${btn2 + ' w-full'} disabled=${busy}>Gabung</button></form>
    <button onClick=${onLogout} className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600">Keluar</button><//>`;
}
