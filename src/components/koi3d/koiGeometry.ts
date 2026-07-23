import { BufferGeometry, BufferAttribute, Color, Vector3 } from "three";
import { bodyColorAt, type KoiColors } from "./colors";

const RING_SEGMENTS = 10;
const UP = new Vector3(0, 0, 1);
const FALLBACK_UP = new Vector3(0, 1, 0);

/**
 * Builds (or refreshes) a tapered tube around the given spine, ring by ring,
 * using a stable per-ring frame (tangent/right/up) so the body doesn't twist.
 * Reuses `geometry` across frames when the vertex count already matches.
 */
export function buildKoiBody(
  spine: Vector3[],
  radii: number[],
  colors: KoiColors,
  geometry?: BufferGeometry,
): BufferGeometry {
  const ringCount = spine.length;
  const vertsNeeded = ringCount * RING_SEGMENTS;

  const geo = geometry ?? new BufferGeometry();
  const reuse = geo.getAttribute("position")?.count === vertsNeeded;

  const positions = reuse ? (geo.getAttribute("position").array as Float32Array) : new Float32Array(vertsNeeded * 3);
  const colorsArr = reuse ? (geo.getAttribute("color").array as Float32Array) : new Float32Array(vertsNeeded * 3);

  const tmpColor = new Color();
  const tangent = new Vector3();
  const right = new Vector3();
  const ringUp = new Vector3();

  for (let i = 0; i < ringCount; i++) {
    const p = spine[i];
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(ringCount - 1, i + 1)];
    tangent.subVectors(next, prev);
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();

    const ref = Math.abs(tangent.dot(UP)) > 0.95 ? FALLBACK_UP : UP;
    right.crossVectors(tangent, ref).normalize();
    ringUp.crossVectors(right, tangent).normalize();

    const radius = radii[i] ?? 0.05;
    const t = ringCount > 1 ? i / (ringCount - 1) : 0;

    for (let s = 0; s < RING_SEGMENTS; s++) {
      const theta = (s / RING_SEGMENTS) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const idx = (i * RING_SEGMENTS + s) * 3;

      positions[idx] = p.x + (right.x * cos + ringUp.x * sin) * radius;
      positions[idx + 1] = p.y + (right.y * cos + ringUp.y * sin) * radius;
      positions[idx + 2] = p.z + (right.z * cos + ringUp.z * sin) * radius;

      bodyColorAt(colors, t, theta, tmpColor);
      colorsArr[idx] = tmpColor.r;
      colorsArr[idx + 1] = tmpColor.g;
      colorsArr[idx + 2] = tmpColor.b;
    }
  }

  if (!reuse) {
    const indices: number[] = [];
    for (let i = 0; i < ringCount - 1; i++) {
      for (let s = 0; s < RING_SEGMENTS; s++) {
        const a = i * RING_SEGMENTS + s;
        const b = i * RING_SEGMENTS + ((s + 1) % RING_SEGMENTS);
        const c = (i + 1) * RING_SEGMENTS + s;
        const d = (i + 1) * RING_SEGMENTS + ((s + 1) % RING_SEGMENTS);
        indices.push(a, c, b, b, c, d);
      }
    }
    geo.setIndex(indices);
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colorsArr, 3));
  } else {
    geo.getAttribute("position").needsUpdate = true;
    geo.getAttribute("color").needsUpdate = true;
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
