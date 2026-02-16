// Register service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.debug('SW registration failed', err));
  });
}

// Optional: soft page fade-in
document.documentElement.classList.add('ready');

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// Audio manager shared across pages
const AudioManager = (() => {
  let ctx = null;
  let primed = false;
  let volume = 0.7;

  function ensureCtx() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  }

  async function syncVolume() {
    try {
      const state = await window.AppStorage.getState();
      volume = Number(state.settings.sound.volume ?? 0.7);
    } catch (_) {}
  }

  function prime() {
    if (primed) return;
    const instance = ensureCtx();
    if (instance && instance.state === 'suspended') instance.resume();
    primed = true;
  }

  function playTone({ freq = 880, duration = 0.35, type = 'sine', gain = 0.07 }) {
    if (!primed) return;
    const audio = ensureCtx();
    if (!audio) return;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain * volume, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.00001, audio.currentTime + duration);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  async function play(name) {
    try {
      const state = await window.AppStorage.getState();
      if (!state.settings.sound.enabled) return;
      volume = Number(state.settings.sound.volume ?? 0.7);
    } catch (_) {
      // keep defaults
    }

    if (name === 'ping') playTone({ freq: 880, duration: 0.28, gain: 0.05 });
    else if (name === 'finish') playTone({ freq: 660, duration: 0.5, gain: 0.07, type: 'triangle' });
    else if (name === 'alarm') playTone({ freq: 520, duration: 0.8, gain: 0.12, type: 'square' });
  }

  return { prime, play, syncVolume };
})();

window.AudioManager = AudioManager;

// Prime audio on first user gesture
['pointerdown', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, () => AudioManager.prime(), { once: true, capture: true });
});

// Apply stored preferences (theme/language) once storage is ready
(async () => {
  try {
    const state = await window.AppStorage.getState();
    document.documentElement.dataset.theme = state.settings.theme || 'light';
    document.documentElement.lang = state.settings.language || 'en';
    await AudioManager.syncVolume();
  } catch (e) {
    // ignore and keep defaults
  }
})();
