/* ──────────────────────────────────────────
   isr-handler.js  — Amber ISR handler box
   Yellow blocks spawn FROM here during ISR
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

const PLAT_Y  = 0.5;
const POS     = new THREE.Vector3(-4, PLAT_Y, 4);
const BOX_W   = 2.8, BOX_H = 2.0, BOX_D = 2.0;

let group, box, isrBlock, blockT, running;
let isrBlockCount  = 0;    // how many yellow blocks to spawn
let spawnTimer     = 0;
let spawnedSoFar   = 0;
const BLOCK_SPEED  = 0.55;
const SPAWN_INTERVAL = 0.6;  // seconds between spawns
const ISR_TOTAL_BLOCKS = 3;  // total yellow blocks to push during ISR

/* callback to push ISR blocks onto belts */
let onSpawnBlock = null;

/* ── build ── */
export function initIsrHandler(scene) {
  group = new THREE.Group();
  group.position.copy(POS);

  /* Amber/gold glowing box */
  const geo = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D);
  const mat = new THREE.MeshStandardMaterial({
    color:     0xffaa00,
    emissive:  0xff8800,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.45,
    roughness: 0.4,
    metalness: 0.2,
  });
  box = new THREE.Mesh(geo, mat);
  box.position.y = BOX_H / 2;
  group.add(box);

  /* Wireframe edges */
  const edges = new THREE.EdgesGeometry(geo);
  const line  = new THREE.LineSegments(edges,
    new THREE.LineBasicMaterial({ color: 0xffcc33, linewidth: 2 }));
  line.position.copy(box.position);
  group.add(line);

  /* Floating label */
  const lbl = makeLabel('ISR HANDLER', {
    color: '#ffcc33', bgColor: '#1a1000', bgAlpha: 0.6, fontSize: 28, scale: 1.2
  });
  lbl.position.set(0, BOX_H + 0.6, 0);
  group.add(lbl);

  /* Yellow ISR block (preview / animation inside box) */
  const bGeo = new THREE.BoxGeometry(0.6, 0.35, 0.6);
  const bMat = new THREE.MeshStandardMaterial({
    color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.5
  });
  isrBlock = new THREE.Mesh(bGeo, bMat);
  isrBlock.visible = false;
  isrBlock.position.y = BOX_H / 2;
  group.add(isrBlock);

  running  = false;
  blockT   = 0;

  scene.add(group);
}

/* ── Register callback so ISR can spawn yellow blocks on belts ── */
export function setISRSpawnCallback(cb) {
  onSpawnBlock = cb;
}

/* ── ISR execute animation ── */
export function startISR() {
  running = true;
  blockT  = 0;
  spawnTimer   = 0;
  spawnedSoFar = 0;
  isrBlock.visible = true;
  isrBlock.position.set(0, BOX_H / 2, 0);
  box.material.emissiveIntensity = 0.8;
}

export function tickIsrHandler(dt) {
  if (!running) return;

  blockT += dt / BLOCK_SPEED;

  /* Block pulses inside the box */
  isrBlock.position.y = BOX_H / 2 + Math.sin(blockT * Math.PI * 2) * 0.4;
  isrBlock.rotation.y += dt * 3;
  box.material.emissiveIntensity = 0.6 + Math.sin(blockT * 5) * 0.3;

  /* Periodically spawn yellow blocks on output belts */
  spawnTimer += dt;
  if (spawnedSoFar < ISR_TOTAL_BLOCKS && spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnedSoFar++;
    if (onSpawnBlock) {
      /* Alternate between output directions (East=0, North=1) */
      onSpawnBlock(spawnedSoFar % 2 === 0 ? 0 : 1);
    }
  }

  /* ISR finishes after all blocks spawned + extra settle time */
  if (spawnedSoFar >= ISR_TOTAL_BLOCKS && spawnTimer > 0.8) {
    running = false;
    box.material.emissiveIntensity = 0.35;
  }
}

export function isISRDone()  { return !running; }

export function hideISRBlock() {
  isrBlock.visible = false;
  running = false;
}

export function getISRHandlerPos() { return POS.clone(); }
