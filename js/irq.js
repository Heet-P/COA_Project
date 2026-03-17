/* ──────────────────────────────────────────
   irq.js   — red interrupt cube (repositioned path)
   ────────────────────────────────────────── */

const PATH = [
  new THREE.Vector3(18, 2.5, 4),
  new THREE.Vector3(12, 2.5, 4),
  new THREE.Vector3(9,  2.0, 5),
  new THREE.Vector3(7,  1.6, 6),    // arrive at CPU board
];
const TRAVEL_SPEED = 4.0;

let cube = null;
let pathIndex = 0;
let active = false;
let arrived = false;

export function initIrq(scene) {
  /* pre-create hidden cube */
  const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff0000,
    emissiveIntensity: 0.6,
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
  cube.position.copy(PATH[0]);
  cube.visible = true;
  pathIndex = 1;
  active = true;
  arrived = false;
}

export function tickIrq(dt) {
  if (!active || arrived) return;
  const target = PATH[pathIndex];
  const dir = target.clone().sub(cube.position);
  const dist = dir.length();
  if (dist < 0.15) {
    pathIndex++;
    if (pathIndex >= PATH.length) {
      arrived = true;
      return;
    }
  } else {
    dir.normalize();
    cube.position.addScaledVector(dir, TRAVEL_SPEED * dt);
  }
  cube.rotation.x += dt * 4;
  cube.rotation.z += dt * 3;
}

export function clearIrq() {
  if (cube) cube.visible = false;
  active = false;
  arrived = false;
}

export function isArrived() { return arrived; }
export function isActive()  { return active; }
