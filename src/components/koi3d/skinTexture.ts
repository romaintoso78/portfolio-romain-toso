import { CanvasTexture, RepeatWrapping } from "three";
import type { KoiColors } from "./colors";

const W = 1024;
const H = 512;

function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  wobble: number,
  seed: number,
) {
  const points = 10;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const n = Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 5 + seed * 2.1) * 0.3;
    const rr = r * (1 + n * wobble);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * A wrap-around (seamless in y) kohaku-style koi skin painted once on an
 * offscreen canvas: white/paper base, irregular gold + a few deeper shu
 * patches with a soft dark "kiwa" edge, plus a faint overlaid scale tiling.
 * x = position along the body (head -> tail), y = angle around the body
 * (wraps top-to-bottom).
 */
export function buildKoiSkinTexture(colors: KoiColors, seed = 1, existing?: CanvasTexture): CanvasTexture {
  const canvas = (existing?.image as HTMLCanvasElement) ?? document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${colors.paper.getHexString()}`;
  ctx.fillRect(0, 0, W, H);

  // Random-but-fixed patch layout (drawn once per mount, tiled vertically
  // by drawing each patch three times shifted by ±H so the wrap seam never
  // cuts through the middle of a blob).
  let rand = seed;
  const next = () => {
    rand = (rand * 9301 + 49297) % 233280;
    return rand / 233280;
  };

  const patches: { cx: number; cy: number; r: number; deep: boolean }[] = [];
  const patchCount = 6 + Math.floor(next() * 3);
  for (let i = 0; i < patchCount; i++) {
    patches.push({
      cx: next() * W,
      cy: next() * H,
      r: 60 + next() * 130,
      deep: next() > 0.55,
    });
  }

  for (const p of patches) {
    for (const dy of [-H, 0, H]) {
      // soft dark kiwa edge halo
      ctx.save();
      ctx.filter = "blur(6px)";
      ctx.fillStyle = `#${colors.ink.getHexString()}`;
      ctx.globalAlpha = 0.35;
      blob(ctx, p.cx, p.cy + dy, p.r * 1.06, 0.22, p.cx + p.cy);
      ctx.fill();
      ctx.restore();

      ctx.globalAlpha = 1;
      ctx.fillStyle = `#${(p.deep ? colors.shu : colors.gold).getHexString()}`;
      blob(ctx, p.cx, p.cy + dy, p.r, 0.22, p.cx + p.cy);
      ctx.fill();
    }
  }

  // faint scale tiling overlay
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = `#${colors.ink.getHexString()}`;
  ctx.lineWidth = 1;
  const scaleR = 14;
  for (let row = 0; row * scaleR * 0.85 < H + scaleR; row++) {
    const y = row * scaleR * 0.85;
    const offset = row % 2 === 0 ? 0 : scaleR * 0.6;
    for (let x = -scaleR + offset; x < W + scaleR; x += scaleR * 1.2) {
      ctx.beginPath();
      ctx.arc(x, y, scaleR * 0.6, 0, Math.PI, false);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  if (existing) {
    existing.needsUpdate = true;
    return existing;
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
