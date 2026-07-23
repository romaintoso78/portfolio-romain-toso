import { BufferGeometry, BufferAttribute, CatmullRomCurve3, Vector3 } from "three";

const RING_SEGMENTS = 20;
// The physics only tracks a handful of control points (one per STEP units
// travelled); resampling a smooth curve through them at a much higher
// resolution avoids a faceted, polyline-y body silhouette.
const SPINE_SAMPLES = 48;
const UP = new Vector3(0, 0, 1);
const FALLBACK_UP = new Vector3(0, 1, 0);

function radiusAt(controlRadii: number[], t: number): number {
  const scaled = t * (controlRadii.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(i0 + 1, controlRadii.length - 1);
  const f = scaled - i0;
  return controlRadii[i0] * (1 - f) + controlRadii[i1] * f;
}

/**
 * Builds (or refreshes) a tapered body around a smooth curve through the
 * given control points (a Catmull-Rom spline, resampled at a much finer
 * resolution than the sparse physics control points so the silhouette
 * reads as a continuous fish rather than a faceted polyline). Cross-section
 * is a slightly flattened, ventrally-offset ellipse — real fish aren't
 * cylinders: flatter belly, a touch of dorsal ridge. Reuses `geometry`
 * across frames when the vertex count already matches. UVs: u = position
 * along the body, v = angle around it — used to map the skin texture.
 */
export function buildKoiBody(
  controlPoints: Vector3[],
  controlRadii: number[],
  geometry?: BufferGeometry,
): BufferGeometry {
  const curve = new CatmullRomCurve3(controlPoints, false, "catmullrom", 0.4);
  const ringCount = SPINE_SAMPLES;
  const points = curve.getPoints(ringCount - 1);

  const vertsNeeded = ringCount * RING_SEGMENTS;
  const geo = geometry ?? new BufferGeometry();
  const reuse = geo.getAttribute("position")?.count === vertsNeeded;

  const positions = reuse ? (geo.getAttribute("position").array as Float32Array) : new Float32Array(vertsNeeded * 3);
  const uvs = reuse ? (geo.getAttribute("uv").array as Float32Array) : new Float32Array(vertsNeeded * 2);

  const tangent = new Vector3();
  const right = new Vector3();
  const ringUp = new Vector3();

  for (let i = 0; i < ringCount; i++) {
    const p = points[i];
    const t = i / (ringCount - 1);

    curve.getTangentAt(t, tangent);
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();

    const ref = Math.abs(tangent.dot(UP)) > 0.95 ? FALLBACK_UP : UP;
    right.crossVectors(tangent, ref).normalize();
    ringUp.crossVectors(right, tangent).normalize();

    const radius = radiusAt(controlRadii, t);
    const width = radius;
    const height = radius * 0.82;
    const bellyOffset = radius * 0.12;

    for (let s = 0; s < RING_SEGMENTS; s++) {
      const theta = (s / RING_SEGMENTS) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const idx = (i * RING_SEGMENTS + s) * 3;

      const wx = cos * width;
      const wy = sin * height - bellyOffset;

      positions[idx] = p.x + right.x * wx + ringUp.x * wy;
      positions[idx + 1] = p.y + right.y * wx + ringUp.y * wy;
      positions[idx + 2] = p.z + right.z * wx + ringUp.z * wy;

      const uvIdx = (i * RING_SEGMENTS + s) * 2;
      uvs[uvIdx] = t;
      uvs[uvIdx + 1] = s / RING_SEGMENTS;
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
    geo.setAttribute("uv", new BufferAttribute(uvs, 2));
  } else {
    geo.getAttribute("position").needsUpdate = true;
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
