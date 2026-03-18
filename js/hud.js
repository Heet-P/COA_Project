/* ──────────────────────────────────────────
   hud.js   — DOM HUD updates
   ────────────────────────────────────────── */

import { updateRegisterValue } from './machine.js';

const els = {};

export function initHud() {
  els.stageName  = document.getElementById('stage-name');
  els.stageDesc  = document.getElementById('stage-desc');
  els.stagePanel = document.getElementById('stage-panel');
  els.rPC        = document.getElementById('r-pc');
  els.rSP        = document.getElementById('r-sp');
  els.rIRQ       = document.getElementById('r-irq');
  els.irqPrompt  = document.getElementById('irq-prompt');
  els.progress   = document.getElementById('progress-bar');
  els.hint       = document.getElementById('hint');
}

export function setStage(name, desc, color) {
  els.stageName.textContent = name;
  els.stageDesc.textContent = desc;
  els.stagePanel.style.setProperty('--stage-color', color);
  els.stageName.style.color = color;
}

let _pc      = 0x0041;
let _savedPC = 0x0041;

export function tickPC() {
  _pc++;
  els.rPC.textContent = 'PC    0x' + _pc.toString(16).toUpperCase().padStart(4, '0');
  updateRegisterValue(0, _pc);
}

export function setPC(val) {
  _pc = val;
  els.rPC.textContent = 'PC    0x' + _pc.toString(16).toUpperCase().padStart(4, '0');
  updateRegisterValue(0, _pc);
}

export function savePC() {
  _savedPC = _pc;
}

export function restorePC() {
  _pc = _savedPC;
  els.rPC.textContent = 'PC    0x' + _pc.toString(16).toUpperCase().padStart(4, '0');
  updateRegisterValue(0, _pc);
}

export function setSP(val) {
  els.rSP.textContent = 'SP    0x' + val.toString(16).toUpperCase().padStart(4, '0');
  updateRegisterValue(1, val);
}

export function setIRQ(text, color) {
  els.rIRQ.textContent = 'IRQ   ' + text;
  els.rIRQ.style.color = color || 'rgba(255,255,255,0.22)';
}

export function showIrqPrompt(show) {
  els.irqPrompt.style.display = show ? 'block' : 'none';
}

export function setProgress(pct, color) {
  els.progress.style.width = pct + '%';
  if (color) els.progress.style.background = color;
}

export function fadeHint() {
  setTimeout(() => {
    if (els.hint) els.hint.style.opacity = '0';
  }, 8000);
}

export function getPC() { return _pc; }
export function resetPC() {
  _pc = 0x0041;
  if (els.rPC) els.rPC.textContent = 'PC    0x' + _pc.toString(16).toUpperCase().padStart(4, '0');
  updateRegisterValue(0, _pc);
}
