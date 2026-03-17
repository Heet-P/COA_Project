/* ──────────────────────────────────────────
   labels.js  — canvas-text sprite labels
   ────────────────────────────────────────── */

/**
 * Creates a billboard sprite label that always faces the camera.
 * @param {string} text
 * @param {object} opts  { fontSize, color, bgColor, bgAlpha, padding, maxWidth }
 * @returns {THREE.Sprite}
 */
export function makeLabel(text, opts = {}) {
  const fontSize  = opts.fontSize  || 42;
  const color     = opts.color     || '#ffffff';
  const bgColor   = opts.bgColor   || '#000000';
  const bgAlpha   = opts.bgAlpha   ?? 0.55;
  const padding   = opts.padding   || 18;
  const maxWidth  = opts.maxWidth  || 512;

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');

  /* Measure text */
  ctx.font = `bold ${fontSize}px "Share Tech Mono", monospace`;
  const metrics = ctx.measureText(text);
  const tw = Math.min(metrics.width, maxWidth);
  const th = fontSize * 1.3;

  canvas.width  = tw + padding * 2;
  canvas.height = th + padding * 2;

  /* Background rounded rect */
  ctx.fillStyle = bgColor;
  ctx.globalAlpha = bgAlpha;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 8);
  ctx.fill();
  ctx.globalAlpha = 1;

  /* Text */
  ctx.font      = `bold ${fontSize}px "Share Tech Mono", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  /* Sprite */
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 999;

  /* Scale so 1 world-unit ≈ readable */
  const aspect = canvas.width / canvas.height;
  const scale  = opts.scale || 2.2;
  sprite.scale.set(scale * aspect, scale, 1);

  return sprite;
}

/**
 * Creates a small directional arrow sprite with text.
 * @param {string} text
 * @param {string} arrowDir  'left' | 'right' | 'down' | 'up'
 * @param {object} opts
 * @returns {THREE.Sprite}
 */
export function makeArrowLabel(text, arrowDir = 'down', opts = {}) {
  const arrows = { left: '← ', right: '→ ', down: '↓ ', up: '↑ ' };
  const prefix = arrows[arrowDir] || '→ ';
  return makeLabel(prefix + text, { fontSize: 34, scale: 1.8, ...opts });
}

/* helper */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
