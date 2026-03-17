/* ──────────────────────────────────────────
   factory.js   — outdoor "+" platform, ground, sky
   ────────────────────────────────────────── */

import { makeLabel } from './labels.js';

export function initFactory(scene) {

  /* ── Ground plane (grass) ── */
  const groundGeo = new THREE.PlaneGeometry(140, 140);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x5a8f3c, roughness: 0.92
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

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
  makeArrow(-4, 0, 0);          // west → center
  makeArrow(4, 0, 0);           // center → east
  makeArrow(0, -4, -Math.PI/2); // center → north
  makeArrow(0, 4, Math.PI/2);   // center → south (flipped)

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
