/* ──────────────────────────────────────────
   stage.js  — interrupt stage state-machine

   SEQUENCE (8 stages):
   0 — BASELINE   CPU executing normally, arm picks blue blocks → output belts
   1 — IRQ FIRED  red cube zooms along DIAGONAL (45°) path, blue cubes + arm frozen
   2 — IRQ RECV   CPU acknowledges interrupt (alarm lights, brief pause)
   3 — IVT LOOKUP timed delay while lookup animation plays
   4 — CTX SAVE   arm picks each blue block on belt → swings toward stack,
                   vault catches a ball per block; HUD saves PC
   5 — ISR EXEC   ISR handler spawns YELLOW blocks on output belts;
                   VIP lane lights up; HUD shows ISR PC address
   6 — CTX RESTORE vault pops balls, blue blocks respawn on belt at saved positions;
                   HUD restores original PC
   7 — IRET       brief pause then back to stage 0
   ────────────────────────────────────────── */

import { pauseConveyor, resumeConveyor,
         getInputBlocks, detachInputBlock, restoreInputBlock,
         saveBlockPositions, restoreBlockPositions,
         spawnISROutputBlock, tickISRBlocks, clearISRBlocks, hasISRBlocks }
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
import { fireVip, clearVip }
  from './vip.js';

/* ── HUD imports ── */
import { setStage, tickPC, setSP, setIRQ,
         showIrqPrompt, setProgress, resetPC,
         savePC, restorePC, setPC }
  from './hud.js';

/* ── Audio imports ── */
import { playTick, playIrqSend, playAlarmLoop,
         playDoorOpen, playIvtBlink, playResume }
  from './audio.js';

/* ── IVT imports ── */
import { highlightVector, clearIvt }
  from './ivt.js';

/* ── ISR Handler imports ── */
import { startISR, isISRDone, hideISRBlock,
         setISRSpawnCallback }
  from './isr-handler.js';

/* ── State ── */
let stage = 0;
let timer = 0;
let _scene = null;

/* Sub-step tracking for stages that loop over blocks */
let savedCount   = 0;   // how many blue blocks were saved
let subBusy      = false; // true while arm/vault are mid-action
let subStep      = 0;    // tracks sub-steps within a stage
let pcTimer      = 0;    // timer for PC ticks in baseline

/* SP register simulation */
let spVal = 0x1FF0;

/* Stage metadata: name, description, HUD color */
const STAGES = [
  { name: 'BASELINE EXECUTION',   desc: 'CPU fetches and executes standard instructions. Watch the Program Counter tick.', color: '#00ff88' },
  { name: 'IRQ FIRED',            desc: 'External device sent an interrupt request. Red signal in-flight on the diagonal IRQ path.', color: '#ff2244' },
  { name: 'IRQ RECEIVED',         desc: 'CPU acknowledges the interrupt. Current instruction completes, then handoff begins.', color: '#ffaa00' },
  { name: 'IVT LOOKUP',           desc: 'CPU reads the Interrupt Vector Table to find the handler address for this IRQ.', color: '#44aaff' },
  { name: 'CONTEXT SAVE',         desc: 'Pushing registers + PC onto the stack to preserve state before running the handler.', color: '#aa66ff' },
  { name: 'ISR EXECUTE',          desc: 'Running the Interrupt Service Routine. Yellow blocks represent ISR instructions being processed.', color: '#ff6600' },
  { name: 'CONTEXT RESTORE',      desc: 'Popping saved registers from the stack to restore the interrupted program state.', color: '#66ffaa' },
  { name: 'IRET',                 desc: 'Return from interrupt. Restoring Program Counter and resuming normal execution.', color: '#00ddff' },
];

export function initStage(scene) {
  _scene = scene;

  /* Wire ISR handler to spawn yellow blocks on belts */
  setISRSpawnCallback((dirIdx) => {
    spawnISROutputBlock(dirIdx);
  });

  enter(0);
}

/* ═══════════════════════════════════════════
   ENTER — called once when transitioning
   ═══════════════════════════════════════════ */
