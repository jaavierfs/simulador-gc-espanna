/**
 * Música y efectos procedurales con Web Audio, sin archivos externos.
 * El contexto se crea tras una interacción y se suspende si la pestaña se oculta.
 */
const KEY = "gce-audio";
let prefs = { enabled: true, music: true, effects: true, volume: 35 };
try {
  prefs = { ...prefs, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
} catch {}
let ctx,
  master,
  musicBus,
  fxBus,
  noiseBuffer,
  timer,
  nextBeat = 0,
  beat = 0,
  started = false,
  lastCue = "";
const $ = (id) => document.getElementById(id);
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  sync();
}
function sync() {
  const on = started && prefs.enabled;
  $("soundToggle").textContent = on ? "♪" : "♫";
  $("soundToggle").classList.toggle("muted", !on);
  $("soundToggle").setAttribute(
    "aria-label",
    on ? "Silenciar audio" : "Activar audio",
  );
  $("soundToggle").setAttribute("aria-pressed", String(on));
  $("musicEnabled").checked = prefs.music;
  $("effectsEnabled").checked = prefs.effects;
  $("audioVolume").value = prefs.volume;
  if (ctx) {
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(
      prefs.enabled ? Math.max(0, Math.min(100, prefs.volume)) / 100 : 0,
      t,
      0.12,
    );
    musicBus.gain.setTargetAtTime(prefs.music ? 0.14 : 0, t, 0.3);
    fxBus.gain.setTargetAtTime(prefs.effects ? 0.75 : 0, t, 0.1);
  }
}
function tone(freq, time, duration, level, type = "sine", bus = musicBus) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + 0.035);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  o.connect(g);
  g.connect(bus);
  o.start(time);
  o.stop(time + duration + 0.03);
}
function noise(time, duration, level, cutoff = 1800) {
  const src = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    g = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(level, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(fxBus);
  src.start(time);
  src.stop(time + duration + 0.03);
}
function thump(time, level = 0.5) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.frequency.setValueAtTime(130, time);
  o.frequency.exponentialRampToValueAtTime(43, time + 0.25);
  g.gain.setValueAtTime(level, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
  o.connect(g);
  g.connect(fxBus);
  o.start(time);
  o.stop(time + 0.4);
}
function musicTick() {
  if (
    !ctx ||
    ctx.state !== "running" ||
    !prefs.enabled ||
    !prefs.music ||
    document.hidden
  ) {
    if (ctx) nextBeat = ctx.currentTime + 0.1;
    return;
  }
  if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.05;
  const chords = [
    [220, 261.63, 329.63, 440],
    [174.61, 220, 261.63, 349.23],
    [196, 246.94, 293.66, 392],
    [164.81, 220, 261.63, 329.63],
  ];
  while (nextBeat < ctx.currentTime + 0.4) {
    const chord = chords[Math.floor(beat / 8) % 4],
      note = chord[[0, 2, 1, 3, 2, 1, 0, 2][beat % 8]];
    tone(note, nextBeat, 2.4, 0.13, "sine");
    tone(note * 2, nextBeat + 0.025, 1.8, 0.025, "triangle");
    if (beat % 8 === 0) {
      tone(chord[0] / 2, nextBeat, 6, 0.16, "sine");
      for (const f of chord.slice(0, 3))
        tone(f, nextBeat, 5.8, 0.035, "triangle");
    }
    nextBeat += 0.9;
    beat++;
  }
}
/** Inicializa o reanuda el audio después de una acción del usuario. */
export async function startSound() {
  try {
    if (!ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      ctx = new Audio();
      master = ctx.createGain();
      musicBus = ctx.createGain();
      fxBus = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -16;
      limiter.ratio.value = 5;
      musicBus.connect(master);
      fxBus.connect(master);
      master.connect(limiter);
      limiter.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * 0.6;
      nextBeat = ctx.currentTime + 0.08;
      timer = setInterval(musicTick, 200);
    }
    started = true;
    sync();
    if (prefs.enabled && !document.hidden) await ctx.resume();
    musicTick();
  } catch {
    started = false;
    $("soundToggle").setAttribute("aria-label", "Audio no disponible");
  }
}
/** Reproduce una señal por batalla/fase, evitando sonidos duplicados al renderizar. */
export function soundCue(turn, phase, h) {
  const key = turn + ":" + phase;
  if (lastCue === key) return;
  lastCue = key;
  if (!ctx || ctx.state !== "running" || !prefs.enabled || !prefs.effects)
    return;
  const t = ctx.currentTime;
  if (phase === 0) {
    noise(t, 0.35, 0.08, 850);
    tone(110, t, 0.45, 0.12, "sine", fxBus);
  } else if (phase <= 3) {
    [0, 0.065, 0.13].forEach((d, i) => {
      noise(t + d, 0.07, 0.1 - i * 0.02, 1800 + i * 700);
      tone(330 + i * 120, t + d, 0.07, 0.055, "triangle", fxBus);
    });
  } else if (phase === 4) {
    tone(440, t, 0.3, 0.07, "sine", fxBus);
    tone(659.25, t + 0.12, 0.45, 0.08, "sine", fxBus);
  } else if (phase === 5) {
    thump(t, h.conquered ? 0.36 : 0.25);
    noise(t, 0.23, 0.1, 900);
    const notes = h.revivedFaction
      ? [523.25, 659.25, 783.99]
      : h.conquered
        ? [329.63, 440, 659.25]
        : [164.81, 146.83];
    notes.forEach((f, i) =>
      tone(f, t + 0.12 + i * 0.12, 0.8, 0.1, "sine", fxBus),
    );
  }
}
/** Conecta volumen, música, efectos y suspensión cuando se oculta la pestaña. */
export function setupSound() {
  sync();
  $("soundToggle").addEventListener("click", async () => {
    if (!started) {
      prefs.enabled = true;
      await startSound();
    } else prefs.enabled = !prefs.enabled;
    save();
    if (prefs.enabled) startSound();
  });
  $("musicEnabled").addEventListener("change", () => {
    prefs.music = $("musicEnabled").checked;
    save();
    startSound();
  });
  $("effectsEnabled").addEventListener("change", () => {
    prefs.effects = $("effectsEnabled").checked;
    save();
    startSound();
  });
  $("audioVolume").addEventListener("input", () => {
    prefs.volume = Number($("audioVolume").value);
    save();
    startSound();
  });
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (started && prefs.enabled) startSound();
  });
}
