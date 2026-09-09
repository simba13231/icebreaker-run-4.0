// BoatPreview.js
// Draws a static preview of a boat skin onto a small <canvas>, for shop
// cards. Deliberately reuses the exact same hull/cabin/highlight drawing
// recipe as Renderer.renderBoat() (see js/rendering/Renderer.js) so shop
// previews always match what the boat actually looks like in-game — no
// separate art asset to keep in sync, and no external images/licensing to
// worry about.

import { CONFIG } from '../config.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} boatDef - an entry from data/Boats.js (colors + optional `special`)
 */
export function drawBoatPreview(canvas, boatDef) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = canvas.clientWidth || canvas.width || 120;
  const cssHeight = canvas.clientHeight || canvas.height || 92;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const c = CONFIG.COLORS;
  const skin = boatDef.colors || { hull: c.BOAT_HULL, hullShade: c.BOAT_HULL_SHADE, cabin: c.BOAT_CABIN };

  // Icy-water backdrop so the boat has some visual context instead of
  // floating on a flat color.
  const bg = ctx.createLinearGradient(0, 0, 0, cssHeight);
  bg.addColorStop(0, '#eafcff');
  bg.addColorStop(1, '#c9edfb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Fit the boat's native aspect ratio (CONFIG.BOAT.WIDTH x HEIGHT) inside
  // the canvas with some padding, then draw centered.
  const padding = 10;
  const nativeW = CONFIG.BOAT.WIDTH;
  const nativeH = CONFIG.BOAT.HEIGHT;
  const scale = Math.min((cssWidth - padding * 2) / nativeW, (cssHeight - padding * 2) / nativeH);
  const w = nativeW * scale;
  const h = nativeH * scale;

  ctx.save();
  ctx.translate(cssWidth / 2, cssHeight / 2 + h * 0.04); // tiny downward nudge for wake room

  // Wake, same as in-game.
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = c.WATER_HIGHLIGHT_2;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.55, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hull.
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(w / 2, -h / 2 + h * 0.15, w / 2, h / 3, w * 0.32, h / 2);
  ctx.lineTo(-w * 0.32, h / 2);
  ctx.bezierCurveTo(-w / 2, h / 3, -w / 2, -h / 2 + h * 0.15, 0, -h / 2);
  ctx.closePath();
  const hullGradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  hullGradient.addColorStop(0, skin.hullShade);
  hullGradient.addColorStop(0.5, skin.hull);
  hullGradient.addColorStop(1, skin.hullShade);
  ctx.fillStyle = hullGradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cabin/cockpit.
  ctx.beginPath();
  ctx.roundRect(-w * 0.22, -h * 0.12, w * 0.44, h * 0.34, 6);
  ctx.fillStyle = skin.cabin;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cabin window highlight.
  ctx.beginPath();
  ctx.roundRect(-w * 0.14, -h * 0.05, w * 0.28, h * 0.12, 3);
  ctx.fillStyle = c.ACCENT;
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bow highlight.
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w * 0.08, -h / 2 + h * 0.18);
  ctx.lineTo(-w * 0.08, -h / 2 + h * 0.18);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  // Icebreaker's reinforced prow spike.
  if (boatDef.special === 'reinforcedProw') {
    ctx.beginPath();
    ctx.moveTo(-w * 0.16, -h / 2 + h * 0.1);
    ctx.lineTo(0, -h / 2 - h * 0.18);
    ctx.lineTo(w * 0.16, -h / 2 + h * 0.1);
    ctx.closePath();
    ctx.fillStyle = c.ICE_LIGHT;
    ctx.strokeStyle = 'rgba(11, 61, 92, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
