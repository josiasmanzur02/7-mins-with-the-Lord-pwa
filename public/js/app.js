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
  let volume = 0.8;
  let compressor = null;
  let masterGain = null;
  let primingPromise = null;

  function clampVolume(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return 0.8;
    return Math.max(0, Math.min(1, next));
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch (_) {
      ctx = new Ctor();
    }
    ensureOutput(ctx);
    return ctx;
  }

  function ensureOutput(audio = ensureCtx()) {
    if (!audio) return null;
    if (compressor && masterGain) return { compressor, masterGain };

    compressor = audio.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-22, audio.currentTime);
    compressor.knee.setValueAtTime(18, audio.currentTime);
    compressor.ratio.setValueAtTime(12, audio.currentTime);
    compressor.attack.setValueAtTime(0.003, audio.currentTime);
    compressor.release.setValueAtTime(0.18, audio.currentTime);

    masterGain = audio.createGain();
    masterGain.gain.setValueAtTime(0.96, audio.currentTime);

    compressor.connect(masterGain);
    masterGain.connect(audio.destination);
    return { compressor, masterGain };
  }

  async function resumeAudio(audio = ensureCtx()) {
    if (!audio) return false;
    ensureOutput(audio);

    if (audio.state !== 'running') {
      try {
        await audio.resume();
      } catch (_) {}
    }

    // iOS can require a tiny started source before the context stays usable.
    if (audio.state !== 'running') {
      try {
        const source = audio.createBufferSource();
        source.buffer = audio.createBuffer(1, 1, audio.sampleRate || 44100);
        const gain = audio.createGain();
        gain.gain.setValueAtTime(0.00001, audio.currentTime);
        source.connect(gain);
        gain.connect(masterGain || audio.destination);
        source.start(audio.currentTime);
        source.stop(audio.currentTime + 0.001);
      } catch (_) {}

      try {
        await audio.resume();
      } catch (_) {}
    }

    primed = audio.state === 'running';
    return primed;
  }

  async function syncVolume() {
    try {
      const state = await window.AppStorage.getState();
      volume = clampVolume(state.settings.sound.volume ?? 0.8);
    } catch (_) {}
    return volume;
  }

  async function prime() {
    if (primingPromise) return primingPromise;
    primingPromise = (async () => {
      const audio = ensureCtx();
      if (!audio) return false;
      return resumeAudio(audio);
    })().finally(() => {
      primingPromise = null;
    });
    return primingPromise;
  }

  function playVoice(audio, { at = 0, freq = 880, duration = 0.24, type = 'triangle', gain = 0.2, detune = 0 }) {
    if (!audio) return;
    ensureOutput(audio);
    const when = audio.currentTime + at;
    const osc = audio.createOscillator();
    const g = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (detune) osc.detune.setValueAtTime(detune, when);

    g.gain.setValueAtTime(0.00001, when);
    g.gain.linearRampToValueAtTime(gain * volume, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.00001, when + duration);

    osc.connect(g);
    g.connect(compressor || audio.destination);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  function playPattern(audio, voices) {
    voices.forEach((voice) => playVoice(audio, voice));
  }

  async function play(name) {
    let soundEnabled = true;
    try {
      const state = await window.AppStorage.getState();
      soundEnabled = state.settings.sound.enabled !== false;
      volume = clampVolume(state.settings.sound.volume ?? 0.8);
    } catch (_) {
      // keep defaults
    }

    if (!soundEnabled) return false;

    const audio = ensureCtx();
    if (!audio) return false;
    const ready = await resumeAudio(audio);
    if (!ready) return false;

    if (name === 'ping') {
      playPattern(audio, [
        { freq: 1174, duration: 0.18, gain: 0.22, type: 'triangle' },
        { freq: 1568, duration: 0.24, gain: 0.14, type: 'sine', detune: 4 },
        { at: 0.11, freq: 1318, duration: 0.2, gain: 0.18, type: 'triangle' },
      ]);
    } else if (name === 'finish') {
      playPattern(audio, [
        { freq: 880, duration: 0.18, gain: 0.2, type: 'triangle' },
        { at: 0.12, freq: 1174, duration: 0.22, gain: 0.18, type: 'triangle' },
        { at: 0.26, freq: 1568, duration: 0.34, gain: 0.18, type: 'sine' },
      ]);
    } else if (name === 'alarm') {
      playPattern(audio, [
        { freq: 988, duration: 0.16, gain: 0.24, type: 'square' },
        { at: 0.18, freq: 1318, duration: 0.16, gain: 0.22, type: 'square' },
        { at: 0.42, freq: 988, duration: 0.16, gain: 0.24, type: 'square' },
        { at: 0.6, freq: 1318, duration: 0.18, gain: 0.22, type: 'square' },
      ]);
    } else {
      return false;
    }

    return true;
  }

  return { prime, play, syncVolume };
})();

window.AudioManager = AudioManager;

// Prime audio on first user gesture
['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, () => {
    void AudioManager.prime();
  }, { capture: true, passive: evt !== 'keydown' });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void AudioManager.prime();
  }
});

window.addEventListener('pageshow', () => {
  void AudioManager.prime();
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
