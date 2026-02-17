(() => {
  const t = (key, vars) => (typeof window.t === 'function' ? window.t(key, vars) : key);
  const tPlural =
    window.tPlural ||
    ((count, s, p) =>
      count === 1
        ? (typeof window.t === 'function' ? window.t(s) : s)
        : (typeof window.t === 'function' ? window.t(p) : p));

  const steps = window.STEPS || [];
  const verseBox = document.querySelector('.verse-primary');
  const titleEl = document.querySelector('.step-title');
  const timerEl = document.querySelector('.timer-display');
  const listItems = Array.from(document.querySelectorAll('.step-row'));
  const pauseBtn = document.getElementById('pause-btn');
  const backBtn = document.getElementById('back-btn');
  const exitBtn = document.getElementById('exit-btn');
  const progressText = document.querySelector('.progress-text');
  const statusEl = document.getElementById('status');
  const toggleBtn = document.getElementById('toggle-steps');
  const stepsPanel = document.getElementById('steps-panel');
  const fromAlarm = window.location.hash === '#alarm';

  if (pauseBtn) pauseBtn.textContent = t('timer_start') || 'Start';
  if (backBtn) backBtn.textContent = t('timer_back') || 'Back';
  if (exitBtn) exitBtn.textContent = t('timer_exit') || 'Exit';
  if (toggleBtn) toggleBtn.textContent = t('timer_show_steps') || 'Show steps ↓';

  const verses = [
    { ref: 'Romans 10:13', text: 'For “whoever calls upon the name of the Lord shall be saved.”', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Romans%2010:13' },
    { ref: 'Philippians 4:6', text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God;', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Philippians%204:6' },
    { ref: 'Jeremiah 15:16', text: 'Your words were found and I ate them, / And Your word became to me / The gladness and joy of my heart, / For I am called by Your name, / O Jehovah, God of hosts.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Jeremiah%2015:16' },
    { ref: '1 John 1:9', text: 'If we confess our sins, He is faithful and righteous to forgive us our sins and cleanse us from all unrighteousness.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=1%20John%201:9' },
    { ref: 'Romans 12:1', text: 'I exhort you therefore, brothers, through the compassions of God to present your bodies a living sacrifice, holy, well pleasing to God, which is your reasonable service.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Romans%2012:1' },
    { ref: '1 Thessalonians 5:18', text: 'In everything give thanks; for this is the will of God in Christ Jesus for you.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=1%20Thessalonians%205:18' },
    { ref: 'Matthew 7:7', text: 'Ask and it shall be given to you; seek and you shall find; knock and it shall be opened to you.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Matthew%207:7' },
  ];

  let index = 0;
  let remaining = steps[0]?.seconds || 0;
  let ticker = null;
  let paused = true;
  let finished = false;
  const totalSeconds = steps.reduce((sum, s) => sum + (s.seconds || 0), 0);

  function fmt(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function render() {
    const step = steps[index];
    if (!step) return;
    titleEl.textContent = step.label;
    timerEl.textContent = fmt(remaining);
    listItems.forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
    const verse = verses[index] || verses[verses.length - 1];
    if (verseBox) {
      verseBox.innerHTML = `<div>${verse.text}</div><a href="${verse.link}" target="_blank" rel="noreferrer">${verse.ref}</a>`;
    }
    if (progressText) progressText.textContent = `${index + 1} / ${steps.length}`;
    // Remove back button from layout on first step
    if (backBtn) backBtn.classList.toggle('hidden', index === 0);
  }

  function tick() {
    if (remaining <= 0) {
      nextStep();
      return;
    }
    remaining -= 1;
    timerEl.textContent = fmt(remaining);
  }

  function start() {
    window.AudioManager?.prime();
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 1000);
    paused = false;
    pauseBtn.textContent = t('timer_pause');
  }

  function pause() {
    if (ticker) clearInterval(ticker);
    paused = true;
    pauseBtn.textContent = finished ? t('timer_restart') : t('timer_resume');
  }

  function togglePause() {
    if (finished) {
      // restart from scratch
      index = 0;
      remaining = steps[0]?.seconds || 0;
      finished = false;
      statusEl.textContent = '';
      render();
    }
    if (paused) start();
    else pause();
  }

  function nextStep() {
    window.AudioManager?.play('ping');
    if (index + 1 >= steps.length) {
      finish();
      return;
    }
    index += 1;
    remaining = steps[index].seconds;
    render();
  }

  function prevStep() {
    if (index === 0) return;
    index -= 1;
    remaining = steps[index].seconds;
    render();
  }

  function dateKey(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  async function finish() {
    pause();
    finished = true;
    statusEl.textContent = t('timer_saving');
    window.AudioManager?.play('finish');
    const today = dateKey(Date.now());
    const yesterday = dateKey(Date.now() - 86400000);
    const updated = await window.AppStorage.updateState((s) => {
      const last = s.streak.lastCheckDate;
      if (last === today) {
        // keep streak
      } else if (last === yesterday) {
        s.streak.count = (s.streak.count || 0) + 1;
      } else {
        s.streak.count = 1;
      }
      s.streak.lastCheckDate = today;
      const log = { date: today, durationSec: totalSeconds, steps: steps.length };
      s.logs = [log, ...(s.logs || [])].slice(0, 50);
      return s;
    });
    const label = tPlural(updated.streak.count, 'home_day', 'home_days');
    statusEl.textContent = t('timer_saved', { count: updated.streak.count, label });
    pauseBtn.textContent = t('timer_restart');
  }

  if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
  if (backBtn) backBtn.addEventListener('click', prevStep);
  if (exitBtn)
    exitBtn.addEventListener('click', () => {
      window.location.href = '/home';
    });

  if (toggleBtn && stepsPanel) {
    toggleBtn.addEventListener('click', () => {
      const open = stepsPanel.classList.toggle('open');
      toggleBtn.textContent = open ? t('timer_hide_steps') : t('timer_show_steps');
    });
  }

  if (fromAlarm && statusEl) {
    statusEl.textContent = t('timer_reminder_triggered');
  }

  render();
})();
