/* ──────────────────────────────────────────
   vault.js   — context-save vault doors + briefcase
   ────────────────────────────────────────── */

const DOOR_W = 1.2;
const DOOR_H = 2.2;
const VAULT_X = 7;
const VAULT_Z = 8.5;
const PLAT_Y  = 0.32;

let doorL, doorR, briefcase;
let doorTarget = 0;   // 0 = closed, 1 = open
let doorCur = 0;

export function initVault(scene) {
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x334455, roughness: 0.35, metalness: 0.7
  });

  doorL = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.12), doorMat
  );
  doorL.position.set(VAULT_X - DOOR_W * 0.52, PLAT_Y + DOOR_H / 2, VAULT_Z);
  doorL.castShadow = true;
  scene.add(doorL);

  doorR = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.12), doorMat.clone()
  );
  doorR.position.set(VAULT_X + DOOR_W * 0.52, PLAT_Y + DOOR_H / 2, VAULT_Z);
  doorR.castShadow = true;
  scene.add(doorR);

  /* Frame */
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x222233, roughness: 0.4, metalness: 0.8
  });
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W * 2 + 0.3, DOOR_H + 0.15, 0.18), frameMat
  );
  frame.position.set(VAULT_X, PLAT_Y + DOOR_H / 2, VAULT_Z - 0.04);
  scene.add(frame);

  /* Briefcase */
  briefcase = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.35, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xaa8800,
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.5
    })
  );
  briefcase.position.set(VAULT_X, PLAT_Y + 0.2, VAULT_Z + 0.8);
  briefcase.castShadow = true;
  briefcase.visible = false;
  scene.add(briefcase);
}

export function openDoors()  { doorTarget = 1; }
export function closeDoors() { doorTarget = 0; }

export function showBriefcase(on) {
  if (briefcase) briefcase.visible = on;
}

export function tickVault(dt) {
  const speed = 1.8;
  if (doorTarget > doorCur) doorCur = Math.min(doorCur + speed * dt, 1);
  if (doorTarget < doorCur) doorCur = Math.max(doorCur - speed * dt, 0);

  const offset = doorCur * DOOR_W * 0.9;
  doorL.position.x = VAULT_X - DOOR_W * 0.52 - offset;
  doorR.position.x = VAULT_X + DOOR_W * 0.52 + offset;

  if (briefcase && briefcase.visible) {
    briefcase.rotation.y += dt * 0.8;
  }
}
