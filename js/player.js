/* ──────────────────────────────────────────
   player.js  — first-person pointer-lock (repositioned)
   ────────────────────────────────────────── */

const SPEED = 5;
const LOOK_SPEED = 0.002;

let camera, yaw = -2.0, pitch = -0.25;
const keys = {};

export function initPlayer(cam) {
  camera = cam;
  /* Elevated overview of the + intersection, looking toward centre */
  camera.position.set(10, 4.5, 14);
  applyLook();

  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup',   e => { keys[e.code] = false; });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
      yaw   -= e.movementX * LOOK_SPEED;
      pitch -= e.movementY * LOOK_SPEED;
      pitch  = Math.max(-1.2, Math.min(1.2, pitch));
    }
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
  const fwd   = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));

  if (keys['KeyW']) camera.position.addScaledVector(fwd, SPEED * dt);
  if (keys['KeyS']) camera.position.addScaledVector(fwd, -SPEED * dt);
  if (keys['KeyA']) camera.position.addScaledVector(right, -SPEED * dt);
  if (keys['KeyD']) camera.position.addScaledVector(right, SPEED * dt);

  applyLook();
}

export function lockPointer() {
  document.getElementById('c').requestPointerLock();
}
