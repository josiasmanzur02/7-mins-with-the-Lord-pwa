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

const APP_THEME_COLORS = {
  light: '#f3f7fb',
  dark: '#0c1220',
};

function applyAppTheme(theme = 'light', language = document.documentElement.lang || 'en') {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.lang = language || 'en';
  document.documentElement.style.colorScheme = nextTheme;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', APP_THEME_COLORS[nextTheme]);
  }
}

window.applyAppTheme = applyAppTheme;

// Audio manager shared across pages
const AudioManager = (() => {
  const SAMPLE_RATE = 44100;
  const ASSET_SOUND_SRCS = {
    ping: '/audio/ping.mp3',
    finish: '/audio/finish.mp3',
    alarm: '/audio/alarm.mp3',
  };
  const SOUND_PATTERNS = {
    silent: [{ freq: 440, duration: 0.04, gain: 0, type: 'sine' }],
    ping: [
      { freq: 1174, duration: 0.14, gain: 0.82, type: 'triangle' },
      { freq: 1568, duration: 0.22, gain: 0.36, type: 'sine', detune: 4 },
      { at: 0.08, freq: 1318, duration: 0.18, gain: 0.58, type: 'triangle' },
    ],
    finish: [
      { freq: 880, duration: 0.16, gain: 0.68, type: 'triangle' },
      { at: 0.11, freq: 1174, duration: 0.2, gain: 0.62, type: 'triangle' },
      { at: 0.24, freq: 1568, duration: 0.32, gain: 0.56, type: 'sine' },
    ],
    alarm: [
      { freq: 988, duration: 0.16, gain: 0.82, type: 'square' },
      { at: 0.18, freq: 1318, duration: 0.16, gain: 0.74, type: 'square' },
      { at: 0.42, freq: 988, duration: 0.16, gain: 0.82, type: 'square' },
      { at: 0.62, freq: 1318, duration: 0.2, gain: 0.74, type: 'square' },
    ],
  };

  let ctx = null;
  let primed = false;
  let volume = 1;
  let compressor = null;
  let masterGain = null;
  let primingPromise = null;
  let mediaEl = null;
  let soundUrls = null;
  let activeMediaSrc = '';
  let assetAvailability = Object.create(null);

  function clampVolume(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return 1;
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

  function ensureMediaEl() {
    if (mediaEl) return mediaEl;
    const element = new Audio();
    element.preload = 'auto';
    element.playsInline = true;
    element.setAttribute('playsinline', '');
    mediaEl = element;
    return mediaEl;
  }

  function sampleForType(type, phase) {
    if (type === 'square') return Math.sin(phase) >= 0 ? 1 : -1;
    if (type === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase));
    return Math.sin(phase);
  }

  function writeAscii(view, offset, value) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  function renderWaveBuffer(voices) {
    const totalDuration = voices.reduce(
      (max, voice) => Math.max(max, (voice.at || 0) + (voice.duration || 0.2) + 0.08),
      0.1
    );
    const totalSamples = Math.max(1, Math.ceil(totalDuration * SAMPLE_RATE));
    const samples = new Float32Array(totalSamples);

    voices.forEach((voice) => {
      const start = Math.floor((voice.at || 0) * SAMPLE_RATE);
      const durationSamples = Math.max(1, Math.floor((voice.duration || 0.2) * SAMPLE_RATE));
      const attack = Math.max(1, Math.floor(Math.min(0.008, (voice.duration || 0.2) / 4) * SAMPLE_RATE));
      const release = Math.max(1, Math.floor(Math.min(0.05, (voice.duration || 0.2) / 2) * SAMPLE_RATE));
      const freq = (voice.freq || 440) * Math.pow(2, (voice.detune || 0) / 1200);

      for (let i = 0; i < durationSamples && start + i < totalSamples; i += 1) {
        let env = 1;
        if (i < attack) env = i / attack;
        else if (i > durationSamples - release) env = Math.max(0, (durationSamples - i) / release);

        const phase = 2 * Math.PI * freq * (i / SAMPLE_RATE);
        samples[start + i] += sampleForType(voice.type || 'sine', phase) * env * (voice.gain || 0.5);
      }
    });

    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    const scale = peak > 0 ? 0.92 / peak : 1;

    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, totalSamples * 2, true);

    for (let i = 0; i < totalSamples; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i] * scale));
      view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
    }

    return buffer;
  }

  function ensureSoundUrls() {
    if (soundUrls) return soundUrls;
    soundUrls = {};
    Object.entries(SOUND_PATTERNS).forEach(([name, voices]) => {
      soundUrls[name] = URL.createObjectURL(new Blob([renderWaveBuffer(voices)], { type: 'audio/wav' }));
    });
    return soundUrls;
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

  async function warmMediaElement() {
    const urls = ensureSoundUrls();
    const element = ensureMediaEl();
    try {
      if (activeMediaSrc !== urls.silent) {
        element.src = urls.silent;
        activeMediaSrc = urls.silent;
        element.load();
      }
      element.volume = 0.001;
      const playPromise = element.play();
      if (playPromise) await playPromise;
      element.pause();
      element.currentTime = 0;
      primed = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  async function syncVolume() {
    try {
      const state = await window.AppStorage.getState();
      volume = clampVolume(state.settings.sound.volume ?? 1);
    } catch (_) {}
    return volume;
  }

  function applyVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    return volume;
  }

  async function prime() {
    if (primingPromise) return primingPromise;
    primingPromise = (async () => {
      const audio = ensureCtx();
      const webReady = await resumeAudio(audio);
      const mediaReady = primed ? true : await warmMediaElement();
      primed = webReady || mediaReady || primed;
      return primed;
    })().finally(() => {
      primingPromise = null;
    });
    return primingPromise;
  }

  function playVoice(audio, { at = 0, freq = 880, duration = 0.24, type = 'triangle', gain = 0.2, detune = 0 }, level = volume) {
    if (!audio) return;
    ensureOutput(audio);
    const when = audio.currentTime + at;
    const osc = audio.createOscillator();
    const g = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (detune) osc.detune.setValueAtTime(detune, when);

    g.gain.setValueAtTime(0.00001, when);
    g.gain.linearRampToValueAtTime(gain * level, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.00001, when + duration);

    osc.connect(g);
    g.connect(compressor || audio.destination);
    osc.start(when);
    osc.stop(when + duration + 0.03);
  }

  function playPattern(audio, voices, level = volume) {
    voices.forEach((voice) => playVoice(audio, voice, level));
  }

  function playWeb(name, level = volume) {
    const audio = ensureCtx();
    const voices = SOUND_PATTERNS[name];
    if (!audio || !voices || name === 'silent') return false;
    playPattern(audio, voices, level);
    return true;
  }

  async function playSource(src, level = volume) {
    if (!src) return false;
    const element = ensureMediaEl();

    try {
      element.pause();
      if (activeMediaSrc !== src) {
        element.src = src;
        activeMediaSrc = src;
        element.load();
      } else {
        element.currentTime = 0;
      }
      element.volume = Math.max(0.12, Math.min(1, 0.55 + level * 0.45));
      const playPromise = element.play();
      if (playPromise) await playPromise;
      primed = true;
      return true;
    } catch (_) {
      if (activeMediaSrc === src) {
        element.removeAttribute('src');
        element.load();
        activeMediaSrc = '';
      }
      return false;
    }
  }

  async function playMedia(name, level = volume) {
    if (name === 'silent') {
      return playSource(ensureSoundUrls().silent, level);
    }

    const assetSrc = ASSET_SOUND_SRCS[name];
    if (assetSrc && assetAvailability[name] !== false) {
      const playedAsset = await playSource(assetSrc, level);
      if (playedAsset) {
        assetAvailability[name] = true;
        return true;
      }
      assetAvailability[name] = false;
    }

    const generatedSrc = ensureSoundUrls()[name];
    if (!generatedSrc) return false;
    return playSource(generatedSrc, level);
  }

  async function play(name, options = {}) {
    const requestedVolume =
      options.volumeOverride !== undefined && options.volumeOverride !== null
        ? clampVolume(options.volumeOverride)
        : null;
    let soundEnabled = true;
    try {
      if (options.respectSetting !== false) {
        const state = await window.AppStorage.getState();
        soundEnabled = state.settings.sound.enabled !== false;
        volume = requestedVolume ?? clampVolume(state.settings.sound.volume ?? 1);
      } else if (requestedVolume !== null) {
        volume = requestedVolume;
      }
    } catch (_) {
      if (requestedVolume !== null) volume = requestedVolume;
    }

    if (!soundEnabled) return false;
    const level = requestedVolume ?? volume;

    await prime();

    if (await playMedia(name, level)) return true;

    const audio = ensureCtx();
    const ready = await resumeAudio(audio);
    if (!ready) return false;
    return playWeb(name, level);
  }

  async function playInteractive(name, options = {}) {
    const requestedVolume =
      options.volumeOverride !== undefined && options.volumeOverride !== null
        ? clampVolume(options.volumeOverride)
        : volume;
    volume = requestedVolume;
    await prime();
    if (await playMedia(name, requestedVolume)) return true;
    const audio = ensureCtx();
    const ready = await resumeAudio(audio);
    if (!ready) return false;
    return playWeb(name, requestedVolume);
  }

  return { prime, play, playInteractive, syncVolume, applyVolume };
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
    applyAppTheme(state.settings.theme || 'light', state.settings.language || 'en');
    await AudioManager.syncVolume();
  } catch (e) {
    // ignore and keep defaults
  }
})();
