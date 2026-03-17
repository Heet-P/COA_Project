/* ──────────────────────────────────────────
   conveyor.js  — 4-way belt system + blocks
   ────────────────────────────────────────── */

import { flashRegister } from './machine.js';

/* ── Constants ── */
const PLAT_Y     = 0.32;           // platform top
const BLOCK_Y    = PLAT_Y + 0.26;  // block centre
const IN_SPEED   = 0.8;
const OUT_SPEED  = 1.6;
const ARM_ZONE   = -1.3;           // x where block waits for arm
const BELT_END   = 12;
const MAX_IN     = 3;
const SPAWN_X    = -12;
const RESPAWN_CD = 2.5;            // seconds before next block spawns

/* ── State ── */
const inputBlocks  = [];
const outputBlocks = [];
let sceneRef = null;
let paused   = false;
let spawnCD  = 0;

/* Output direction vectors */
const OUTPUTS = [
  { dx:  1, dz:  0 },   // 0 = East  → MEMORY
  { dx:  0, dz: -1 },   // 1 = North → I/O PORT
  { dx:  0, dz:  1 },   // 2 = South → CACHE
];

/* ── Init ── */
export function initConveyor(scene) {
  sceneRef = scene;

  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.35, metalness: 0.55
  });

  /* Belt surfaces (dark strips on each arm) */
  const belts = [
    { w: 11, d: 0.85, x: -6.75, z: 0 },
    { w: 11, d: 0.85, x:  6.75, z: 0 },
    { w: 0.85, d: 11, x: 0, z: -6.75 },
    { w: 0.85, d: 11, x: 0, z:  6.75 },
  ];
  belts.forEach(b => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, 0.025, b.d), beltMat.clone()
    );
    m.position.set(b.x, PLAT_Y + 0.013, b.z);
    m.receiveShadow = true;
    scene.add(m);
  });

  /* Centre ring marker */
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.1, 32),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, PLAT_Y + 0.02, 0);
  scene.add(ring);

  /* Side rails */
  createRails(scene);

  /* Destination labels */
  createLabels(scene);

  /* Initial input blocks */
  for (let i = 0; i < MAX_IN; i++) {
    spawnInputBlock(SPAWN_X + i * 4.5);
  }
}

/* ── Spawn helpers ── */
function spawnInputBlock(sx) {
  const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    emissive: 0x004488,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.5
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sx, BLOCK_Y, 0);
  mesh.castShadow = true;
  sceneRef.add(mesh);
  inputBlocks.push(mesh);
}

/* Called by arm.js after release */
export function spawnOutputBlock(dirIdx) {
  const colors  = [0x44ff88, 0xff8844, 0x8844ff];
  const emits   = [0x22aa55, 0xaa5522, 0x5522aa];
  const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: colors[dirIdx],
    emissive: emits[dirIdx],
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.45
  });
  const mesh = new THREE.Mesh(geo, mat);
  const d = OUTPUTS[dirIdx];
  mesh.position.set(d.dx ? d.dx * 1.6 : 0, BLOCK_Y, d.dz ? d.dz * 1.6 : 0);
  mesh.castShadow = true;
  sceneRef.add(mesh);
  outputBlocks.push({ mesh, dir: dirIdx });
}

/* ── Tick ── */
export function tickConveyor(dt) {
  if (paused) return;

  /* Input blocks slide east */
  for (const b of inputBlocks) {
    if (b.position.x < ARM_ZONE) {
      b.position.x += IN_SPEED * dt;
      if (b.position.x > ARM_ZONE) b.position.x = ARM_ZONE;
    }
    b.rotation.y += dt * 0.35;
  }

  /* Output blocks slide toward destinations */
  for (let i = outputBlocks.length - 1; i >= 0; i--) {
    const ob = outputBlocks[i];
    const d = OUTPUTS[ob.dir];
    ob.mesh.position.x += d.dx * OUT_SPEED * dt;
    ob.mesh.position.z += d.dz * OUT_SPEED * dt;
    ob.mesh.rotation.y += dt * 0.6;

    if (Math.abs(ob.mesh.position.x) > BELT_END ||
        Math.abs(ob.mesh.position.z) > BELT_END) {
      sceneRef.remove(ob.mesh);
      ob.mesh.geometry.dispose();
      ob.mesh.material.dispose();
      outputBlocks.splice(i, 1);
      flashRegister();
    }
  }

  /* Respawn input blocks when queue is short */
  if (inputBlocks.length < MAX_IN) {
    spawnCD += dt;
    if (spawnCD >= RESPAWN_CD) {
      spawnInputBlock(SPAWN_X);
      spawnCD = 0;
    }
  } else {
    spawnCD = 0;
  }
}

/* ── Arm interface ── */
export function getReadyBlock() {
  for (const b of inputBlocks) {
    if (b.position.x >= ARM_ZONE - 0.15) return b;
  }
  return null;
}

export function removeInputBlock(mesh) {
  const idx = inputBlocks.indexOf(mesh);
  if (idx < 0) return;
  sceneRef.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  inputBlocks.splice(idx, 1);
}

/* ── Pause / Resume ── */
export function pauseConveyor()  { paused = true; }
export function resumeConveyor() { paused = false; }
export function isPaused()       { return paused; }

/* ── Rails ── */
function createRails(scene) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x999999, roughness: 0.35, metalness: 0.6
  });
  const r = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
  };
  // input + east rails (x-axis)
  [-6.75, 6.75].forEach(cx => {
    r(11, 0.07, 0.04, cx, PLAT_Y + 0.04, -0.48);
    r(11, 0.07, 0.04, cx, PLAT_Y + 0.04,  0.48);
  });
  // north + south rails (z-axis)
  [-6.75, 6.75].forEach(cz => {
    r(0.04, 0.07, 11, -0.48, PLAT_Y + 0.04, cz);
    r(0.04, 0.07, 11,  0.48, PLAT_Y + 0.04, cz);
  });
}

/* ── Labels ── */
function createLabels(scene) {
  const defs = [
    { txt: '⬅ FETCH',    x: -12.5, z:  0,     col: '#00aaff' },
    { txt: 'MEMORY ➡',   x:  12.5, z:  0,     col: '#44ff88' },
    { txt: 'I/O PORT ⬆', x:  0,    z: -12.5,  col: '#ff8844' },
    { txt: 'CACHE ⬇',    x:  0,    z:  12.5,  col: '#8844ff' },
  ];
  defs.forEach(d => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.fillStyle = d.col;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.txt, 160, 40);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex })
    );
    sp.position.set(d.x, PLAT_Y + 1.8, d.z);
    sp.scale.set(3.5, 0.9, 1);
    scene.add(sp);
  });
}
