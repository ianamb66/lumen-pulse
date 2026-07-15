const els = {
  supportBadge: document.querySelector("#supportBadge"),
  consentInput: document.querySelector("#consentInput"),
  ageInput: document.querySelector("#ageInput"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  panicButton: document.querySelector("#panicButton"),
  torchModeButton: document.querySelector("#torchModeButton"),
  screenModeButton: document.querySelector("#screenModeButton"),
  frequencyInput: document.querySelector("#frequencyInput"),
  frequencyReadout: document.querySelector("#frequencyReadout"),
  patternDescription: document.querySelector("#patternDescription"),
  patternButtons: [...document.querySelectorAll(".pattern-button")],
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
  neuralCanvas: document.querySelector("#neuralCanvas"),
  sessionIntent: document.querySelector("#sessionIntent"),
  trackDescription: document.querySelector("#trackDescription"),
  stateList: document.querySelector("#stateList"),
  presetButtons: [...document.querySelectorAll(".preset-button")],
  trackButtons: [...document.querySelectorAll(".track-button")],
};

const meditationTracks = {
  calm: {
    label: "Calma",
    description: "Pista amplia para bajar revoluciones, con cambios lentos y luz respirando suave.",
    sourceTitle: "Wonder",
    sourceDuration: "10:00",
    audioSrc: "./assets/audio/calm-wonder.mp3",
    phraseSeconds: 24,
    driftSeconds: 64,
    driftMix: 0.55,
  },
  focus: {
    label: "Enfoque",
    description: "Pista mas limpia y estable para concentracion, con pulso musical discreto.",
    sourceTitle: "Bright Ambient",
    sourceDuration: "8:57",
    audioSrc: "./assets/audio/focus-bright-ambient.mp3",
    phraseSeconds: 12,
    driftSeconds: 36,
    driftMix: 0.78,
  },
  breath: {
    label: "Respirar",
    description: "Oleaje profundo para sesiones corporales, con respiracion lenta al frente.",
    sourceTitle: "Nature Ambience",
    sourceDuration: "9:41",
    audioSrc: "./assets/audio/breath-nature-ambience.mp3",
    phraseSeconds: 32,
    driftSeconds: 80,
    driftMix: 0.42,
  },
  trance: {
    label: "Trance suave",
    description: "Armonicos flotantes y cambios mas hipnoticos, sin volverse agresiva.",
    sourceTitle: "Frozen in Time",
    sourceDuration: "9:32",
    audioSrc: "./assets/audio/trance-frozen-in-time.mp3",
    phraseSeconds: 18,
    driftSeconds: 52,
    driftMix: 0.68,
  },
};

const flickerPatterns = {
  rhythmic: {
    label: "Ritmico",
    description:
      "El patron ritmico mantiene la frecuencia con poca desviacion; los estudios lo asocian con efectos visuales mas fuertes.",
  },
  wave: {
    label: "Oleaje",
    description: "El oleaje agrega una respiracion lenta sobre el pulso para que la sesion se sienta menos mecanica.",
  },
  arrhythmic: {
    label: "Arritmico",
    description:
      "El patron arritmico conserva la frecuencia promedio, pero rompe la regularidad y suele reducir la intensidad subjetiva.",
  },
};

const state = {
  mode: "torch",
  running: false,
  torchSupported: false,
  stream: null,
  track: null,
  timeoutId: null,
  timerId: null,
  sessionEndsAt: 0,
  sessionStartedAt: 0,
  isLightOn: false,
  musicEnabled: true,
  audioElement: null,
  meditationTrack: "calm",
  flickerPattern: "rhythmic",
  pulseCount: 0,
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

function getCurrentTrack() {
  return meditationTracks[state.meditationTrack] ?? meditationTracks.calm;
}

function getCurrentPattern() {
  return flickerPatterns[state.flickerPattern] ?? flickerPatterns.rhythmic;
}

function getTrackDrift(elapsed) {
  const track = getCurrentTrack();
  const phrase = Math.sin((elapsed / track.phraseSeconds) * Math.PI * 2);
  const slowBreath = Math.sin((elapsed / track.driftSeconds) * Math.PI * 2 + Math.PI / 4);
  return phrase * track.driftMix + slowBreath * (1 - track.driftMix);
}

function getEffectiveFrequency() {
  const { frequency, modulation } = getSettings();
  if (!state.running || !state.musicEnabled || modulation <= 0) return frequency;

  const elapsed = getElapsedSeconds();
  const drift = getTrackDrift(elapsed);
  const modulated = frequency * (1 + drift * modulation);
  return Math.min(18, Math.max(3, modulated));
}

function getPatternCycleFactor() {
  const elapsed = getElapsedSeconds();

  if (state.flickerPattern === "wave") {
    return 1 + Math.sin(elapsed * Math.PI * 0.18) * 0.08;
  }

  if (state.flickerPattern === "arrhythmic") {
    const pseudoRandom = Math.sin((state.pulseCount + 1) * 12.9898) * 43758.5453;
    const fraction = pseudoRandom - Math.floor(pseudoRandom);
    return 0.86 + fraction * 0.28;
  }

  return 1;
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
  const currentTrack = getCurrentTrack();
  const currentPattern = getCurrentPattern();
  els.sessionIntent.textContent = state.musicEnabled
    ? `${currentTrack.label}: ${frequency.toFixed(1)} Hz base, patron ${currentPattern.label.toLowerCase()}, variacion de ±${Math.round(modulation * 100)}%.`
    : `${frequency.toFixed(1)} Hz, patron ${currentPattern.label.toLowerCase()}, sin musica.`;
  els.trackDescription.textContent = `${currentTrack.description} MP3: ${currentTrack.sourceTitle}, ${currentTrack.sourceDuration}.`;
  els.patternDescription.textContent = currentPattern.description;
  els.patternButtons.forEach((button) => {
    const isActive = button.dataset.pattern === state.flickerPattern;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
  els.trackButtons.forEach((button) => {
    const isActive = button.dataset.track === state.meditationTrack;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });

  if (!state.running) {
    els.supportBadge.textContent = `${modeLabel} · listo`;
    setStateList([
      els.consentInput.checked ? "Riesgo confirmado por el usuario." : "Esperando confirmacion de seguridad.",
      els.ageInput.checked ? "Mayor de edad confirmado." : "Esperando confirmacion de mayoria de edad.",
      state.mode === "torch" ? `Modo linterna: ${supportLabel}.` : "Modo pantalla activo.",
      `Audio: ${musicLabel}.`,
      "Temporizador inactivo.",
    ]);
  }
}

function syncStartAvailability() {
  const hasConsent = els.consentInput.checked && els.ageInput.checked;
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

function setMeditationTrack(track) {
  if (state.running || !meditationTracks[track]) return;
  state.meditationTrack = track;
  updateReadouts();
}

function setFlickerPattern(pattern) {
  if (state.running || !flickerPatterns[pattern]) return;
  state.flickerPattern = pattern;
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
  const { volume } = getSettings();
  const track = getCurrentTrack();
  const audio = new Audio(track.audioSrc);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = Math.min(0.7, Math.max(0, volume));
  state.audioElement = audio;

  try {
    await audio.play();
  } catch (error) {
    console.warn("Audio playback failed:", error);
    state.audioElement = null;
    setStateList(["El navegador bloqueo el audio.", "La sesion continuara con luz solamente.", "Puedes detener cuando quieras."]);
  }
}

function updateMusicVolume() {
  if (!state.audioElement) return;
  const { volume } = getSettings();
  state.audioElement.volume = Math.min(0.7, Math.max(0, volume));
}

async function stopMusic() {
  if (!state.audioElement) return;
  state.audioElement.pause();
  state.audioElement.removeAttribute("src");
  state.audioElement.load();
  state.audioElement = null;
}

function schedulePulse(phaseOn = true) {
  if (!state.running) return;

  const { duty } = getSettings();
  const frequency = getEffectiveFrequency();
  const cycleMs = (1000 / frequency) * getPatternCycleFactor();
  const onMs = Math.max(10, cycleMs * duty);
  const offMs = Math.max(10, cycleMs - onMs);
  const nextDelay = phaseOn ? onMs : offMs;

  setTorch(phaseOn)
    .catch((error) => stopSession(error.message))
    .finally(() => {
      if (!state.running) return;
      if (!phaseOn) state.pulseCount += 1;
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
  if (state.running || !els.consentInput.checked || !els.ageInput.checked) return;

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
    state.pulseCount = 0;
    state.sessionStartedAt = performance.now();
    state.sessionEndsAt = performance.now() + duration * 1000;
    await startMusic();
    document.body.classList.add("session-running");
    syncStartAvailability();
    els.supportBadge.textContent = state.mode === "torch" ? "Linterna activa" : "Pantalla activa";
    setStateList([
      `Frecuencia activa: ${frequency.toFixed(1)} Hz.`,
      `Patron: ${getCurrentPattern().label}.`,
      `Duracion maxima: ${duration}s.`,
      state.musicEnabled ? `Pista activa: ${getCurrentTrack().label}.` : "Sesion sin musica.",
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
  state.pulseCount = 0;

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

els.ageInput.addEventListener("change", () => {
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
els.patternButtons.forEach((button) => {
  button.addEventListener("click", () => setFlickerPattern(button.dataset.pattern));
});
els.trackButtons.forEach((button) => {
  button.addEventListener("click", () => setMeditationTrack(button.dataset.track));
});

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

function initNeuralField() {
  const canvas = els.neuralCanvas;
  const context = canvas?.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!canvas || !context || reduceMotion.matches) return;

  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let particles = [];
  let animationId = null;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.min(92, Math.max(34, Math.floor((width * height) / 19000)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: (index * 89) % width,
      y: (index * 144) % height,
      vx: (Math.sin(index * 17) * 0.32) + 0.06,
      vy: (Math.cos(index * 23) * 0.28) - 0.02,
      r: 1.4 + ((index * 7) % 15) / 10,
      phase: index * 0.37,
    }));
  }

  function draw(time = 0) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(5, 7, 13, 0.34)";
    context.fillRect(0, 0, width, height);

    particles.forEach((particle) => {
      const drift = Math.sin(time * 0.00035 + particle.phase) * 0.12;
      particle.x += particle.vx + drift;
      particle.y += particle.vy + Math.cos(time * 0.0003 + particle.phase) * 0.08;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
    });

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 118) {
          const alpha = (1 - distance / 118) * 0.28;
          context.strokeStyle = `rgba(142, 232, 255, ${alpha})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }

    if (pointer.active) {
      particles.forEach((particle) => {
        const distance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
        if (distance < 180) {
          context.strokeStyle = `rgba(184, 167, 255, ${(1 - distance / 180) * 0.34})`;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      });
    }

    particles.forEach((particle) => {
      context.fillStyle = "rgba(239, 247, 255, 0.68)";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fill();
    });

    animationId = window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches && animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
      context.clearRect(0, 0, width, height);
    } else if (!reduceMotion.matches && !animationId) {
      resize();
      draw();
    }
  });

  resize();
  draw();
}

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
initNeuralField();