function enter(s) {
  stage = s;
  timer = 0;
  subBusy = false;
  subStep = 0;
  pcTimer = 0;

  /* Update HUD stage panel */
  const meta = STAGES[s];
  setStage(meta.name, meta.desc, meta.color);

  switch (s) {

    /* 0 — BASELINE */
    case 0:
      resumeConveyor();
      resumeArm();
      setAlarm(false);
      clearIrq();
      resetStack();
      clearVip();
      clearIvt();
      hideISRBlock();
      clearISRBlocks();
      spVal = 0x1FF0;
      setSP(spVal);
      setIRQ('IDLE');
      showIrqPrompt(true);
      setProgress(0);
      resetPC();
      playResume();
      break;

    /* 1 — IRQ FIRED */
    case 1:
      pauseConveyor();
      pauseArm();
      fireIrq();
      setIRQ('PENDING', '#ff2244');
      showIrqPrompt(false);
      setProgress(0, '#ff2244');
      playIrqSend();
      break;

    /* 2 — IRQ RECEIVED (alarm on) */
    case 2:
      setAlarm(true);
      setIRQ('ACKNOWLEDGED', '#ffaa00');
      setProgress(15, '#ffaa00');
      playAlarmLoop();
      break;

    /* 3 — IVT LOOKUP (timed delay) */
    case 3:
      highlightVector(0);    // highlight IRQ0 — Timer row
      setProgress(25, '#44aaff');
      playIvtBlink();
      break;

    /* 4 — CONTEXT SAVE
       Save blue block positions, then for each blue block:
         a) arm grabs blue block (commanded) → arm swings toward stack
         b) vault launches a ball into the bin
       HUD savePC preserves original PC value */
    case 4:
      savedCount = 0;
      saveBlockPositions();   // remember where blue blocks were
      savePC();               // HUD: push PC onto stack display
      setIRQ('SAVING CTX', '#aa66ff');
      setProgress(35, '#aa66ff');
      playDoorOpen();
      break;

    /* 5 — ISR EXECUTE
       ISR handler spawns yellow blocks on output belts;
       VIP path lights up; HUD shows ISR vector address */
    case 5:
      fireVip();
      startISR();            // isr-handler starts spawning yellow blocks
      setPC(0x0040);         // ISR handler address in HUD
      setIRQ('SERVICING', '#ff6600');
      setProgress(60, '#ff6600');
      break;

    /* 6 — CONTEXT RESTORE
       For each saved ball: vault pops → restore blue block positions */
    case 6:
      clearVip();
      clearIvt();
      hideISRBlock();
      setIRQ('RESTORING', '#66ffaa');
      setProgress(80, '#66ffaa');
      break;

    /* 7 — IRET */
    case 7:
      setAlarm(false);
      restorePC();   // HUD: restore original PC value
      setIRQ('IDLE');
      setProgress(100, '#00ddff');
      playResume();
      break;
  }
}

/* ═══════════════════════════════════════════
   TICK — called every frame
   ═══════════════════════════════════════════ */
export function tickStage(dt) {
  timer += dt;

  /* Always tick ISR yellow blocks (they slide even between stages) */
  tickISRBlocks(dt);

  switch (stage) {

    /* 0 — Baseline: tick the PC register every ~0.5s */
    case 0:
      pcTimer += dt;
      if (pcTimer > 0.5) {
        pcTimer -= 0.5;
        tickPC();
        playTick();
      }
      break;

    /* 1 — Wait for red cube to arrive along diagonal */
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

    /* 5 — ISR EXECUTE: ISR handler spawns yellow blocks */
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

      /* Update SP register (push = decrement) */
      spVal -= 4;
      setSP(spVal);

      /* Update progress bar */
      const pct = 35 + (savedCount / Math.max(savedCount + blocks.length, 1)) * 25;
      setProgress(Math.min(pct, 59), '#aa66ff');
    });
  }
}

/* ─────────────────────────────────────
   Stage 5 — ISR EXECUTE sub-machine
   ───────────────────────────────────── */
function tickIsrExecute(dt) {
  /* NOTE: tickIsrHandler is called from main.js render loop each frame */

  /* ISR handler is done when it's finished spawning + settle time */
  if (isISRDone() && !hasISRBlocks()) {
    /* All yellow blocks have left the scene → move to restore */
    enter(6);
    return;
  }

  /* While ISR is active, tick the ISR PC counter in HUD */
  pcTimer += dt;
  if (pcTimer > 0.4) {
    pcTimer -= 0.4;
    tickPC();   // PC ticks during ISR execution too
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

      /* Update SP register (pop = increment) */
      spVal += 4;
      setSP(spVal);

      /* Update progress bar */
      const remaining = stackSize();
      const pct = 80 + ((savedCount - remaining) / Math.max(savedCount, 1)) * 15;
      setProgress(Math.min(pct, 95), '#66ffaa');
    });
    return;
  }

  /* All blocks restored — restore their positions and move to IRET */
  restoreBlockPositions();
  enter(7);
}

/* ── Key trigger ── */
export function onIrqKey() {
  if (stage === 0) enter(1);
}
