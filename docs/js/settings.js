(() => {
  const t = window.t || ((key) => key);
  const themeSel = document.getElementById('theme');
  const langSel = document.getElementById('language');
  const soundEnabled = document.getElementById('sound-enabled');
  const soundVolume = document.getElementById('sound-volume');
  const soundTest = document.getElementById('sound-test');
  const soundStatus = document.getElementById('sound-status');
  const prefsForm = document.getElementById('prefs-form');
  const dataStatus = document.getElementById('data-status');
  const exportBtn = document.getElementById('export-data');
  const importInput = document.getElementById('import-data');
  const importBtn = document.getElementById('import-data-btn');
  const resetBtn = document.getElementById('reset-data');

  function status(msg) {
    if (dataStatus) dataStatus.textContent = msg;
  }

  function statusSound(msg) {
    if (soundStatus) soundStatus.textContent = msg || '';
  }

  async function loadPrefs() {
    const state = await window.AppStorage.getState();
    const { settings } = state;
    if (themeSel) themeSel.value = settings.theme || 'light';
    if (langSel) langSel.value = settings.language || 'en';
    if (soundEnabled) soundEnabled.checked = settings.sound?.enabled ?? true;
    if (soundVolume) soundVolume.value = settings.sound?.volume ?? 1;
    window.applyAppTheme?.(settings.theme || 'light', settings.language || 'en');
    window.AudioManager?.applyVolume?.(settings.sound?.volume ?? 1);
    try {
      localStorage.setItem('sevenMinutes:lang', settings.language || 'en');
    } catch (_) {}
  }

  if (prefsForm) {
    prefsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prevLang = document.documentElement.lang || 'en';
      await window.AppStorage.updateState((s) => {
        s.settings.theme = themeSel ? themeSel.value : 'light';
        s.settings.language = langSel ? langSel.value : 'en';
        s.settings.sound.enabled = soundEnabled ? soundEnabled.checked : true;
        s.settings.sound.volume = soundVolume ? Number(soundVolume.value || 1) : 1;
        return s;
      });
      await window.AudioManager?.syncVolume();
      const nextLang = langSel ? langSel.value : 'en';
      window.applyAppTheme?.(themeSel ? themeSel.value : 'light', nextLang);
      document.cookie = `lang=${nextLang}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem('sevenMinutes:lang', nextLang);
      } catch (_) {}
      if (prevLang !== nextLang) {
        window.location.href =
          window.AppRuntime?.route(window.AppRuntime.currentPage(), nextLang) || window.location.href;
        return;
      }
      status(t('settings_saved'));
    });
  }

  if (soundVolume) {
    soundVolume.addEventListener('input', () => {
      window.AudioManager?.applyVolume?.(soundVolume.value || 1);
    });
  }

  if (soundTest) {
    soundTest.addEventListener('click', async () => {
      if (soundEnabled && !soundEnabled.checked) {
        statusSound(t('settings_sound_disabled'));
        return;
      }

      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor && typeof Audio === 'undefined') {
        statusSound(t('settings_sound_context'));
        return;
      }

      const played = await window.AudioManager?.playInteractive?.('ping', {
        respectSetting: false,
        volumeOverride: soundVolume ? Number(soundVolume.value || 1) : 1,
      });
      statusSound(played ? t('settings_sound_test_ok') : t('settings_sound_context'));
      setTimeout(() => statusSound(''), 2500);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const json = await window.AppStorage.exportState();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'seven-minutes-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      status(t('settings_exported'));
    });
  }

  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => {
      importInput.value = '';
      importInput.click();
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          await window.AppStorage.importState(parsed);
          await loadPrefs();
          status(t('settings_imported'));
        } catch (err) {
          status(t('settings_invalid_file'));
        }
      };
      reader.readAsText(file);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm(t('settings_reset_confirm'))) return;
      await window.AppStorage.resetState();
      await loadPrefs();
      status(t('settings_reset_done'));
    });
  }

  loadPrefs();
})();
