// IcebergSkinPreview.js
// Draws a static preview of an iceberg skin onto a small <canvas>, using
// the same faceted-shape + gradient recipe as Renderer.renderIceberg() —
// with a fixed (non-random) jagged outline so the shop card looks the same
// every time, rather than re-rolling on every render.

// A representative jagged top edge, in the same normalized style as
// Hazard.js's generateShape() (points across the top, in -0.5..0.5 space).
const FIXED_SHAPE_RATIOS = [
  { xr: -0.5, yr: -0.32 },
  { xr: -0.28, yr: -0.46 },
  { xr: -0.05, yr: -0.28 },
  { xr: 0.18, yr: -0.44 },
  { xr: 0.38, yr: -0.22 },
  { xr: 0.5, yr: -0.34 }
];

export function drawIcebergSkinPreview(canvas, skinDef) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = canvas.clientWidth || canvas.width || 120;
  const cssHeight = canvas.clientHeight || canvas.height || 92;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Icy-water backdrop, same treatment as BoatPreview.js.
  const bg = ctx.createLinearGradient(0, 0, 0, cssHeight);
  bg.addColorStop(0, '#0f6fb8');
  bg.addColorStop(1, '#20aeeb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const padding = 14;
  const w = Math.min(cssWidth - padding * 2, 90);
  const h = Math.min(cssHeight - padding * 2, 68);
  const shadeSeed = 0.5; // fixed, matches the mid-gradient-stop midpoint

  ctx.save();
  ctx.translate(cssWidth / 2, cssHeight / 2 + h * 0.05);

  const pts = FIXED_SHAPE_RATIOS.map((p) => ({ x: p.xr * w, y: p.yr * h }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();

  const skin = skinDef.colors;
  const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  grad.addColorStop(0, skin.light);
  grad.addColorStop(0.5 + shadeSeed * 0.2, skin.mid);
  grad.addColorStop(1, skin.dark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(11, 61, 92, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle facet highlight, same as in-game.
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[Math.floor(pts.length / 2)].x, pts[Math.floor(pts.length / 2)].y);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}
