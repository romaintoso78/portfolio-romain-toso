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
