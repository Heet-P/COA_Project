/* ──────────────────────────────────────────
   stage.js  — interrupt stage state-machine
   ────────────────────────────────────────── */

import { pauseConveyor, resumeConveyor } from './conveyor.js';
import { pauseArm, resumeArm }          from './arm.js';
import { setAlarm }        from './lights.js';
import { fireIrq, tickIrq, clearIrq, isArrived, isActive } from './irq.js';
import { openDoors, closeDoors, showBriefcase } from './vault.js';
import { highlightVector, clearIvt }            from './ivt.js';
import { fireVip, clearVip, tickVip }           from './vip.js';

/*
  Stage 0 — BASELINE (normal operation)
  Stage 1 — IRQ fires, cube flies in
  Stage 2 — IRQ arrives → alarm, conveyor + arm pause
  Stage 3 — IVT lookup (highlight a vector row)
  Stage 4 — Context save (vault opens, briefcase appears)
  Stage 5 — ISR execute (VIP lane active)
  Stage 6 — Context restore (vault closes, briefcase hidden)
  Stage 7 — Return from interrupt → back to stage 0
*/

let stage = 0;
let timer = 0;
let _scene = null;

const HUD_STAGE  = document.getElementById('stage-label');
const HUD_DESC   = document.getElementById('stage-desc');

const DESCS = [
  '🟢 BASELINE — CPU executing instructions',
  '🔴 IRQ FIRED — interrupt request in-flight',
  '⚠️  IRQ RECEIVED — CPU acknowledges interrupt',
  '📖 IVT LOOKUP — finding interrupt handler address',
  '💾 CONTEXT SAVE — pushing registers to stack',
  '⚡ ISR EXECUTE — running interrupt service routine',
  '📂 CONTEXT RESTORE — popping registers from stack',
  '↩️  IRET — returning to interrupted program',
];

export function initStage(scene) {
  _scene = scene;
  setHud(0);
}

function setHud(s) {
  if (HUD_STAGE) HUD_STAGE.textContent = `Stage ${s} / 7`;
  if (HUD_DESC)  HUD_DESC.textContent  = DESCS[s] || '';
}

function enter(s) {
  stage = s;
  timer = 0;
  setHud(s);

  switch (s) {
    case 0:
      resumeConveyor();
      resumeArm();
      setAlarm(false);
      clearIrq();
      clearIvt();
      closeDoors();
      showBriefcase(false);
      clearVip();
      break;
    case 1:
      fireIrq();
      break;
    case 2:
      pauseConveyor();
      pauseArm();
      setAlarm(true);
      break;
    case 3:
      highlightVector(Math.floor(Math.random() * 6));
      break;
    case 4:
      openDoors();
      showBriefcase(true);
      break;
    case 5:
      fireVip();
      break;
    case 6:
      closeDoors();
      showBriefcase(false);
      clearVip();
      break;
    case 7:
      clearIvt();
      break;
  }
}

export function tickStage(dt) {
  timer += dt;

  switch (stage) {
    case 1:
      tickIrq(dt);
      if (isArrived()) enter(2);
      break;
    case 2:
      if (timer > 1.2) enter(3);
      break;
    case 3:
      if (timer > 1.5) enter(4);
      break;
    case 4:
      if (timer > 1.8) enter(5);
      break;
    case 5:
      tickVip(dt);
      if (timer > 2.5) enter(6);
      break;
    case 6:
      if (timer > 1.5) enter(7);
      break;
    case 7:
      if (timer > 1.0) enter(0);
      break;
  }
}

export function onIrqKey() {
  if (stage === 0) enter(1);
}
