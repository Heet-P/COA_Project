/* ──────────────────────────────────────────
   stage.js  — interrupt stage state-machine

   SEQUENCE (8 stages):
   0 — BASELINE   CPU executing normally, arm picks blue blocks → output belts
   1 — IRQ FIRED  red cube zooms along input belt, blue cubes + arm frozen
   2 — IRQ RECV   CPU acknowledges interrupt (alarm lights, brief pause)
   3 — IVT LOOKUP timed delay while lookup animation plays
   4 — CTX SAVE   arm picks each blue block on belt → swings toward stack,
                   vault catches a ball per block
   5 — ISR EXEC   arm picks up the RED IRQ cube and sends it down an output belt
                   (the VIP lane lights up)
   6 — CTX RESTORE vault pops balls, blue blocks respawn on belt
   7 — IRET       brief pause then back to stage 0
   ────────────────────────────────────────── */

import { pauseConveyor, resumeConveyor,
         getInputBlocks, detachInputBlock, restoreInputBlock }
  from './conveyor.js';
import { pauseArm, resumeArm, commandArm, isCommandDone }
  from './arm.js';
import { setAlarm }
  from './lights.js';
import { fireIrq, tickIrq, clearIrq, isArrived, getIrqCube }
  from './irq.js';
import { pushOneBall, popOneBall, isStackDone,
         resetStack, stackSize }
  from './vault.js';
import { fireVip, clearVip, tickVip }
  from './vip.js';

/* ── State ── */
let stage = 0;
let timer = 0;
let _scene = null;

/* Sub-step tracking for stages that loop over blocks */
let savedCount   = 0;   // how many blue blocks were saved
let subBusy      = false; // true while arm/vault are mid-action
let subStep      = 0;    // tracks sub-steps within a stage

const HUD_STAGE  = document.getElementById('stage-label');
const HUD_DESC   = document.getElementById('stage-desc');

const DESCS = [
  '🟢 BASELINE — CPU executing instructions',
  '🔴 IRQ FIRED — interrupt request in-flight',
  '⚠️  IRQ RECEIVED — CPU acknowledges interrupt',
  '📖 IVT LOOKUP — finding interrupt handler address',
  '💾 CONTEXT SAVE — arm pushes blue blocks to stack',
  '⚡ ISR EXECUTE — arm delivers red IRQ block to output',
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

/* ═══════════════════════════════════════════
   ENTER — called once when transitioning
   ═══════════════════════════════════════════ */
function enter(s) {
  stage = s;
  timer = 0;
  subBusy = false;
  subStep = 0;
  setHud(s);

  switch (s) {

    /* 0 — BASELINE */
    case 0:
      resumeConveyor();
      resumeArm();
      setAlarm(false);
      clearIrq();
      resetStack();
      clearVip();
      break;

    /* 1 — IRQ FIRED */
    case 1:
      pauseConveyor();
      pauseArm();
      fireIrq();
      break;

    /* 2 — IRQ RECEIVED (alarm on) */
    case 2:
      setAlarm(true);
      break;

    /* 3 — IVT LOOKUP (timed delay) */
    case 3:
      break;

    /* 4 — CONTEXT SAVE
       For each blue block on the belt:
         a) arm grabs blue block (commanded)  →  arm swings toward stack
         b) vault launches a ball into the bin
       These alternate in sub-steps */
    case 4:
      savedCount = 0;
      break;

    /* 5 — ISR EXECUTE
       arm grabs the red IRQ cube → sends it down output belt 0 (east / MEMORY)
       VIP path lights up */
    case 5:
      fireVip();
      break;

    /* 6 — CONTEXT RESTORE
       For each saved ball: vault pops → blue block appears on belt */
    case 6:
      clearVip();
      break;

    /* 7 — IRET */
    case 7:
      setAlarm(false);
      break;
  }
}

/* ═══════════════════════════════════════════
   TICK — called every frame
   ═══════════════════════════════════════════ */
export function tickStage(dt) {
  timer += dt;

  switch (stage) {

    /* 1 — Wait for red cube to arrive */
    case 1:
      tickIrq(dt);
      if (isArrived()) enter(2);
      break;

    /* 2 — Alarm pause */
    case 2:
      if (timer > 1.2) enter(3);
      break;

    /* 3 — IVT lookup delay */
    case 3:
      if (timer > 1.5) enter(4);
      break;

    /* 4 — CONTEXT SAVE: iteratively save blue blocks */
    case 4:
      tickContextSave(dt);
      break;

    /* 5 — ISR EXECUTE: arm delivers the red cube */
    case 5:
      tickIsrExecute(dt);
      break;

    /* 6 — CONTEXT RESTORE: pop balls → respawn blues */
    case 6:
      tickContextRestore(dt);
      break;

    /* 7 — IRET pause then reset */
    case 7:
      if (timer > 1.0) enter(0);
      break;
  }
}

/* ─────────────────────────────────────
   Stage 4 — CONTEXT SAVE sub-machine
   ───────────────────────────────────── */
function tickContextSave(dt) {
  if (subBusy) return;  // wait for current action to finish

  const blocks = getInputBlocks();

  /* If no more blue blocks on belt, move to stage 5 */
  if (blocks.length === 0) {
    enter(5);
    return;
  }

  /* Sub-step A: command arm to grab the first available blue block */
  if (subStep === 0) {
    const blk = blocks[0];
    detachInputBlock(blk);  // remove from array + hide, but don't dispose
    subBusy = true;
    commandArm({
      mesh: blk,
      color: 0x00aaff,
      emissive: 0x004488,
      toStack: true,
      onDone: () => {
        /* Arm has swung toward stack and released — now vault catches it */
        subBusy = false;
        subStep = 1;
      }
    });
    return;
  }

  /* Sub-step B: vault pushes a ball into the bin */
  if (subStep === 1) {
    subBusy = true;
    pushOneBall(() => {
      savedCount++;
      subBusy = false;
      subStep = 0;   // loop back for next block
    });
  }
}

/* ─────────────────────────────────────
   Stage 5 — ISR EXECUTE sub-machine
   ───────────────────────────────────── */
function tickIsrExecute(dt) {
  tickVip(dt);

  if (subBusy) return;

  /* Sub-step 0: command arm to grab the red cube and send to east belt */
  if (subStep === 0) {
    const irqCube = getIrqCube();
    subBusy = true;
    commandArm({
      mesh: irqCube,
      color: 0xff2244,
      emissive: 0xff0000,
      destDir: 0,       // east → MEMORY
      toStack: false,
      onDone: () => {
        clearIrq();     // remove the original red cube
        subBusy = false;
        subStep = 1;
      }
    });
    return;
  }

  /* Sub-step 1: wait a beat, then move to context restore */
  if (subStep === 1) {
    if (timer > 2.0) enter(6);
  }
}

/* ─────────────────────────────────────
   Stage 6 — CONTEXT RESTORE sub-machine
   ───────────────────────────────────── */
function tickContextRestore(dt) {
  if (subBusy) return;

  /* Pop balls one at a time; each pop respawns a blue block on the belt */
  if (stackSize() > 0) {
    subBusy = true;
    popOneBall(() => {
      restoreInputBlock();   // put a blue block back on the belt
      subBusy = false;
    });
    return;
  }

  /* All blocks restored — move to IRET */
  enter(7);
}

/* ── Key trigger ── */
export function onIrqKey() {
  if (stage === 0) enter(1);
}
