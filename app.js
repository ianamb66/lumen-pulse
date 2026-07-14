const els = {
  supportBadge: document.querySelector("#supportBadge"),
  consentInput: document.querySelector("#consentInput"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  panicButton: document.querySelector("#panicButton"),
  torchModeButton: document.querySelector("#torchModeButton"),
  screenModeButton: document.querySelector("#screenModeButton"),
  frequencyInput: document.querySelector("#frequencyInput"),
  frequencyReadout: document.querySelector("#frequencyReadout"),
  dutyInput: document.querySelector("#dutyInput"),
  dutyReadout: document.querySelector("#dutyReadout"),
  durationInput: document.querySelector("#durationInput"),
  durationReadout: document.querySelector("#durationReadout"),
  durationButtons: [...document.querySelectorAll(".duration-button")],
  musicOnButton: document.querySelector("#musicOnButton"),
  musicOffButton: document.querySelector("#musicOffButton"),
  volumeInput: document.querySelector("#volumeInput"),
  volumeReadout: document.querySelector("#volumeReadout"),
  modulationInput: document.querySelector("#modulationInput"),
  modulationReadout: document.querySelector("#modulationReadout"),
  timerReadout: document.querySelector("#timerReadout"),
  pulseMeter: document.querySelector("#pulseMeter"),
  flashScreen: document.querySelector("#flashScreen"),
  sessionIntent: document.querySelector("#sessionIntent"),
  stateList: document.querySelector("#stateList"),
  presetButtons: [...document.querySelectorAll(".preset-button")],
};

const state = {
  mode: "torch",
  running: false,
  torchSupported: false,
  stream: null,
  track: null,
  timeoutId: null,
  timerId: null,
  musicTimerId: null,
  sessionEndsAt: 0,
  sessionStartedAt: 0,
  isLightOn: false,
  musicEnabled: true,
  audioContext: null,
  audioNodes: null,
  chordIndex: 0,
};

function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getSettings() {
  return {
    frequency: Number(els.frequencyInput.value),
    duty: Number(els.dutyInput.value) / 100,
    duration: Number(els.durationInput.value),
    modulation: Number(els.modulationInput.value) / 100,
    volume: Number(els.volumeInput.value) / 100,
  };
}

function getElapsedSeconds() {
  if (!state.sessionStartedAt) return 0;
  return Math.max(0, (performance.now() - state.sessionStartedAt) / 1000);
}

function getEffectiveFrequency() {
  const { frequency, modulation } = getSettings();
  if (!state.running || !state.musicEnabled || modulation <= 0) return frequency;

  const elapsed = getElapsedSeconds();
  const phrase = Math.sin((elapsed / 16) * Math.PI * 2);
  const slowBreath = Math.sin((elapsed / 43) * Math.PI * 2 + Math.PI / 4);
  const drift = phrase * 0.72 + slowBreath * 0.28;
  const modulated = frequency * (1 + drift * modulation);
  return Math.min(20, Math.max(0.5, modulated));
}

function setStateList(items) {
  els.stateList.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function updateReadouts() {
  const { frequency, duty, duration, modulation, volume } = getSettings();
  const displayedFrequency = state.running ? getEffectiveFrequency() : frequency;
  els.frequencyReadout.textContent = displayedFrequency.toFixed(1);
  els.dutyReadout.textContent = Math.round(duty * 100);
  els.durationReadout.textContent = duration;
  els.volumeReadout.textContent = Math.round(volume * 100);
  els.modulationReadout.textContent = Math.round(modulation * 100);

  if (!state.running) {
    els.timerReadout.textContent = formatClock(duration);
  }

  els.presetButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.frequency) === frequency);
  });
  els.durationButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.duration) === duration);
  });

  const modeLabel = state.mode === "torch" ? "Linterna" : "Pantalla";
  const supportLabel = state.torchSupported ? "torch compatible" : "torch no confirmado";
  const musicLabel = state.musicEnabled ? "ambient activo" : "silencio";
  els.sessionIntent.textContent = state.musicEnabled
    ? `Frecuencia base ${frequency.toFixed(1)} Hz con variacion musical de ±${Math.round(modulation * 100)}%.`
    : `Frecuencia fija de ${frequency.toFixed(1)} Hz sin musica.`;

  if (!state.running) {
    els.supportBadge.textContent = `${modeLabel} · listo`;
    setStateList([
      els.consentInput.checked ? "Riesgo confirmado por el usuario." : "Esperando confirmacion de seguridad.",
      state.mode === "torch" ? `Modo linterna: ${supportLabel}.` : "Modo pantalla activo.",
      `Audio: ${musicLabel}.`,
      "Temporizador inactivo.",
    ]);
  }
}

function syncStartAvailability() {
  const hasConsent = els.consentInput.checked;
  els.startButton.disabled = !hasConsent || state.running;
  els.stopButton.disabled = !state.running;
  els.panicButton.disabled = !state.running;
}

