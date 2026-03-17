/* ──────────────────────────────────────────
   loader.js  — GLTF asset loader
   ────────────────────────────────────────── */

const MANIFEST = {
  robotArm:  'assets/robot_arm.glb',
};

export async function loadAll() {
  const loader = new THREE.GLTFLoader();
  const entries = Object.entries(MANIFEST);
  const assets = {};

  for (const [key, url] of entries) {
    const gltf = await loader.loadAsync(url);
    assets[key] = gltf;
  }
  return assets;
}
