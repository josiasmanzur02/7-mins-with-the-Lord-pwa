(() => {
  const t = window.t || ((key) => key);
  const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24h chunks to avoid overflow
  let timeoutId = null;
  let snoozeId = null;

  function createModal() {
    let modal = document.getElementById('alarm-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'alarm-modal';
    modal.className = 'alarm-panel';
    modal.innerHTML = `
      <div class="alarm-card">
        <div class="alarm-header">
          <div class="alarm-dot"></div>
          <div>
            <p class="muted small">${t('alarm_title')}</p>
            <h2>${t('alarm_heading')}</h2>
          </div>
        </div>
        <p class="muted">${t('alarm_body')}</p>
        <div class="controls">
          <button id="alarm-start">${t('alarm_start')}</button>
          <button id="alarm-snooze" class="ghost">${t('alarm_snooze')}</button>
          <button id="alarm-stop" class="ghost">${t('alarm_stop')}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#alarm-start')?.addEventListener('click', () => {
      hideModal();
      window.location.href = '/timer#alarm';
    });
    modal.querySelector('#alarm-snooze')?.addEventListener('click', () => {
      hideModal();
      scheduleSnooze(10 * 60 * 1000);
    });
    modal.querySelector('#alarm-stop')?.addEventListener('click', hideModal);
    return modal;
  }

  function showModal() {
    const modal = createModal();
    modal.classList.add('open');
  }

  function hideModal() {
    const modal = document.getElementById('alarm-modal');
    if (modal) modal.classList.remove('open');
  }

  function msUntil(date) {
    return date.getTime() - Date.now();
  }

  function dayIndex(d) {
    return d.getDay(); // 0 Sunday ... 6 Saturday
  }

  async function nextAlarmDate(now = new Date()) {
    const state = await window.AppStorage.getState();
    const alarm = state.settings.alarm;
    if (!alarm.enabled || !alarm.time || !Array.isArray(alarm.days) || !alarm.days.length) return null;
    const [h, m] = alarm.time.split(':').map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    for (let i = 0; i < 7; i++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + i);
      candidate.setHours(h, m, 0, 0);
      if (!alarm.days.includes(dayIndex(candidate))) continue;
      if (candidate <= now) continue;
      return candidate;
    }
    return null;
  }

  function scheduleSnooze(delayMs) {
    if (snoozeId) clearTimeout(snoozeId);
    snoozeId = setTimeout(() => trigger('snooze'), delayMs);
  }

  async function schedule() {
    if (timeoutId) clearTimeout(timeoutId);
    const next = await nextAlarmDate();
    if (!next) return;
    const diff = msUntil(next);
    const wait = Math.min(diff, MAX_TIMEOUT);
    timeoutId = setTimeout(() => trigger('schedule'), wait);
    return next;
  }

  function maybeNotify() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (navigator.serviceWorker?.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg || !reg.showNotification) return;
        reg.showNotification(t('alarm_notification_title'), {
          body: t('alarm_notification_body'),
          tag: 'seven-minutes-alarm',
        });
      });
      return;
    }
    new Notification(t('alarm_notification_title'), {
      body: t('alarm_notification_body'),
      tag: 'seven-minutes-alarm',
    });
  }

  async function trigger(reason) {
    window.AudioManager?.play('alarm');
    showModal();
    maybeNotify();
    await window.AppStorage.updateState((s) => {
      s.settings.alarm.lastTriggeredAt = new Date().toISOString();
      return s;
    });
    // reschedule next alarm (ignores snooze override)
    schedule();
  }

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (_) {}
    }
    return Notification.permission;
  }

  window.AlarmScheduler = {
    schedule,
    triggerTest: () => trigger('manual'),
    requestPermission,
    nextAlarmDate,
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule();
  });

  // kick off on load
  schedule();
})();
