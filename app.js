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
  timerReadout: document.querySelector("#timerReadout"),
  pulseMeter: document.querySelector("#pulseMeter"),
  flashScreen: document.querySelector("#flashScreen"),
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
  sessionEndsAt: 0,
  isLightOn: false,
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
  };
}

function setStateList(items) {
  els.stateList.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function updateReadouts() {
  const { frequency, duty, duration } = getSettings();
  els.frequencyReadout.textContent = frequency.toFixed(1);
  els.dutyReadout.textContent = Math.round(duty * 100);
  els.durationReadout.textContent = duration;

  if (!state.running) {
    els.timerReadout.textContent = formatClock(duration);
  }

  els.presetButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.frequency) === frequency);
  });

  const modeLabel = state.mode === "torch" ? "Linterna" : "Pantalla";
  const supportLabel = state.torchSupported ? "torch compatible" : "torch no confirmado";

  if (!state.running) {
    els.supportBadge.textContent = `${modeLabel} · listo`;
    setStateList([
      els.consentInput.checked ? "Riesgo confirmado por el usuario." : "Esperando confirmacion de seguridad.",
      state.mode === "torch" ? `Modo linterna: ${supportLabel}.` : "Modo pantalla activo.",
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

function schedulePulse(phaseOn = true) {
  if (!state.running) return;

  const { frequency, duty } = getSettings();
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
    state.sessionEndsAt = performance.now() + duration * 1000;
    document.body.classList.add("session-running");
    syncStartAvailability();
    els.supportBadge.textContent = state.mode === "torch" ? "Linterna activa" : "Pantalla activa";
    setStateList([
      `Frecuencia activa: ${frequency.toFixed(1)} Hz.`,
      `Duracion maxima: ${duration}s.`,
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

  try {
    await setTorch(false);
  } catch (error) {
    console.warn("Unable to turn off cleanly:", error);
  }

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

els.frequencyInput.addEventListener("input", updateReadouts);
els.dutyInput.addEventListener("input", updateReadouts);
els.durationInput.addEventListener("input", updateReadouts);

els.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.running) return;
    els.frequencyInput.value = button.dataset.frequency;
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
