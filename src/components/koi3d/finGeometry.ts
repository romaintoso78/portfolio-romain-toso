import { Shape, ShapeGeometry } from "three";

/** Forked tail fin, authored flat on the XY plane pointing along +X. */
export function tailFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(7, 4, 15, 9);
  shape.quadraticCurveTo(9, 5, 8, 0);
  shape.quadraticCurveTo(9, -5, 15, -9);
  shape.quadraticCurveTo(7, -4, 0, 0);
  return new ShapeGeometry(shape, 8);
}

/** Small pectoral / dorsal fin, authored flat pointing along +X. */
export function sideFinGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(4, -1, 7, -5);
  shape.quadraticCurveTo(4, -2, 0, 0);
  return new ShapeGeometry(shape, 6);
}
