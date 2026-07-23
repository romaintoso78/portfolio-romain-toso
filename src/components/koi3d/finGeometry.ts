import { CylinderGeometry, Shape, ShapeGeometry } from "three";

/**
 * Deeply forked caudal (tail) fin with long, thin, flowing lobes — modeled
 * on ornamental "butterfly"/long-fin koi rather than the short, stiff tail
 * of a standard pond koi. Authored flat on the XY plane pointing along +X.
 */
export function tailFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(11, 9, 20, 13, 34, 21);
  shape.bezierCurveTo(25, 15, 20, 8, 17, 0);
  shape.bezierCurveTo(20, -8, 25, -15, 34, -21);
  shape.bezierCurveTo(20, -13, 11, -9, 0, 0);
  return new ShapeGeometry(shape, 14);
}

/**
 * Long, trailing, scythe-shaped pectoral fin — butterfly koi carry these
 * far past the head rather than the short rounded fan of a standard koi.
 */
export function pectoralFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(4, -2, 10, -5, 18, -14);
  shape.bezierCurveTo(14, -15, 9, -13.5, 4, -10.5);
  shape.bezierCurveTo(4.5, -6.5, 3, -3, 0, 0);
  return new ShapeGeometry(shape, 10);
}

/** Tall, long, sail-like dorsal fin with a flowing trailing edge. */
export function dorsalFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(5, 6, 14, 9, 23, 8);
  shape.bezierCurveTo(16, 6, 8, 3.2, 0, 0);
  return new ShapeGeometry(shape, 8);
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
