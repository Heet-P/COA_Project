/* ──────────────────────────────────────────
   isr-handler.js  — Amber ISR handler box
   Yellow blocks spawn FROM here during ISR
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

const PLAT_Y  = 0.5;
const POS     = new THREE.Vector3(-4, PLAT_Y, 4);
const BOX_W   = 2.8, BOX_H = 2.0, BOX_D = 2.0;

let group, box, isrBlock, blockT, running;
const BLOCK_SPEED = 0.55;   // seconds for full travel

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

  /* Yellow ISR block (hidden until startISR) */
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

/* ── ISR execute animation ── */

export function startISR() {
  running = true;
  blockT  = 0;
  isrBlock.visible = true;
  isrBlock.position.set(0, BOX_H / 2, 0);       // start inside box
  box.material.emissiveIntensity = 0.8;           // glow brighter
}

export function tickIsrHandler(dt) {
  if (!running) return;

  blockT += dt / BLOCK_SPEED;
  if (blockT >= 1) {
    blockT  = 1;
    running = false;
    box.material.emissiveIntensity = 0.35;
  }

  /* Block rises up out of the box then hovers above */
  isrBlock.position.y = BOX_H / 2 + blockT * 1.5;
  isrBlock.rotation.y += dt * 3;
}

export function isISRDone()  { return !running; }

export function hideISRBlock() {
  isrBlock.visible = false;
  running = false;
}

export function getISRHandlerPos() { return POS.clone(); }
