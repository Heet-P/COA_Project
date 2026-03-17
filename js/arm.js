/* ──────────────────────────────────────────
   arm.js   — robot arm pick-and-place cycle
   Supports:
     • Autonomous mode (normal flow — grabs blue blocks → output belts)
     • Commanded mode  (stage.js drives during IRQ sequence)
   ────────────────────────────────────────── */

import { getReadyBlock, removeInputBlock, spawnOutputBlock } from './conveyor.js';
import { makeLabel } from './labels.js';

/* ── State enum ── */
const S = { IDLE: 0, GRAB: 1, ROTATE: 2, RELEASE: 3, RETURN: 4 };

/* ── Timing (seconds) ── */
const T_GRAB    = 0.45;
const T_ROTATE  = 0.75;
const T_RELEASE = 0.30;
const T_RETURN  = 0.55;

/* Angles — assumes model's default forward is −Z */
const A_INPUT = Math.PI * 0.5;     // face −X (input belt)
const A_OUT   = [
  -Math.PI * 0.5,   // face +X  (east  → MEMORY)
   0,                // face −Z  (north → I/O PORT)
   Math.PI,          // face +Z  (south → CACHE)
];
const A_STACK = Math.PI * 0.75;     // face diagonal toward stack bin (x+4, z+4)

/* ── Module state ── */
let armScene    = null;
let mixer       = null;
let sceneRef    = null;

let state       = S.IDLE;
let timer       = 0;
let heldBlock   = null;
let targetDir   = 0;

let curAngle    = A_INPUT;
let startAngle  = A_INPUT;
let targetAngle = A_INPUT;

let armPaused   = false;

/* ── Commanded-mode state ── */
let cmdActive     = false;   // true when stage.js is driving the arm
let cmdMesh       = null;    // the mesh to pick up (or null to create one)
let cmdColor      = 0x00aaff;
let cmdEmissive   = 0x004488;
let cmdDestAngle  = 0;
let cmdDestDir    = -1;      // output belt index (-1 means stack / custom)
let cmdToStack    = false;   // if true, block arcs to vault instead of belt
let cmdDone       = false;   // set true when the commanded cycle completes
let cmdDoneCallback = null;  // called on completion

/* ── Init ── */
export function initArm(scene, assets) {
  sceneRef = scene;
  if (!assets.robotArm) return;

  armScene = assets.robotArm.scene;
  armScene.scale.set(1.4, 1.4, 1.4);
  armScene.position.set(0, 0.32, 0);
  armScene.rotation.y = A_INPUT;

  armScene.traverse(c => { if (c.isMesh) c.castShadow = true; });
  scene.add(armScene);



  /* Play embedded animations */
  if (assets.robotArm.animations?.length) {
    mixer = new THREE.AnimationMixer(armScene);
    assets.robotArm.animations.forEach(clip => mixer.clipAction(clip).play());
  }
}

