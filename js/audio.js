/* ──────────────────────────────────────────
   audio.js   — Web Audio API sound events
   ────────────────────────────────────────── */

let ctx;
let masterGain;

export function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(ctx.destination);
}

function ensureCtx() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

/* ── Individual sound functions ── */

export function playTick() {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.1);
}

export function playIrqSend() {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
}

export function playAlarmLoop() {
  ensureCtx();
  // oscillating alarm siren — 2 tones
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(520, ctx.currentTime + 0.12);
  osc.frequency.setValueAtTime(440, ctx.currentTime + 0.24);
  osc.frequency.setValueAtTime(520, ctx.currentTime + 0.36);
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.55);
}

export function playDoorOpen() {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4);
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.55);
}

export function playIvtBlink() {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.15);
}

export function playResume() {
  ensureCtx();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(g).connect(masterGain);
  osc.start(); osc.stop(ctx.currentTime + 0.4);
}
