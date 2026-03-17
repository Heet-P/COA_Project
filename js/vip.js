/* ──────────────────────────────────────────
   vip.js — ISR dashed path from centre
             to the ISR HANDLER box
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

const PLAT_Y = 0.5;

/* Path: from robot-arm centre → ISR handler at (-4, y, 4) */
const START = new THREE.Vector3(0, PLAT_Y + 0.05, 0);
const END   = new THREE.Vector3(-4, PLAT_Y + 0.05, 4);

let dashLine, pathLabel;

export function initVip(scene) {
  /* Yellow dashed line */
  const pts  = [START, END];
  const geo  = new THREE.BufferGeometry().setFromPoints(pts);
  const mat  = new THREE.LineDashedMaterial({
    color: 0xffd700,
    dashSize: 0.4,
    gapSize: 0.2,
    linewidth: 1,
  });
  dashLine = new THREE.Line(geo, mat);
  dashLine.computeLineDistances();
  scene.add(dashLine);
}

export function tickVip() {
  /* Static — nothing to tick */
}

/* Backward-compatible aliases for stage.js */
export function fireVip() {
  if (dashLine) {
    dashLine.material.color.set(0xff4400);
    dashLine.material.opacity = 1;
  }
  if (pathLabel) pathLabel.visible = true;
}

export function clearVip() {
  if (dashLine) {
    dashLine.material.color.set(0xffd700);
    dashLine.material.opacity = 0.6;
  }
}
