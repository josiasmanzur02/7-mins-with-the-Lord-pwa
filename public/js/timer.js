(() => {
  const steps = window.STEPS || [];
  const verseBox = document.querySelector('.verse');
  const titleEl = document.querySelector('.step-title');
  const timerEl = document.querySelector('.timer-display');
  const listItems = Array.from(document.querySelectorAll('.step-item'));
  const pauseBtn = document.getElementById('pause-btn');
  const backBtn = document.getElementById('back-btn');
  const exitBtn = document.getElementById('exit-btn');
  const progressText = document.querySelector('.progress-text');
  const statusEl = document.getElementById('status');

  const verses = [
    { ref: 'Romans 10:13', text: 'For whosoever shall call upon the name of the Lord shall be saved.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Romans%2010:13' },
    { ref: 'Philippians 4:6', text: 'In every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Philippians%204:6' },
    { ref: 'Jeremiah 15:16', text: 'Thy words were found, and I did eat them; and thy word was unto me the joy and rejoicing of mine heart.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Jeremiah%2015:16' },
    { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and just to forgive us our sins.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=1%20John%201:9' },
    { ref: 'Romans 12:1', text: 'Present your bodies a living sacrifice, holy, acceptable unto God.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Romans%2012:1' },
    { ref: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=1%20Thessalonians%205:18' },
    { ref: 'Matthew 7:7', text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.', link: 'https://text.recoveryversion.bible/RcV.htm?reference=Matthew%207:7' },
  ];

  let index = 0;
  let remaining = steps[0]?.seconds || 0;
  let ticker = null;
  let paused = true;

  function fmt(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // ignore
    }
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
    verseBox.innerHTML = `<div>${verse.text}</div><a href="${verse.link}" target="_blank" rel="noreferrer">${verse.ref}</a>`;
    progressText.textContent = `${index + 1} / ${steps.length}`;
  }

  function nextStep() {
    beep();
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

  function tick() {
    if (remaining <= 0) {
      nextStep();
      return;
    }
    remaining -= 1;
    timerEl.textContent = fmt(remaining);
  }

  function start() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 1000);
    paused = false;
    pauseBtn.textContent = 'Pause';
  }

  function pause() {
    if (ticker) clearInterval(ticker);
    paused = true;
    pauseBtn.textContent = 'Resume';
  }

  function togglePause() {
    if (paused) start();
    else pause();
  }

  async function finish() {
    pause();
    statusEl.textContent = 'Saving your session...';
    try {
      const res = await fetch('/devotion/complete', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        statusEl.textContent = `Session saved. Streak: ${data.streak} day${data.streak === 1 ? '' : 's'}.`;
      } else {
        statusEl.textContent = 'Saved locally, but server did not confirm.';
      }
    } catch (e) {
      statusEl.textContent = 'Offline? The session could not be recorded.';
    }
  }

  pauseBtn.addEventListener('click', togglePause);
  backBtn.addEventListener('click', prevStep);
  exitBtn.addEventListener('click', () => {
    window.location.href = '/home';
  });

  render();
  start();
})();
