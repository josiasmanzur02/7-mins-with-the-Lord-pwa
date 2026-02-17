(() => {
  const t = window.t || ((key) => key);
  const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24h chunks to avoid overflow
  let timeoutId = null;

  // Pure notification scheduler (no modal UI)
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
    maybeNotify();
    await window.AppStorage.updateState((s) => {
      s.settings.alarm.lastTriggeredAt = new Date().toISOString();
      return s;
    });
    // reschedule next alarm
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
