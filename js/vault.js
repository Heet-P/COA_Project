/* ──────────────────────────────────────────
   vault.js  — 3D open-top storage bin (stack)
   Data balls get tossed in (push) and out (pop)
   Now supports single-ball push/pop with callbacks
   ────────────────────────────────────────── */

const PLAT_Y   = 0.32;
const BIN_X    = 4;
const BIN_Z    = 4;
const BIN_Y    = PLAT_Y;
const WALL     = 0.08;
const BIN_W    = 1.4;
const BIN_D    = 1.4;
const BIN_H    = 2.0;
const BALL_R   = 0.22;
const BALL_GAP = BALL_R * 2 + 0.08;

/* Animation constants */
const ARC_DURATION = 0.7;           // seconds per ball arc
const LAUNCH_POS = new THREE.Vector3(0, PLAT_Y + 0.6, 0);   // arm zone

let sceneRef = null;
let binGroup = null;

/* Stack state */
const stackBalls = [];              // meshes sitting in the bin
let animBall = null;                // currently animating ball
let animT    = 0;
let animFrom = new THREE.Vector3();
let animTo   = new THREE.Vector3();
let animMode = null;                // 'push' | 'pop'
let done     = true;                // true when idle / animation finished
let pushCount = 0;                  // how many balls to push in a batch
let popCount  = 0;

const PUSH_BATCH = 3;
const POP_BATCH  = 3;

/* Single-ball callback */
let singleCallback = null;

/* ── Init ── */
export function initVault(scene) {
  sceneRef = scene;
  binGroup = new THREE.Group();
  binGroup.position.set(BIN_X, 0, BIN_Z);
  scene.add(binGroup);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x334455, roughness: 0.5, metalness: 0.4,
    transparent: true, opacity: 0.55
  });

  /* Floor */
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(BIN_W, WALL, BIN_D), wallMat.clone()
  );
  floor.position.y = BIN_Y;
  floor.receiveShadow = true;
  binGroup.add(floor);

  /* 4 walls (no top) */
  const hw = BIN_W / 2, hd = BIN_D / 2, hh = BIN_H / 2;
  const walls = [
    { w: BIN_W, h: BIN_H, d: WALL, x: 0,   z: -hd },
    { w: BIN_W, h: BIN_H, d: WALL, x: 0,   z:  hd },
    { w: WALL,  h: BIN_H, d: BIN_D, x: -hw, z: 0   },
    { w: WALL,  h: BIN_H, d: BIN_D, x:  hw, z: 0   },
  ];
  walls.forEach(w => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w.w, w.h, w.d), wallMat.clone()
    );
    m.position.set(w.x, BIN_Y + hh + WALL / 2, w.z);
    binGroup.add(m);
  });

  /* Label "STACK" */
  const c = document.createElement('canvas');
  c.width = 200; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffcc44';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STACK', 100, 36);
  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) })
  );
  sp.scale.set(1.4, 0.36, 1);
  sp.position.set(0, BIN_Y + BIN_H + 0.5, 0);
  binGroup.add(sp);
}

/* ── Stack position for the Nth ball ── */
function stackSlotY(n) {
  return BIN_Y + WALL + BALL_R + n * BALL_GAP;
}

/* ── Create a glowing sphere ── */
function makeBall() {
  const geo = new THREE.SphereGeometry(BALL_R, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x44ddff,
    emissive: 0x22aacc,
    emissiveIntensity: 0.6,
    roughness: 0.25,
    metalness: 0.5
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/* ── Public API ── */

/** Batch push (old API — used during non-arm context save) */
export function pushToStack() {
  done = false;
  pushCount = PUSH_BATCH;
  popCount = 0;
  singleCallback = null;
  startNextPush();
}

/** Push a single ball into the stack, call onDone when it lands */
export function pushOneBall(onDone) {
  done = false;
  pushCount = 1;
  popCount = 0;
  singleCallback = onDone || null;
  startNextPush();
}

/** Batch pop (old API) */
export function popFromStack() {
  done = false;
  popCount = Math.min(POP_BATCH, stackBalls.length);
  pushCount = 0;
  singleCallback = null;
  startNextPop();
}

/** Pop a single ball from the stack, call onDone when it arrives */
export function popOneBall(onDone) {
  if (stackBalls.length === 0) { if (onDone) onDone(); return; }
  done = false;
  popCount = 1;
  pushCount = 0;
  singleCallback = onDone || null;
  startNextPop();
}

export function isStackDone()  { return done; }
export function stackSize()    { return stackBalls.length; }

export function resetStack() {
  /* Remove all balls */
  stackBalls.forEach(b => {
    sceneRef.remove(b);
    b.geometry.dispose();
    b.material.dispose();
  });
  stackBalls.length = 0;
  if (animBall) {
    sceneRef.remove(animBall);
    animBall.geometry.dispose();
    animBall.material.dispose();
    animBall = null;
  }
  animMode = null;
  done = true;
  pushCount = 0;
  popCount = 0;
  singleCallback = null;
}

/* ── Internals ── */

function startNextPush() {
  if (pushCount <= 0) {
    done = true;
    if (singleCallback) { singleCallback(); singleCallback = null; }
    return;
  }
  pushCount--;

  const ball = makeBall();
  const n = stackBalls.length;
  const target = new THREE.Vector3(BIN_X, stackSlotY(n), BIN_Z);

  animBall = ball;
  animFrom.copy(LAUNCH_POS);
  animTo.copy(target);
  animT = 0;
  animMode = 'push';

  ball.position.copy(LAUNCH_POS);
  sceneRef.add(ball);
}

function startNextPop() {
  if (popCount <= 0 || stackBalls.length === 0) {
    done = true;
    if (singleCallback) { singleCallback(); singleCallback = null; }
    return;
  }
  popCount--;

  const ball = stackBalls.pop();
  animBall = ball;
  animFrom.set(ball.position.x, ball.position.y, ball.position.z);
  animTo.copy(LAUNCH_POS);
  animT = 0;
  animMode = 'pop';
}

/* Parabolic arc interpolation */
function arcLerp(from, to, t) {
  const x = from.x + (to.x - from.x) * t;
  const z = from.z + (to.z - from.z) * t;
  const baseY = from.y + (to.y - from.y) * t;
  const arc = 4 * t * (1 - t) * 2.0;           // peak height = 2.0
  return new THREE.Vector3(x, baseY + arc, z);
}

/* ── Tick ── */
export function tickVault(dt) {
  if (!animBall || !animMode) return;

  animT += dt / ARC_DURATION;
  if (animT >= 1) animT = 1;

  const pos = arcLerp(animFrom, animTo, animT);
  animBall.position.copy(pos);

  /* Spin while in flight */
  animBall.rotation.x += dt * 6;
  animBall.rotation.z += dt * 4;

  if (animT >= 1) {
    if (animMode === 'push') {
      /* Land in the bin */
      animBall.position.copy(animTo);
      animBall.rotation.set(0, 0, 0);
      stackBalls.push(animBall);
      animBall = null;
      animMode = null;
      /* Start next ball or finish */
      startNextPush();
    } else {
      /* Ball arrived at conveyor — remove it */
      sceneRef.remove(animBall);
      animBall.geometry.dispose();
      animBall.material.dispose();
      animBall = null;
      animMode = null;
      startNextPop();
    }
  }
}
