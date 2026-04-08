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

  const alarmEnabled = document.getElementById('alarm-enabled');
  const alarmTime = document.getElementById('alarm-time');
  const alarmDaysEl = document.getElementById('alarm-days');
  const alarmSave = document.getElementById('alarm-save');
  const alarmTest = document.getElementById('alarm-test');
  const alarmNext = document.getElementById('alarm-next');

  function status(msg) {
    if (dataStatus) dataStatus.textContent = msg;
  }

  function statusSound(msg) {
    if (soundStatus) soundStatus.textContent = msg || '';
  }

  function renderDays(selected = []) {
    if (!alarmDaysEl) return;
    alarmDaysEl.querySelectorAll('button').forEach((btn) => {
      const day = Number(btn.dataset.day);
      btn.classList.toggle('active', selected.includes(day));
    });
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
    const alarm = settings.alarm || {};
    if (alarmEnabled) alarmEnabled.checked = !!alarm.enabled;
    if (alarmTime) alarmTime.value = alarm.time || '07:00';
    renderDays(alarm.days || []);
    updateNextAlarmText();
  }

  function selectedDays() {
    if (!alarmDaysEl) return [];
    return Array.from(alarmDaysEl.querySelectorAll('button.active')).map((btn) =>
      Number(btn.dataset.day)
    );
  }

  if (alarmDaysEl) {
    alarmDaysEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      btn.classList.toggle('active');
    });
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
      status(t('settings_saved'));
      if (prevLang !== nextLang) {
        window.location.reload();
      }
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

  if (alarmSave) {
    alarmSave.addEventListener('click', async () => {
      await window.AppStorage.updateState((s) => {
        s.settings.alarm.enabled = alarmEnabled ? alarmEnabled.checked : false;
        s.settings.alarm.time = alarmTime ? alarmTime.value : '07:00';
        s.settings.alarm.days = selectedDays();
        return s;
      });
      await window.AlarmScheduler.schedule();
      if (alarmEnabled?.checked) {
        await window.AlarmScheduler.requestPermission();
      }
      updateNextAlarmText();
      status(t('settings_alarm_saved'));
    });
  }

  if (alarmTest) {
    alarmTest.addEventListener('click', () => {
      window.AlarmScheduler.triggerTest();
    });
  }

  async function updateNextAlarmText() {
    if (!alarmNext) return;
    const next = await window.AlarmScheduler.nextAlarmDate();
    if (!next) {
      alarmNext.textContent = t('settings_alarm_none');
    } else {
      alarmNext.textContent = t('settings_alarm_next', { datetime: next.toLocaleString() });
    }
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
          await window.AlarmScheduler.schedule();
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
      await window.AlarmScheduler.schedule();
      status(t('settings_reset_done'));
    });
  }

  loadPrefs();
})();
