/* ──────────────────────────────────────────
   irq.js   — red interrupt cube on the INPUT belt
   ────────────────────────────────────────── */

const PLAT_Y   = 0.32;
const BLOCK_Y  = PLAT_Y + 0.26;
const START_X  = -12;
const END_X    = -1.3;
const TRAVEL_SPEED = 6.0;

let cube = null;
let active = false;
let arrived = false;
let sceneRef = null;

export function initIrq(scene) {
  sceneRef = scene;
  const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff0000,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.5
  });
  cube = new THREE.Mesh(geo, mat);
  cube.castShadow = true;
  cube.visible = false;
  scene.add(cube);
}

export function fireIrq() {
  if (active) return;
  cube.position.set(START_X, BLOCK_Y, 0);
  cube.visible = true;
  active = true;
  arrived = false;
}

export function tickIrq(dt) {
  if (!active || arrived) return;

  cube.position.x += TRAVEL_SPEED * dt;
  cube.rotation.x += dt * 5;
  cube.rotation.z += dt * 4;

  /* Pulse glow */
  cube.material.emissiveIntensity = 0.7 + Math.sin(performance.now() * 0.008) * 0.4;

  if (cube.position.x >= END_X) {
    cube.position.x = END_X;
    arrived = true;
  }
}

export function clearIrq() {
  if (cube) cube.visible = false;
  active = false;
  arrived = false;
}

export function isArrived() { return arrived; }
export function isActive()  { return active; }

/* ── NEW: expose cube mesh so the arm can grab it ── */
export function getIrqCube()  { return cube; }
