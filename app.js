
function AuthedApp({ user }) {
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState(null);
  const [gid, setGid] = useState(localStorage.getItem('cg'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const selectGroup = useCallback((id) => {
    if (!id) return;
    localStorage.setItem('cg', id);
    setGid(id);
    go('#/dashboard');
  }, []);

  // Memuat profil pengguna
  const loadProfile = useCallback(async () => {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Profile error:', error);
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
      console.error('Insert profile error:', insertError);
      throw new Error('Gagal membuat profil: ' + insertError.message);
    }

    if (!created) {
      throw new Error('Profil tidak ditemukan.');
    }

    setProfile(created);
    return created;
  }, [user.id, user.email]);

  // Memuat kelompok pengguna
  const loadGroups = useCallback(async (pick) => {
    const { data, error } = await sb
      .from('group_members')
      .select('group_id, role, groups(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Groups error:', error);
      throw new Error('Gagal mengambil kelompok: ' + error.message);
    }

    const result = data || [];
    setGroups(result);

    if (pick) {
      const found = result.find(g => g.group_id === pick);
      if (found) {
        localStorage.setItem('cg', pick);
        setGid(pick);
        go('#/dashboard');
      }
    }

    return result;
  }, [user.id]);

  // Inisialisasi aplikasi
  const initialize = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await loadProfile();

      const pending = localStorage.getItem('pendingInvite');

      if (pending) {
        const { data, error } = await sb.rpc('join_group', {
          code: pending
        });

        if (error) {
          console.error('Join group error:', error);
          toast(error.message, 'error');
        } else if (data?.id) {
          localStorage.setItem('cg', data.id);
          setGid(data.id);
          toast('Berhasil bergabung ke kelompok');
        }

        localStorage.removeItem('pendingInvite');
      }

      await loadGroups();

    } catch (err) {
      console.error('Initialization error:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat aplikasi.');
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadGroups]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Menangani undangan kelompok saat pengguna sudah login
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
        console.error('Invite error:', err);
        toast(err.message, 'error');
      }
    };

    window.addEventListener('hashchange', handleInvite);

    return () => {
      window.removeEventListener('hashchange', handleInvite);
    };
  }, [loadGroups]);

  // Logout
  const signOut = async () => {
    localStorage.removeItem('cg');

    const { error } = await sb.auth.signOut();

    if (error) {
      toast(error.message, 'error');
      return;
    }

    go('#/dashboard');
  };

  // Tombol coba lagi
  const retry = () => {
    initialize();
  };

  // Tampilan loading
  if (loading) {
    return h`
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <${Spinner} />
        <p className="text-sm text-gray-500">Memuat Capstone Tracker...</p>
      </div>
    `;
  }

  // Tampilan error
  if (error) {
    return h`
      <div className="min-h-screen flex items-center justify-center p-5 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-3xl mb-3">!</div>
          <h2 className="font-bold text-lg mb-2">Gagal Memuat Aplikasi</h2>
          <p className="text-sm text-gray-500 mb-5">${error}</p>
          <button
            onClick=${retry}
            className="w-full rounded-xl bg-pink-500 text-white py-3 font-semibold"
          >
            Coba Lagi
          </button>
          <button
            onClick=${signOut}
            className="w-full rounded-xl border border-gray-200 py-3 mt-2"
          >
            Keluar
          </button>
        </div>
      </div>
    `;
  }

  // Jika profil belum berhasil dimuat
  if (!profile || !groups) {
    return h`
      <div className="min-h-screen flex items-center justify-center">
        <p>Data pengguna belum tersedia.</p>
      </div>
    `;
  }

  // Cari kelompok aktif
  const memb =
    groups.find(g => g.group_id === gid) || groups[0];

  // Jika belum memiliki kelompok
  if (!memb) {
    return h`
      <${GroupGate}
        profile=${profile}
        onJoined=${async (id) => {
          await loadGroups(id);
        }}
        onLogout=${signOut}
      />
    `;
  }

  const app = {
    groups,
    signOut,
    switchGroup: selectGroup,
    refreshProfile: loadProfile,

    reloadGroups: async (left, pick) => {
      const result = await loadGroups(pick);

      if (left) {
        localStorage.removeItem('cg');
        setGid(result[0]?.group_id || null);
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
