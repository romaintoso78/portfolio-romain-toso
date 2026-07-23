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

/** paper -> gold -> shu, t in [0,1] along the body (0 = head, 1 = tail) */
export function bodyColorAt(colors: KoiColors, t: number, out: Color): Color {
  if (t <= 0.5) {
    return out.copy(colors.paper).lerp(colors.gold, t / 0.5);
  }
  return out.copy(colors.gold).lerp(colors.shu, (t - 0.5) / 0.5);
}
