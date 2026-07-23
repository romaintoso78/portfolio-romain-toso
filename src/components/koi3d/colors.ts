import { Color } from "three";

export interface KoiColors {
  paper: Color;
  gold: Color;
  shu: Color;
  ink: Color;
}

export function readKoiColors(): KoiColors {
  const s = getComputedStyle(document.documentElement);
  return {
    paper: new Color(s.getPropertyValue("--text").trim() || "#eae6da"),
    gold: new Color(s.getPropertyValue("--accent").trim() || "#c9a24b"),
    shu: new Color(s.getPropertyValue("--warm").trim() || "#d8623a"),
    ink: new Color(s.getPropertyValue("--bg").trim() || "#0c0d0f"),
  };
}

/**
 * Irregular kohaku-style blotches (white/paper base, gold/shu patches) instead
 * of a smooth gradient — a real koi's markings don't shade evenly down its
 * length. `t` = 0..1 along the body (head to tail), `theta` = angle around
 * the body's circumference. Deterministic in (t, theta) so patches stay put
 * on the fish rather than swimming across its skin.
 */
function patchValue(t: number, theta: number): number {
  return (
    Math.sin(t * 18.4 + theta * 1.7 + 1.3) * 0.5 +
    Math.sin(t * 41.7 - theta * 0.9 + 4.1) * 0.3 +
    Math.sin(t * 7.3 + theta * 2.1 + 0.6) * 0.2
  );
}

export function bodyColorAt(colors: KoiColors, t: number, theta: number, out: Color): Color {
  const n = patchValue(t, theta);
  out.copy(colors.paper);
  if (n > 0.05) out.lerp(colors.gold, Math.min((n - 0.05) / 0.35, 1));
  if (n > 0.5) out.lerp(colors.shu, Math.min((n - 0.5) / 0.5, 1) * 0.6);
  return out;
}
