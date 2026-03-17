/* ──────────────────────────────────────────
   arm.js   — robot arm pick-and-place cycle
   ────────────────────────────────────────── */

import { getReadyBlock, removeInputBlock, spawnOutputBlock } from './conveyor.js';

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
  if (armPaused) return;

  timer += dt;

  switch (state) {

    /* — IDLE: look for a block at the arm zone — */
    case S.IDLE: {
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
        targetDir   = Math.floor(Math.random() * 3);
        startAngle  = curAngle;
        targetAngle = A_OUT[targetDir];
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

    /* — RELEASE: drop block onto output belt — */
    case S.RELEASE: {
      if (timer >= T_RELEASE) {
        if (heldBlock) {
          armScene.remove(heldBlock);
          heldBlock.geometry.dispose();
          heldBlock.material.dispose();
          heldBlock = null;
        }
        spawnOutputBlock(targetDir);

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
      }
      break;
    }
  }
}

/* ── Pause / Resume (used by stage.js during interrupts) ── */
export function pauseArm()  { armPaused = true; }
export function resumeArm() { armPaused = false; }
