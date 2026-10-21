/* =====================================================================
   BERITA ANGIN - ba-cloud.js (v2)
   Jembatan web <-> mobile lewat Supabase. File yang sama dipakai web & PWA/aplikasi.
   Aktif hanya bila window.BA_SUPABASE diisi dengan URL dan anon key yang benar;
   selama belum diisi, situs tetap berjalan seperti semula (hanya lokal).
   ===================================================================== */
(function (W) {
  'use strict';

  var CFG = W.BA_SUPABASE || {};
  var BUCKET = 'media';
  var LIM = { image: 15 * 1048576, gif: 15 * 1048576, video: 100 * 1048576, audio: 30 * 1048576 };
  var sb = null;

  function configured() {
    return !!(CFG.url && /^https:\/\//.test(CFG.url) && CFG.anonKey && CFG.anonKey.length > 40 &&
              W.supabase && W.supabase.createClient);
  }

  if (configured()) {
    sb = W.supabase.createClient(CFG.url, CFG.anonKey, {
      // PKCE: token kembali lewat ?code=, bukan #access_token (router situs membaca location.hash)
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function need() {
    if (!sb) throw new Error('Backend belum dikonfigurasi.');
    return sb;
  }

  /* ---------- notifikasi kecil ---------- */
  function notify(msg, ms) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;' +
        'max-width:90vw;padding:10px 16px;border-radius:12px;background:#111827;color:#fff;' +
        'font:500 13px/1.4 Inter,Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);border:1px solid #334155';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, ms || 4500);
    } catch (e) {}
  }

  /* ---------- util ---------- */
  var EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
              'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
              'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'weba' };

  function kindOf(blob) {
    var t = (blob && blob.type) || '';
    if (t === 'image/gif') return 'gif';
    if (t.indexOf('image/') === 0) return 'image';
    if (t.indexOf('video/') === 0) return 'video';
    if (t.indexOf('audio/') === 0) return 'audio';
    return null;
  }

  function mediaUrl(path) {
    return path ? need().storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;
  }

  async function uploadBlob(userId, postId, slot, blob) {
    var k = kindOf(blob);
    if (!k) throw new Error('Jenis file tidak didukung.');
    if (blob.size > LIM[k]) {
      throw new Error('File terlalu besar (maks. ' + Math.round(LIM[k] / 1048576) + ' MB untuk ' + k + ').');
    }
    var path = userId + '/' + postId + '-' + slot + '.' + (EXT[blob.type] || 'bin'); // folder = id pengguna (syarat RLS)
    var r = await need().storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type, cacheControl: '31536000', upsert: true
    });
    if (r.error) throw r.error;
    return path;
  }

  /* ---------- AUTH ---------- */
  var Auth = {
    async signUp(email, password, name) {
      var r = await need().auth.signUp({ email: email, password: password, options: { data: { name: name } } });
      if (r.error) throw r.error;
      return r.data; // data.session kosong bila "Confirm email" aktif
    },
    async signIn(email, password) {
      var r = await need().auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw r.error;
      return r.data.user;
    },
    /* dipakai tombol "Lanjutkan dengan Google" yang sudah ada (token dari Google Identity Services) */
    async signInGoogleIdToken(idToken) {
      var r = await need().auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (r.error) throw r.error;
      return r.data.user;
    },
    async signInGoogle() { // alternatif lewat redirect
      var r = await need().auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: W.location.origin + W.location.pathname }
      });
      if (r.error) throw r.error;
    },
    async signOut() {
      var r = await need().auth.signOut();
      if (r.error) throw r.error;
    },
    async user() {
      var r = await need().auth.getUser();
      return r.data && r.data.user ? r.data.user : null;
    },
    onChange(cb) {
      var s = need().auth.onAuthStateChange(function (_e, session) { cb(session ? session.user : null); });
      return function () { s.data.subscription.unsubscribe(); };
    }
  };

  /* ---------- baris DB <-> objek postingan situs ---------- */
  var COLS = 'id,user_id,kind,text,data,files,created_at';

  function toPost(row) {
    var f = row.files || {}, d = row.data || {}, c = {};
    ['img', 'med', 'mus'].forEach(function (k) { if (f[k]) c[k] = mediaUrl(f[k]); });
    var o = { id: row.id, kind: row.kind, ts: Date.parse(row.created_at) || Date.now(),
              text: row.text || '', img: c.img || '', uid: row.user_id, synced: 1, cloud: c };
    if (d.att) o.att = d.att;
    if (row.kind === 'artikel') { o.title = d.title || ''; o.cat = d.cat || ''; o.rt = d.rt || 1; }
    return o;
  }

  /* push(o, pend): unggah foto/video/GIF/audio lalu simpan postingan. pend = {med: File, mus: File} */
  async function push(o, pend) {
    var user = await Auth.user();
    if (!user) throw new Error('Belum login ke cloud.');
    pend = pend || {};
    var files = {}, uploaded = [];
    try {
      if (o.img && String(o.img).indexOf('data:') === 0) {
        var ib = await (await fetch(o.img)).blob();
        files.img = await uploadBlob(user.id, o.id, 'img', ib); uploaded.push(files.img);
      }
      if (pend.med) { files.med = await uploadBlob(user.id, o.id, 'med', pend.med); uploaded.push(files.med); }
      if (pend.mus) { files.mus = await uploadBlob(user.id, o.id, 'mus', pend.mus); uploaded.push(files.mus); }

      var data = { att: o.att ? JSON.parse(JSON.stringify(o.att)) : null };
      if (o.kind === 'artikel') { data.title = o.title; data.cat = o.cat; data.rt = o.rt; }

      var r = await need().from('posts').insert({
        id: o.id, kind: o.kind, text: o.text || '', data: data, files: files
      }).select(COLS).single();
      if (r.error) throw r.error;

      var c = {};
      Object.keys(files).forEach(function (k) { c[k] = mediaUrl(files[k]); });
      return { uid: user.id, cloud: c };
    } catch (e) {
      if (uploaded.length) { try { await need().storage.from(BUCKET).remove(uploaded); } catch (x) {} } // bersihkan file yatim
      throw e;
    }
  }

  async function fetchPosts(limit) {
    var r = await need().from('posts').select(COLS).order('created_at', { ascending: false }).limit(limit || 100);
    if (r.error) throw r.error;
    return r.data;
  }

  async function removePost(id) {
    var r = await need().from('posts').delete().eq('id', id).select('files');
    if (r.error) throw r.error;
    var paths = [];
    (r.data || []).forEach(function (row) {
      var f = row.files || {};
      Object.keys(f).forEach(function (k) { if (f[k]) paths.push(f[k]); });
    });
    if (paths.length) { try { await need().storage.from(BUCKET).remove(paths); } catch (e) {} }
  }

  function subscribe(h) {
    var ch = need().channel('posts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, function (p) {
        if (h.onInsert) h.onInsert(toPost(p.new));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, function (p) {
        if (h.onDelete) h.onDelete(p.old.id);
      })
      .subscribe();
    return function () { need().removeChannel(ch); };
  }

  async function setAvatar(file) {
    var user = await Auth.user();
    if (!user) throw new Error('Belum login ke cloud.');
    if (kindOf(file) !== 'image') throw new Error('Avatar harus berupa gambar.');
    var path = await uploadBlob(user.id, 'avatar', String(Date.now()), file);
    var url = mediaUrl(path);
    var r = await need().from('profiles').update({ avatar_url: url }).eq('id', user.id);
    if (r.error) throw r.error;
    return url;
  }

  /* ---------- sinkron dengan lini masa situs (window.__baTL dibuat di index.html) ---------- */
  var live = null, startedFor = null;

  async function pull() {
    try {
      var rows = await fetchPosts(100), ids = {};
      W.__baRows = rows.length;
      rows.forEach(function (r) { ids[r.id] = 1; W.__baTL.add(toPost(r)); });
      var oldest = rows.length ? Date.parse(rows[rows.length - 1].created_at) : 0;
      W.__baTL.synced().forEach(function (p) { // dihapus di perangkat lain
        if (!ids[p.id] && (rows.length < 100 || p.ts >= oldest)) W.__baTL.remove(p.id);
      });
    } catch (e) { notify('Gagal memuat postingan dari cloud.'); }
  }

  /* unggah postingan lama yang baru tersimpan di browser ini */
  async function migrate() {
    if (!W.__baTL || !W.__baTL.unsynced) return;
    var list = W.__baTL.unsynced(), n = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      try {
        var pend = (W.__xpX && W.__xpX.pend) ? await W.__xpX.pend(o.id) : null;
        var res = await push(Object.assign({}, o), pend);
        o.synced = 1; o.uid = res.uid; o.cloud = res.cloud; n++;
      } catch (e) {
        if (e && (e.code === '23505' || /duplicate/i.test(String(e.message)))) o.synced = 1; // sudah ada di server
        else console.warn('[BACloud] migrasi gagal untuk', o.id, e);
      }
    }
    W.__baTL.persist();
    if (n) notify(n + ' postingan lama diunggah ke cloud.');
  }

  /* akun lama yang hanya lokal: sambungkan ke cloud memakai email & kata sandi yang sama */
  async function upgrade(email, password, name) {
    if (!sb) return;
    try {
      if (await Auth.user()) return;
      try { await Auth.signIn(email, password); return; }
      catch (e) { if (!/invalid login|credentials/i.test(String(e && e.message))) throw e; }
      var d = await Auth.signUp(email, password, name);
      if (!d.session) notify('Akun cloud dibuat. Cek email untuk verifikasi, lalu Sign In ulang agar tersinkron.', 8000);
      else notify('Akun tersambung ke cloud.');
    } catch (e) {
      var m = String(e && e.message || e);
      if (/already/i.test(m)) m = 'Email ini sudah ada di cloud dengan kata sandi berbeda. Sign In memakai kata sandi cloud-nya.';
      notify('Sinkron cloud gagal: ' + m, 8000);
    }
  }

  function startSync(user) {
    if (!sb || !W.__baTL || !user || startedFor === user.id) return;
    startedFor = user.id;
    W.__baMe = user.id;
    pull().then(migrate);
    if (live) live();
    live = subscribe({
      onInsert: function (o) { W.__baTL.add(o); },
      onDelete: function (id) { W.__baTL.remove(id); }
    });
  }

  W.__baPush = function (o) {
    var pend = W.__baPend && W.__baPend[o.id];
    if (W.__baPend) delete W.__baPend[o.id];
    if (!sb) return;
    var snap = Object.assign({}, o); // o.img bisa dikosongkan situs bila localStorage penuh
    push(snap, pend).then(function (res) {
      o.synced = 1; o.uid = res.uid; o.cloud = res.cloud;
      W.__baTL.persist();
    }).catch(function (e) {
      notify('Postingan tersimpan di perangkat ini saja: ' + (e && e.message ? e.message : 'gagal sinkron'));
    });
  };

  W.__baDrop = function (id) {
    if (!sb) return;
    removePost(id).catch(function () {});
  };

  function diagnose() {
    if (!/[?&]cloud=debug/.test(W.location.search)) return;
    if (!sb) {
      var why = !(CFG.url && /^https:\/\//.test(CFG.url)) ? 'URL Supabase belum diisi di index.html'
              : !(CFG.anonKey && CFG.anonKey.length > 40) ? 'anon key belum diisi di index.html'
              : !(W.supabase && W.supabase.createClient) ? 'library supabase-js gagal dimuat (cek koneksi/cache)'
              : 'tidak diketahui';
      notify('CLOUD TIDAK AKTIF: ' + why, 12000);
      return;
    }
    Auth.user().then(function (u) {
      notify(u ? 'Cloud aktif. Login cloud: ' + u.email
               : 'Cloud aktif, tetapi BELUM login ke cloud. Sign Out lalu Sign In lagi.', 12000);
      if (u) setTimeout(function () { notify('Postingan di server: ' + (W.__baRows == null ? '...' : W.__baRows), 12000); }, 3500);
    }).catch(function (e) { notify('Cek cloud gagal: ' + (e && e.message), 12000); });
  }

  function init() {
    diagnose();
    if (!sb) return;
    Auth.onChange(function (user) {
      setTimeout(function () { // jangan memanggil API Supabase langsung di dalam callback ini
        if (user) startSync(user);
        else { startedFor = null; W.__baMe = null; if (live) { live(); live = null; } }
      }, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  W.BACloud = {
    get ready() { return !!sb; },
    client: function () { return need(); },
    auth: Auth,
    kindOf: kindOf,
    limits: LIM,
    mediaUrl: mediaUrl,
    push: push,
    fetchPosts: fetchPosts,
    removePost: removePost,
    subscribe: subscribe,
    setAvatar: setAvatar,
    startSync: startSync,
    upgrade: upgrade,
    migrate: migrate
  };
})(window);
