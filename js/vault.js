/* ──────────────────────────────────────────
   vault.js  — Pink transparent Stack Box
   PUSH: balls arc into the box
   POP:  balls arc back out
   ────────────────────────────────────────── */

import { makeLabel, makeArrowLabel } from './labels.js';

const PLAT_Y   = 0.5;
const POS      = new THREE.Vector3(4, PLAT_Y, 4);
const BOX_W    = 2.2, BOX_H = 8.0, BOX_D = 2.2;
const WALL     = 0.08;
const ARC_DUR  = 0.7;        // seconds per push / pop arc

let group, stack, animating, animDir, animT, animBall;
// stack = array of sphere meshes currently in the bin

/* ── build ── */

export function initVault(scene) {
  group = new THREE.Group();
  group.position.copy(POS);
  stack = [];
  animating = false;

  const wallMat = new THREE.MeshPhysicalMaterial({
    color: 0xff88aa,
    transparent: true,
    opacity: 0.35,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  /* Floor */
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(BOX_W, WALL, BOX_D), wallMat.clone());
  floor.material.opacity = 0.5;
  floor.position.y = WALL / 2;
  group.add(floor);

  /* 4 walls (open top) */
  const wallGeo = new THREE.BoxGeometry(BOX_W, BOX_H, WALL);
  const sides = [
    { pos: [0, BOX_H / 2, -BOX_D / 2], rot: [0, 0, 0] },           // back
    { pos: [0, BOX_H / 2,  BOX_D / 2], rot: [0, 0, 0] },           // front
    { pos: [-BOX_W / 2, BOX_H / 2, 0], rot: [0, Math.PI / 2, 0] }, // left
    { pos: [ BOX_W / 2, BOX_H / 2, 0], rot: [0, Math.PI / 2, 0] }, // right
  ];
  for (const s of sides) {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(...s.pos);
    w.rotation.set(...s.rot);
    group.add(w);
  }

  /* Wireframe edges */
  const edgeBox = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D);
  const edges   = new THREE.EdgesGeometry(edgeBox);
  const eLine   = new THREE.LineSegments(edges,
    new THREE.LineBasicMaterial({ color: 0xff6699 }));
  eLine.position.y = BOX_H / 2;
  group.add(eLine);

  /* Floating label: STACK */
  const lbl = makeLabel('STACK', {
    color: '#ff99bb', bgColor: '#1a0010', bgAlpha: 0.35, fontSize: 28, scale: 1.2
  });
  lbl.position.set(0, BOX_H + 0.6, 0);
  group.add(lbl);

  scene.add(group);
}

/* ── push (context save) ── */

export function pushToStack() {
  const ballGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff, emissive: 0x004488, emissiveIntensity: 0.4
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);

  /* start above the box, arc down into it */
  const ySlot = WALL + 0.25 + stack.length * 0.55;
  ball.userData.slotY = ySlot;
  ball.position.set(0, BOX_H + 2, 0);     // start high
  group.add(ball);

  animBall = ball;
  animDir  = 'push';
  animT    = 0;
  animating = true;
  stack.push(ball);
}

/* ── pop (context restore) ── */

export function popFromStack() {
  if (stack.length === 0) { animating = false; return; }
  animBall  = stack.pop();
  animDir   = 'pop';
  animT     = 0;
  animating = true;
}

/* ── tick ── */

export function tickVault(dt) {
  if (!animating || !animBall) return;

  animT += dt / ARC_DUR;
  if (animT > 1) animT = 1;

  if (animDir === 'push') {
    /* Arc from above → slot inside bin */
    const startY = BOX_H + 2;
    const endY   = animBall.userData.slotY;
    const midY   = Math.max(startY, endY) + 1.2;
    const t = animT;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
    animBall.position.y = y;
    animBall.position.x = (1 - t) * -1.5;
    animBall.rotation.set(0, 0, 0); // Keep cube flat
  } else {
    /* Arc from slot → up and out */
    const startY = animBall.userData.slotY;
    const endY   = BOX_H + 3;
    const midY   = Math.max(startY, endY) + 1.2;
    const t = animT;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
    animBall.position.y = y;
    animBall.position.x = t * 1.5;
    animBall.rotation.set(0, 0, 0);

    if (animT >= 1) {
      group.remove(animBall);
      animBall.geometry.dispose();
      animBall.material.dispose();
    }
  }

  if (animT >= 1) animating = false;
}

export function isStackDone() { return !animating; }

/* ── Backward-compatible aliases for stage.js ── */

export function pushOneBall(cb) {
  pushToStack();
  // Wait for animation to finish, then call back
  const check = () => {
    if (!animating) { if (cb) cb(); return; }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

export function popOneBall(cb) {
  popFromStack();
  const check = () => {
    if (!animating) { if (cb) cb(); return; }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

export function resetStack() {
  /* Remove all balls from the bin */
  for (const ball of stack) {
    group.remove(ball);
    ball.geometry.dispose();
    ball.material.dispose();
  }
  stack = [];
  animating = false;
}

export function stackSize() { return stack.length; }
