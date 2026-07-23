import { Color } from "three";

export interface KoiColors {
  paper: Color;
  gold: Color;
  shu: Color;
  ink: Color;
}

// A real koi's own colors (pale skin, dark eyes) shouldn't flip with the
// page theme the way --text/--bg do (those swap lightness between themes
// so *text stays readable* — using them here made the fish's "white" skin
// turn black in light mode). Only the accent hues genuinely come from the
// site palette; the koi's own paper/ink stay fixed.
const FIXED_PAPER = "#f1ead8";
const FIXED_INK = "#17130f";

export function readKoiColors(): KoiColors {
  const s = getComputedStyle(document.documentElement);
  return {
    paper: new Color(FIXED_PAPER),
    gold: new Color(s.getPropertyValue("--accent").trim() || "#c9a24b"),
    shu: new Color(s.getPropertyValue("--warm").trim() || "#d8623a"),
    ink: new Color(FIXED_INK),
  };
}
