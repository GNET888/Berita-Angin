(function () {
  var root = document.documentElement, KEY = 'ba-theme';
  var btn = document.getElementById('theme-toggle');
  function apply(mode, save) {
    root.classList.add('theme-anim');
    root.classList.remove('dark', 'light');
    root.classList.add(mode);
    if (btn) { btn.setAttribute('aria-checked', mode === 'light' ? 'true' : 'false'); btn.title = mode === 'light' ? 'Beralih ke tema gelap' : 'Beralih ke tema terang'; }
    if (save) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
    setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
  }
  apply(root.classList.contains('light') ? 'light' : 'dark', false);
  if (btn) btn.addEventListener('click', function () { apply('dark', true); });
  if (typeof loadLiveRates === 'function') loadLiveRates();
})();
