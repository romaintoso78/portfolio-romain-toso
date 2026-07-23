import { CylinderGeometry, Shape, ShapeGeometry } from "three";

/** Forked caudal (tail) fin, authored flat on the XY plane pointing along +X. */
export function tailFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(6, 5, 11, 7, 20, 13);
  shape.bezierCurveTo(15, 8, 13, 4, 12, 0);
  shape.bezierCurveTo(13, -4, 15, -8, 20, -13);
  shape.bezierCurveTo(11, -7, 6, -5, 0, 0);
  return new ShapeGeometry(shape, 10);
}

/** Rounded, fan-like pectoral fin (used for the pair near the head). */
export function pectoralFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(3, -1, 7, -3, 10, -8);
  shape.bezierCurveTo(8, -9, 5, -8.5, 2, -6.5);
  shape.bezierCurveTo(3, -4, 2, -1.5, 0, 0);
  return new ShapeGeometry(shape, 8);
}

/** Long, low, sail-like dorsal fin. */
export function dorsalFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(3, 3.5, 8, 4.5, 13, 4);
  shape.bezierCurveTo(9, 3, 5, 1.8, 0, 0);
  return new ShapeGeometry(shape, 6);
}

/**
 * Thin whisker-like barbel near the mouth: thick at its base (local origin,
 * the attachment point) tapering to a fine point at +X (length away).
 */
export function barbelGeometry(length: number) {
  const geo = new CylinderGeometry(0.35, 0.05, length, 5, 1);
  geo.rotateZ(Math.PI / 2);
  geo.translate(length / 2, 0, 0);
  return geo;
}
