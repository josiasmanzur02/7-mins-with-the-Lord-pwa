(() => {
  const t = window.t || ((key) => key);
  const lang = window.I18N_LANG || (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en';

  const streakEl = document.getElementById('streak-count');
  const streakLabel = document.getElementById('streak-label');
  const lastEl = document.getElementById('last-check');
  const barFill = document.getElementById('streak-bar-fill');
  const monthLabel = document.getElementById('month-label');
  const calendarGrid = document.getElementById('calendar-grid');
  const calendarWeekdays = document.getElementById('calendar-weekdays');
  const prevBtn = document.getElementById('month-prev');
  const nextBtn = document.getElementById('month-next');

  const weekdays =
    (window.I18N && window.I18N.settings_days_short) ||
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (calendarWeekdays) {
    calendarWeekdays.innerHTML = weekdays
      .map((d) => `<div class="cal-weekday">${d}</div>`)
      .join('');
  }

  let monthCursor = startOfMonth(new Date());
  let completed = new Set();

  // Utility: "2026-02-17" -> Date at local midnight
  function parseKey(key) {
    const [y, m, d] = key.split('-').map((n) => Number(n));
    return new Date(y, m - 1, d);
  }

  function daysBetween(a, b) {
    const MS = 86400000;
    return Math.round((a.getTime() - b.getTime()) / MS);
  }

  // Recompute streak client-side so UI reflects missed days even if a session wasn't opened
  function computeStreak(logs = []) {
    if (!logs.length) return { count: 0, last: null };
    const sorted = [...logs].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    const latestKey = sorted[0].date;
    const latest = parseKey(latestKey);
    const today = startOfDay(new Date());
    const gap = daysBetween(today, latest);
    if (gap > 1) return { count: 0, last: latestKey };

    let count = 1;
    let cursor = latest;
    for (let i = 1; i < sorted.length; i += 1) {
      const cur = parseKey(sorted[i].date);
      const diff = daysBetween(cursor, cur);
      if (diff === 1) {
        count += 1;
        cursor = cur;
      } else {
        break;
      }
    }
    return { count, last: latestKey };
  }

  const monthFormatter = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' });

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function dayKey(d) {
    return d.toISOString().slice(0, 10);
  }

  function renderCalendar() {
    if (!calendarGrid) return;
    const today = startOfDay(new Date());
    const todayKey = dayKey(today);
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const pad = firstDay.getDay(); // 0 = Sun

    calendarGrid.innerHTML = '';
    if (monthLabel) monthLabel.textContent = monthFormatter.format(monthCursor);

    for (let i = 0; i < pad; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell placeholder';
      calendarGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = dayKey(date);
      const isDone = completed.has(key);
      let status = 'future';
      if (date.getTime() === today.getTime()) status = isDone ? 'done' : 'today';
      else if (date < today) status = isDone ? 'done' : 'missed';

      const cell = document.createElement('div');
      cell.className = `cal-cell ${status.replace(' ', '-')}`;
      cell.innerHTML = `<span class="cal-day">${day}</span><span class="cal-dot"></span>`;
      calendarGrid.appendChild(cell);
    }
  }

  function updateStreakUI(state) {
    const { count: calcCount, last: calcLast } = computeStreak(state.logs || []);
    const streak = calcCount ?? state.streak?.count ?? 0;
    const last = calcLast ?? state.streak?.lastCheckDate;
    if (streakEl) streakEl.textContent = streak;
    if (streakLabel) streakLabel.textContent = window.tPlural ? window.tPlural(streak, 'home_day', 'home_days') : t(streak === 1 ? 'home_day' : 'home_days');

    if (lastEl) {
      const dateText = last
        ? (() => {
            const parts = last.split('-').map((n) => Number(n));
            return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(lang);
          })()
        : null;
      lastEl.textContent = dateText ? t('home_last_time', { date: dateText }) : t('home_no_sessions');
    }

    if (barFill) {
      const pct = Math.min(100, ((streak % 7) || (streak ? 7 : 0)) / 7 * 100);
      barFill.style.width = `${pct}%`;
    }
  }

  async function hydrate() {
    if (!window.AppStorage) return;
    const state = await window.AppStorage.getState();
    completed = new Set((state.logs || []).map((log) => log.date));
    updateStreakUI(state);
    renderCalendar();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    monthCursor = startOfMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
    renderCalendar();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    monthCursor = startOfMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1));
    renderCalendar();
  });

  hydrate();
})();
