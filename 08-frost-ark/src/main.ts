import { PALETTE } from './render/palette';
import { createInitialWorld, stepWorld } from './sim/world';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const statsEl = document.getElementById('hud-stats') as HTMLDivElement;
const portraitEl = document.getElementById('manan-portrait') as HTMLImageElement;
portraitEl.src = '../assets/character/head-0.png';

const world = createInitialWorld();

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

function renderFrame(): void {
  stepWorld(world, 1);

  const w = canvas.width;
  const h = canvas.height;

  // Ice-blue graphite sky backdrop
  ctx.fillStyle = PALETTE.skyDeep;
  ctx.fillRect(0, 0, w, h);

  // Subtle drifting cloud bands
  ctx.fillStyle = PALETTE.skyMist;
  const drift = (world.tick * 0.4) % (w + 240);
  ctx.fillRect(drift - 240, h * 0.22, 220, 26);
  ctx.fillRect(((drift + 360) % (w + 260)) - 260, h * 0.72, 260, 30);

  // Center 7x7 starter wooden deck preview
  const tile = 32;
  const deckPx = 7 * tile;
  const ox = Math.floor((w - deckPx) / 2);
  const oy = Math.floor((h - deckPx) / 2);

  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.deckWood : PALETTE.deckWoodEdge;
      ctx.fillRect(ox + x * tile + 1, oy + y * tile + 1, tile - 2, tile - 2);
    }
  }

  // Warm amber hearth core radial glow vs cold frost atmosphere
  const cx = w / 2;
  const cy = h / 2;
  const pulse = 1 + Math.sin(world.tick * 0.08) * 0.05;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 165 * pulse);
  glow.addColorStop(0, 'rgba(255, 208, 138, 0.78)');
  glow.addColorStop(0.45, 'rgba(234, 122, 48, 0.34)');
  glow.addColorStop(1, 'rgba(234, 122, 48, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 165 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Hearth brazier block
  ctx.fillStyle = PALETTE.emberDark;
  ctx.fillRect(cx - 22, cy - 22, 44, 44);
  ctx.fillStyle = PALETTE.hearthCore;
  ctx.fillRect(cx - 12, cy - 12, 24, 24);

  statsEl.textContent = `DAY ${world.day} | ${world.ambientTemp}°C | 浮力 ${world.ark.buoyancyUsed}/${world.ark.buoyancyMax}`;

  requestAnimationFrame(renderFrame);
}

requestAnimationFrame(renderFrame);