function setMode(mode) {
  if (state.running) return;
  state.mode = mode;
  els.torchModeButton.classList.toggle("active", mode === "torch");
  els.screenModeButton.classList.toggle("active", mode === "screen");
  els.torchModeButton.setAttribute("aria-checked", String(mode === "torch"));
  els.screenModeButton.setAttribute("aria-checked", String(mode === "screen"));
  updateReadouts();
}

function setMusicEnabled(enabled) {
  if (state.running) return;
  state.musicEnabled = enabled;
  els.musicOnButton.classList.toggle("active", enabled);
  els.musicOffButton.classList.toggle("active", !enabled);
  els.musicOnButton.setAttribute("aria-checked", String(enabled));
  els.musicOffButton.setAttribute("aria-checked", String(!enabled));
  updateReadouts();
}

async function prepareTorch() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este navegador no expone getUserMedia.");
  }

  state.stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  state.track = state.stream.getVideoTracks()[0];
  const capabilities = state.track.getCapabilities?.() ?? {};
  state.torchSupported = Boolean(capabilities.torch);

  if (!state.torchSupported) {
    throw new Error("La camara se abrio, pero este dispositivo no permite controlar la linterna.");
  }

  await setTorch(false);
}

async function setTorch(enabled) {
  state.isLightOn = enabled;
  els.pulseMeter.classList.toggle("is-on", enabled);

  if (state.mode === "screen") {
    els.flashScreen.classList.toggle("is-on", enabled);
    return;
  }

  if (!state.track) return;

  try {
    await state.track.applyConstraints({ advanced: [{ torch: enabled }] });
  } catch (error) {
    console.warn("Torch constraint failed:", error);
    throw new Error("No se pudo cambiar el estado de la linterna.");
  }
}

async function startMusic() {
  if (!state.musicEnabled) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    setStateList(["Este navegador no soporta Web Audio.", "La sesion continuara sin musica.", "Puedes detener cuando quieras."]);
    return;
  }

  const { volume } = getSettings();
  const context = new AudioContext();
  await context.resume();

  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const chordGain = context.createGain();
  const breathGain = context.createGain();
  const breathOsc = context.createOscillator();

  filter.type = "lowpass";
  filter.frequency.value = 1100;
  filter.Q.value = 0.8;
  master.gain.value = Math.max(0.0001, volume * 0.42);
  chordGain.gain.value = 0.16;
  breathGain.gain.value = Math.max(0.0001, volume * 0.12);
  breathOsc.frequency.value = 0.0625;

  breathOsc.connect(breathGain);
  breathGain.connect(master.gain);
  filter.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  const base = 110;
  const ratios = [1, 1.5, 2, 2.5];
  const oscillators = ratios.map((ratio, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.value = base * ratio;
    gain.gain.value = 0.09 / (index + 1);
    osc.connect(gain);
    gain.connect(chordGain);
    osc.start();
    return osc;
  });

  chordGain.connect(filter);
  breathOsc.start();
  state.audioContext = context;
  state.audioNodes = { master, filter, chordGain, breathOsc, oscillators };
  state.chordIndex = 0;

  state.musicTimerId = window.setInterval(() => {
    if (!state.audioContext || !state.audioNodes) return;
    const now = state.audioContext.currentTime;
    const progressions = [
      [1, 1.5, 2, 2.5],
      [1, 1.333, 2, 2.666],
      [0.89, 1.333, 1.778, 2.371],
      [1, 1.25, 1.875, 2.5],
    ];
    state.chordIndex = (state.chordIndex + 1) % progressions.length;
    progressions[state.chordIndex].forEach((ratio, index) => {
      state.audioNodes.oscillators[index].frequency.setTargetAtTime(base * ratio, now, 2.4);
    });
    state.audioNodes.filter.frequency.setTargetAtTime(760 + state.chordIndex * 120, now, 3.2);
  }, 16000);
}

function updateMusicVolume() {
  if (!state.audioContext || !state.audioNodes) return;
  const { volume } = getSettings();
  const now = state.audioContext.currentTime;
  state.audioNodes.master.gain.setTargetAtTime(Math.max(0.0001, volume * 0.42), now, 0.25);
}

async function stopMusic() {
  window.clearInterval(state.musicTimerId);
  state.musicTimerId = null;

  if (!state.audioContext || !state.audioNodes) return;

  const { audioContext, audioNodes } = state;
  const now = audioContext.currentTime;
  audioNodes.master.gain.cancelScheduledValues(now);
  audioNodes.master.gain.setTargetAtTime(0.0001, now, 0.08);

  await new Promise((resolve) => window.setTimeout(resolve, 180));
  audioNodes.oscillators.forEach((osc) => osc.stop());
  audioNodes.breathOsc.stop();
  await audioContext.close();
  state.audioContext = null;
  state.audioNodes = null;
}

