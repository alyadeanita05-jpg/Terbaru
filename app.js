
function AuthedApp({ user }) {
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState(null);
  const [gid, setGid] = useState(localStorage.getItem('cg'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Memilih kelompok aktif
  const selectGroup = useCallback((id) => {
    if (!id) return;
    localStorage.setItem('cg', id);
    setGid(id);
    go('#/dashboard');
  }, []);

  // Mengambil profil pengguna
  const loadProfile = useCallback(async () => {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error('Gagal mengambil profil: ' + error.message);
    }

    if (data) {
      setProfile(data);
      return data;
    }

    // Membuat profil jika belum tersedia
    const { data: created, error: insertError } = await sb
      .from('profiles')
      .upsert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Pengguna',
        email: user.email || ''
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Gagal membuat profil: ' + insertError.message);
    }

    if (!created) {
      throw new Error('Data profil tidak ditemukan.');
    }

    setProfile(created);
    return created;
  }, [user.id, user.email]);

  // Mengambil kelompok pengguna
  const loadGroups = useCallback(async (pick) => {
    const { data, error } = await sb
      .from('group_members')
      .select('group_id, role, groups(*)')
      .eq('user_id', user.id);

    if (error) {
      throw new Error('Gagal mengambil kelompok: ' + error.message);
    }

    const result = data || [];
    setGroups(result);

    if (pick && result.some(g => g.group_id === pick)) {
      localStorage.setItem('cg', pick);
      setGid(pick);
      go('#/dashboard');
    }

    return result;
  }, [user.id]);

  // Memuat seluruh data awal
  const initialize = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await loadProfile();

      // Memproses undangan yang disimpan sebelum login
      const pending = localStorage.getItem('pendingInvite');

      if (pending) {
        const { data, error } = await sb.rpc('join_group', {
          code: pending
        });

        localStorage.removeItem('pendingInvite');

        if (error) {
          toast('Gagal bergabung: ' + error.message, 'error');
        } else if (data?.id) {
          toast('Berhasil bergabung ke kelompok');
          localStorage.setItem('cg', data.id);
          setGid(data.id);
        }
      }

      await loadGroups();

    } catch (err) {
      console.error('AuthedApp initialization error:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat aplikasi.');
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadGroups]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Menangani link undangan yang dibuka saat sudah login
  useEffect(() => {
    const handleInvite = async () => {
      const match = location.hash.match(/^#\/join\/([A-Za-z0-9]+)/);
      if (!match) return;

      try {
        const { data, error } = await sb.rpc('join_group', {
          code: match[1]
        });

        if (error) {
          toast(error.message, 'error');
          return;
        }

        if (data?.id) {
          toast('Berhasil bergabung ke kelompok');
          await loadGroups(data.id);
        }
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    window.addEventListener('hashchange', handleInvite);

    return () => {
      window.removeEventListener('hashchange', handleInvite);
    };
  }, [loadGroups]);

  // Keluar dari akun
  const signOut = async () => {
    const { error } = await sb.auth.signOut();

    if (error) {
      toast(error.message, 'error');
      return;
    }

    localStorage.removeItem('cg');
    localStorage.removeItem('pendingInvite');
    go('#/dashboard');
  };

  // Tampilan loading
  if (loading) {
    return h`
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-pink-50">
        <${Spinner} />
        <p className="text-sm text-gray-500">
          Sedang memuat data akun...
        </p>
      </div>
    `;
  }

  // Tampilan jika terjadi error
  if (error) {
    return h`
      <div className="min-h-screen flex items-center justify-center p-5 bg-pink-50">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-bold text-red-600 mb-3">
            Gagal Memuat Akun
          </h2>
          <p className="text-sm text-gray-600 mb-5">${error}</p>
          <button
            className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold"
            onClick=${initialize}
          >
            Coba Lagi
          </button>
          <button
            className="w-full rounded-xl border border-gray-200 py-3 mt-2"
            onClick=${signOut}
          >
            Keluar
          </button>
        </div>
      </div>
    `;
  }

  if (!profile || !groups) {
    return h`
      <div className="min-h-screen flex items-center justify-center">
        <p>Data akun belum tersedia. Silakan coba lagi.</p>
      </div>
    `;
  }

  // Memilih kelompok aktif
  const memb =
    groups.find(g => g.group_id === gid) || groups[0];

  // Jika belum mempunyai kelompok
  if (!memb) {
    return h`
      <${GroupGate}
        profile=${profile}
        onJoined=${async (id) => {
          try {
            await loadGroups(id);
          } catch (err) {
            toast(err.message, 'error');
          }
        }}
        onLogout=${signOut}
      />
    `;
  }

  // Data aplikasi
  const app = {
    groups,
    signOut,
    switchGroup: selectGroup,
    refreshProfile: loadProfile,

    reloadGroups: async (left, pick) => {
      try {
        const result = await loadGroups(pick);

        if (left) {
          localStorage.removeItem('cg');
          setGid(result[0]?.group_id || null);
        }

        return result;
      } catch (err) {
        toast(err.message, 'error');
        return [];
      }
    }
  };

  return h`
    <${Workspace}
      key=${memb.group_id}
      user=${user}
      profile=${profile}
      memb=${memb}
      groups=${groups}
      app=${app}
    />
  `;
}
