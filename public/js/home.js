(() => {
  const streakEl = document.getElementById('streak-count');
  const streakLabel = document.getElementById('streak-label');
  const lastEl = document.getElementById('last-check');
  const barFill = document.getElementById('streak-bar-fill');

  async function hydrate() {
    if (!window.AppStorage) return;
    const state = await window.AppStorage.getState();
    const streak = state.streak?.count || 0;
    const last = state.streak?.lastCheckDate;
    if (streakEl) streakEl.textContent = streak;
    const lang = document.documentElement.lang || 'en';
    if (streakLabel) {
      const singular = lang === 'es' ? 'día' : 'day';
      const plural = lang === 'es' ? 'días' : 'days';
      streakLabel.textContent = streak === 1 ? singular : plural;
    }
    if (lastEl) {
      lastEl.textContent = last
        ? (lang === 'es' ? `Última vez: ${last}` : `Last time: ${last}`)
        : lang === 'es'
          ? 'Aún no hay sesiones. Hoy es un gran día para empezar.'
          : 'No sessions yet. Today is a great day to start.';
    }
    if (barFill) {
      const pct = Math.min(100, ((streak % 7) || (streak ? 7 : 0)) / 7 * 100);
      barFill.style.width = `${pct}%`;
    }
  }

  hydrate();
})();