/* ── Tick ── */
export function tickArm(dt) {
  if (mixer) mixer.update(dt);
  if (!armScene) return;
  if (armPaused && !cmdActive) return;

  timer += dt;

  switch (state) {

    /* — IDLE: look for a block at the arm zone — */
    case S.IDLE: {
      if (cmdActive) {
        /* Commanded mode — pick up the commanded block */
        if (cmdMesh) {
          /* Hide the original mesh; arm creates its own visual */
          cmdMesh.visible = false;
        }
        heldBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.5),
          new THREE.MeshStandardMaterial({
            color: cmdColor, emissive: cmdEmissive,
            emissiveIntensity: 0.4, roughness: 0.28, metalness: 0.5
          })
        );
        heldBlock.position.set(0, 1.4, 0.4);
        armScene.add(heldBlock);
        state = S.GRAB;
        timer = 0;
        break;
      }

      const blk = getReadyBlock();
      if (blk) {
        removeInputBlock(blk);

        /* Create held visual block */
        heldBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.5),
          new THREE.MeshStandardMaterial({
            color: 0x00aaff, emissive: 0x004488,
            emissiveIntensity: 0.4, roughness: 0.28, metalness: 0.5
          })
        );
        heldBlock.position.set(0, 1.4, 0.4);
        armScene.add(heldBlock);

        state = S.GRAB;
        timer = 0;
      }
      break;
    }

    /* — GRAB: lift block up — */
    case S.GRAB: {
      if (heldBlock) {
        const t = Math.min(timer / T_GRAB, 1);
        heldBlock.position.y = 1.4 + t * 0.5;
      }
      if (timer >= T_GRAB) {
        if (cmdActive) {
          /* Commanded destination */
          startAngle  = curAngle;
          targetAngle = cmdDestAngle;
        } else {
          targetDir   = Math.floor(Math.random() * 3);
          startAngle  = curAngle;
          targetAngle = A_OUT[targetDir];
        }
        state = S.ROTATE;
        timer = 0;
      }
      break;
    }

    /* — ROTATE: swing arm to output direction — */
    case S.ROTATE: {
      const t = Math.min(timer / T_ROTATE, 1);
      const e = t * t * (3 - 2 * t);           // smoothstep
      let diff = targetAngle - startAngle;
      if (diff >  Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      armScene.rotation.y = startAngle + diff * e;

      if (t >= 1) {
        curAngle = targetAngle;
        armScene.rotation.y = targetAngle;
        state = S.RELEASE;
        timer = 0;
      }
      break;
    }

    /* — RELEASE: drop block onto output belt (or signal stack) — */
    case S.RELEASE: {
      if (timer >= T_RELEASE) {
        if (heldBlock) {
          armScene.remove(heldBlock);
          heldBlock.geometry.dispose();
          heldBlock.material.dispose();
          heldBlock = null;
        }

        if (cmdActive) {
          /* Commanded release */
          if (!cmdToStack && cmdDestDir >= 0) {
            spawnOutputBlock(cmdDestDir);
          }
          /* If cmdToStack, stage.js handles the vault push */
        } else {
          spawnOutputBlock(targetDir);
        }

        startAngle  = curAngle;
        targetAngle = A_INPUT;
        state = S.RETURN;
        timer = 0;
      }
      break;
    }

    /* — RETURN: swing back to face input — */
    case S.RETURN: {
      const t = Math.min(timer / T_RETURN, 1);
      const e = t * t * (3 - 2 * t);
      let diff = targetAngle - startAngle;
      if (diff >  Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      armScene.rotation.y = startAngle + diff * e;

      if (t >= 1) {
        curAngle = A_INPUT;
        armScene.rotation.y = A_INPUT;
        state = S.IDLE;
        timer = 0;

        if (cmdActive) {
          cmdActive = false;
          cmdDone = true;
          if (cmdDoneCallback) cmdDoneCallback();
          cmdDoneCallback = null;
        }
      }
      break;
    }
  }
}

/* ── Pause / Resume (used by stage.js during interrupts) ── */
export function pauseArm()  { armPaused = true; }
export function resumeArm() { armPaused = false; state = S.IDLE; timer = 0; }

/* ═══════════════════════════════════════════
   COMMANDED ARM API — used by stage.js
   ═══════════════════════════════════════════ */

/**
 * Command the arm to pick up a block and deliver it to a destination.
 * @param {object} opts
 *   mesh      — existing mesh to "grab" (will be hidden); null to skip
 *   color     — held block color
 *   emissive  — held block emissive
 *   destDir   — output belt index (0-2), or -1 for stack direction
 *   toStack   — if true, arm swings toward stack; vault.js handles the ball
 *   onDone    — callback when the full cycle completes
 */
export function commandArm(opts) {
  cmdActive   = true;
  cmdDone     = false;
  cmdMesh     = opts.mesh || null;
  cmdColor    = opts.color    || 0x00aaff;
  cmdEmissive = opts.emissive || 0x004488;
  cmdToStack  = opts.toStack  || false;
  cmdDestDir  = opts.destDir  != null ? opts.destDir : -1;
  cmdDestAngle = cmdToStack ? A_STACK : (cmdDestDir >= 0 ? A_OUT[cmdDestDir] : A_STACK);
  cmdDoneCallback = opts.onDone || null;

  /* Kick it into IDLE so it starts immediately */
  state = S.IDLE;
  timer = 0;
}

export function isCommandDone() { return cmdDone; }
export function isArmBusy()     { return state !== S.IDLE || cmdActive; }