function schedulePulse(phaseOn = true) {
  if (!state.running) return;

  const { duty } = getSettings();
  const frequency = getEffectiveFrequency();
  const cycleMs = 1000 / frequency;
  const onMs = Math.max(10, cycleMs * duty);
  const offMs = Math.max(10, cycleMs - onMs);
  const nextDelay = phaseOn ? onMs : offMs;

  setTorch(phaseOn)
    .catch((error) => stopSession(error.message))
    .finally(() => {
      if (!state.running) return;
      state.timeoutId = window.setTimeout(() => schedulePulse(!phaseOn), nextDelay);
    });
}

function updateTimer() {
  if (!state.running) return;

  const remainingMs = state.sessionEndsAt - performance.now();
  els.timerReadout.textContent = formatClock(remainingMs / 1000);
  els.frequencyReadout.textContent = getEffectiveFrequency().toFixed(1);

  if (remainingMs <= 0) {
    stopSession("Sesion completada. La luz se detuvo automaticamente.");
  }
}

async function startSession() {
  if (state.running || !els.consentInput.checked) return;

  const { frequency, duration } = getSettings();
  const highRisk = frequency >= 3;

  if (highRisk) {
    const ok = window.confirm(
      "Esta frecuencia entra en un rango de riesgo para personas fotosensibles. Detente ante cualquier malestar. ¿Quieres continuar?"
    );
    if (!ok) return;
  }

  els.startButton.disabled = true;
  els.supportBadge.textContent = "Preparando...";

  try {
    if (state.mode === "torch") {
      await prepareTorch();
    }

    state.running = true;
    state.sessionStartedAt = performance.now();
    state.sessionEndsAt = performance.now() + duration * 1000;
    await startMusic();
    document.body.classList.add("session-running");
    syncStartAvailability();
    els.supportBadge.textContent = state.mode === "torch" ? "Linterna activa" : "Pantalla activa";
    setStateList([
      `Frecuencia activa: ${frequency.toFixed(1)} Hz.`,
      `Duracion maxima: ${duration}s.`,
      state.musicEnabled ? "Musica ambient modulando la frecuencia." : "Sesion sin musica.",
      "Usa Detener o el boton cuadrado si aparece cualquier molestia.",
    ]);
    schedulePulse(true);
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 250);
  } catch (error) {
    console.warn(error);
    cleanupMedia();
    if (state.mode === "torch") {
      state.mode = "screen";
      setMode("screen");
      els.supportBadge.textContent = "Torch no disponible";
      setStateList([
        error.message,
        "Se cambio a modo pantalla.",
        "Puedes iniciar de nuevo con el fallback visual.",
      ]);
    }
  } finally {
    syncStartAvailability();
  }
}

function cleanupMedia() {
  if (state.track) {
    state.track.stop();
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  state.track = null;
  state.stream = null;
}

async function stopSession(message = "Sesion detenida.") {
  state.running = false;
  window.clearTimeout(state.timeoutId);
  window.clearInterval(state.timerId);
  state.timeoutId = null;
  state.timerId = null;
  state.sessionStartedAt = 0;

  try {
    await setTorch(false);
  } catch (error) {
    console.warn("Unable to turn off cleanly:", error);
  }

  await stopMusic();
  cleanupMedia();
  document.body.classList.remove("session-running");
  els.flashScreen.classList.remove("is-on");
  els.pulseMeter.classList.remove("is-on");
  els.supportBadge.textContent = "Detenido";
  setStateList([message, "Linterna apagada / pantalla inactiva.", "Temporizador reiniciado."]);
  syncStartAvailability();
  updateReadouts();
}

els.consentInput.addEventListener("change", () => {
  syncStartAvailability();
  updateReadouts();
});

els.startButton.addEventListener("click", startSession);
els.stopButton.addEventListener("click", () => stopSession());
els.panicButton.addEventListener("click", () => stopSession("Parada inmediata activada."));

els.torchModeButton.addEventListener("click", () => setMode("torch"));
els.screenModeButton.addEventListener("click", () => setMode("screen"));
els.musicOnButton.addEventListener("click", () => setMusicEnabled(true));
els.musicOffButton.addEventListener("click", () => setMusicEnabled(false));

els.frequencyInput.addEventListener("input", updateReadouts);
els.dutyInput.addEventListener("input", updateReadouts);
els.durationInput.addEventListener("input", updateReadouts);
els.modulationInput.addEventListener("input", updateReadouts);
els.volumeInput.addEventListener("input", () => {
  updateReadouts();
  updateMusicVolume();
});

els.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.running) return;
    els.frequencyInput.value = button.dataset.frequency;
    updateReadouts();
  });
});

els.durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.running) return;
    els.durationInput.value = button.dataset.duration;
    updateReadouts();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running) {
    stopSession("Sesion detenida porque la app paso a segundo plano.");
  }
});

window.addEventListener("beforeunload", () => {
  if (state.running) {
    cleanupMedia();
  }
});

updateReadouts();
syncStartAvailability();
