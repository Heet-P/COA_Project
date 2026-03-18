/* ──────────────────────────────────────────
   factory.js   — outdoor "+" platform, ground, sky
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

export function initFactory(scene) {

  /* ── Ground plane (concrete floor) ── */
  const groundGeo = new THREE.PlaneGeometry(140, 140);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3a3d40, roughness: 0.9, metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── 4 Enclosing Walls (Concrete Factory Theme) ── */
  const wallSize = 80;
  const wallHeight = 35;
  const wallThick = 2;
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x505458, roughness: 0.85, metalness: 0.2
  });

  // Helper to create a wall
  function createWall(w, h, d, x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, h / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  }

  // North, South, East, West walls
  createWall(wallSize, wallHeight, wallThick, 0, -wallSize/2);
  createWall(wallSize, wallHeight, wallThick, 0, wallSize/2);
  createWall(wallThick, wallHeight, wallSize, -wallSize/2, 0);
  createWall(wallThick, wallHeight, wallSize, wallSize/2, 0);

  /* ── Hazard Stripes around the bottom ── */
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = 256;
  stripeCanvas.height = 256;
  const ctx = stripeCanvas.getContext('2d');
  ctx.fillStyle = '#ffaa00'; // yellow
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#111111'; // black
  // draw angled stripes
  for (let i = -256; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i - 256 + 32, 256);
    ctx.lineTo(i - 256, 256);
    ctx.fill();
  }

  const stripeTex = new THREE.CanvasTexture(stripeCanvas);
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.repeat.set(40, 1);

  const stripeMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 });

  function createStripe(w, d, x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), stripeMat);
    mesh.position.set(x, 0.75, z);
    scene.add(mesh);
  }

  const stOffset = wallSize/2 - wallThick/2 - 0.05;
  createStripe(wallSize - wallThick * 2, wallThick + 0.1, 0, -stOffset);
  createStripe(wallSize - wallThick * 2, wallThick + 0.1, 0, stOffset);

  const stripeTexZ = stripeTex.clone();
  stripeTexZ.repeat.set(1, 40);
  stripeTexZ.rotation = Math.PI / 2;
  const stripeMatZ = new THREE.MeshStandardMaterial({ map: stripeTexZ, roughness: 0.6 });

  function createStripeZ(w, d, x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), stripeMatZ);
    mesh.position.set(x, 0.75, z);
    scene.add(mesh);
  }
  createStripeZ(wallThick + 0.1, wallSize - wallThick * 2, -stOffset, 0);
  createStripeZ(wallThick + 0.1, wallSize - wallThick * 2, stOffset, 0);

  /* ── Platform material ── */
  const platMat = new THREE.MeshStandardMaterial({
    color: 0xc2c7ce, roughness: 0.55, metalness: 0.05
  });

  /* Central hub */
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 0.35, 32), platMat
  );
  hub.position.set(0, 0.175, 0);
  hub.receiveShadow = true;
  hub.castShadow = true;
  scene.add(hub);

  /* 4 arms of the "+" */
  const arms = [
    { w: 11, d: 2.4, x: -6.75, z: 0 },   // West  (input)
    { w: 11, d: 2.4, x:  6.75, z: 0 },   // East  (MEMORY)
    { w: 2.4, d: 11, x: 0, z: -6.75 },   // North (I/O)
    { w: 2.4, d: 11, x: 0, z:  6.75 },   // South (CACHE)
  ];
  arms.forEach(a => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(a.w, 0.32, a.d), platMat
    );
    mesh.position.set(a.x, 0.16, a.z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  });

  /* ── Edge bollards (metal posts) ── */
  const bollardGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, roughness: 0.3, metalness: 0.7
  });
  const posts = [
    // west arm ends
    [-12.2, 1.1], [-12.2, -1.1],
    // east arm ends
    [12.2, 1.1], [12.2, -1.1],
  ];
  posts.forEach(([x, z]) => {
    const b = new THREE.Mesh(bollardGeo, bollardMat);
    b.position.set(x, 0.62, z);
    b.castShadow = true;
    scene.add(b);
  });
  // north / south
  const postNS = [
    [1.1, -12.2], [-1.1, -12.2],
    [1.1, 12.2], [-1.1, 12.2],
  ];
  postNS.forEach(([x, z]) => {
    const b = new THREE.Mesh(bollardGeo, bollardMat);
    b.position.set(x, 0.62, z);
    b.castShadow = true;
    scene.add(b);
  });

  /* ── Direction arrows on platform ── */
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00, roughness: 0.5, metalness: 0.2
  });
  // Simple arrow: thin box + cone
  function makeArrow(x, z, rotY) {
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.02, 0.12), arrowMat
    );
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.4, 6), arrowMat
    );
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.95, 0, 0);
    const g = new THREE.Group();
    g.add(shaft, head);
    g.position.set(x, 0.34, z);
    g.rotation.y = rotY;
    scene.add(g);
  }
  makeArrow(-4, 0, 0);             // west → center (east)
  makeArrow(4, 0, 0);             // center → east
  makeArrow(0, -4, Math.PI / 2);  // center → north
  makeArrow(0,  4, -Math.PI / 2); // center → south

  /* ── Clouds ── */
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 12; i++) {
    const w = 10 + Math.random() * 14;
    const h = 3 + Math.random() * 2;
    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h), cloudMat
    );
    cloud.rotation.x = -Math.PI / 2;
    cloud.position.set(
      (Math.random() - 0.5) * 100,
      28 + Math.random() * 12,
      (Math.random() - 0.5) * 100
    );
    scene.add(cloud);
  }

  /* ── Fog (sky-tint depth) ── */
  scene.fog = new THREE.Fog(0x87CEEB, 50, 130);

}
