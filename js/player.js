/* ──────────────────────────────────────────
   player.js  — first-person pointer-lock
   ────────────────────────────────────────── */

const SPEED      = 5;
const LOOK_SPEED = 0.002;

let camera, yaw = -2.0, pitch = -0.15;
const keys = {};
let pointerLocked = false;

export function initPlayer(cam) {
  camera = cam;
  /* Elevated overview of the + intersection */
  camera.position.set(10, 4.5, 14);
  applyLook();

  /* Keyboard */
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup',   e => { keys[e.code] = false; });

  /* Mouse look — only while pointer is locked */
  document.addEventListener('mousemove', e => {
    if (!document.pointerLockElement) return;
    yaw   -= e.movementX * LOOK_SPEED;
    pitch -= e.movementY * LOOK_SPEED;
    pitch  = Math.max(-1.2, Math.min(1.2, pitch));
  });

  /* Track pointer lock state */
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = !!document.pointerLockElement;
  });
}

function applyLook() {
  const dir = new THREE.Vector3(
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw)
  );
  camera.lookAt(camera.position.clone().add(dir));
}

export function tickPlayer(dt) {
  if (!camera) return;

  /* Movement always works (not gated on pointer lock) */
  const fwd   = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));

  if (keys['KeyW']) camera.position.addScaledVector(fwd,    SPEED * dt);
  if (keys['KeyS']) camera.position.addScaledVector(fwd,   -SPEED * dt);
  if (keys['KeyA']) camera.position.addScaledVector(right, -SPEED * dt);
  if (keys['KeyD']) camera.position.addScaledVector(right,  SPEED * dt);

  applyLook();
}

export function lockPointer() {
  const c = document.getElementById('c');
  if (c && !document.pointerLockElement) {
    c.requestPointerLock();
  }
}
