// Build statis untuk Vercel: menyalin file ke dist/ dan membuat config.js dari environment variables.
const fs = require('fs'), path = require('path');
const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  console.error('ERROR: SUPABASE_URL belum diisi atau formatnya salah. Contoh: https://abcdefgh.supabase.co (tanpa / di akhir, tanpa /rest/v1).');
  process.exit(1);
}
if (!key || key.startsWith('sb_secret_') || key.includes('service_role')) {
  console.error('ERROR: SUPABASE_PUBLISHABLE_KEY kosong, atau Anda memasukkan secret/service_role key. Pakai Publishable (anon) key saja.');
  process.exit(1);
}
const cp = require('child_process'), os = require('os');
const files = ['index.html', 'app.js', 'lib.js', 'auth.js', 'pages.js', 'pages2.js', 'task.js'];
// Toleran terhadap nama file yang bertambah akhiran, mis. "app br.js" atau "app (1).js" -> app.js
const present = fs.readdirSync('.');
const find = (name) => {
  if (present.includes(name)) return name;
  const ext = path.extname(name), base = name.slice(0, -ext.length);
  return present.find((f) => f.startsWith(base) && f.endsWith(ext) && !/^[0-9a-z]/i.test(f.slice(base.length, -ext.length || undefined))) || null;
};
const src = {};
for (const f of files) {
  src[f] = find(f);
  if (!src[f]) { console.error('ERROR: file ' + f + ' tidak ditemukan di repo. File yang ada: ' + present.join(', ')); process.exit(1); }
}
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const tmp = path.join(os.tmpdir(), 'chk-' + f.replace(/\.js$/, '.mjs'));
  fs.copyFileSync(src[f], tmp);
  try { cp.execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
  catch (e) { console.error('ERROR sintaks pada ' + src[f] + ':\n' + (e.stderr || e.message)); process.exit(1); }
}
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');
for (const f of files) fs.copyFileSync(src[f], path.join('dist', f));
fs.writeFileSync('dist/config.js', `export const SUPABASE_URL = ${JSON.stringify(url)};\nexport const SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`);
console.log('Build OK -> dist/');
