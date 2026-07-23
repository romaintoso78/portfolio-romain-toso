import { BufferGeometry, BufferAttribute, Vector3 } from "three";

// The camera is orthographic, looking straight down the depth axis, and the
// koi swims almost entirely in that screen plane (only a faint +/-1.4 unit
// bob in depth) — so the ring subdivision (which mostly varies across the
// *depth* axis) barely affects the visible silhouette, only shading
// roundness. What actually controls how smooth the visible outline and its
// swimming wave look is the spine's own sampling density. So the budget is
// spent asymmetrically: fewer ring segments (cheap, low visual cost) and
// many more spine samples (where resolution is actually seen).
const RING_SEGMENTS = 10;
// The physics only tracks a handful of control points (one per STEP units
// travelled); resampling a smooth curve through them at a much higher
// resolution avoids a faceted, polyline-y body silhouette.
const SPINE_SAMPLES = 56;
const UP = new Vector3(0, 0, 1);
const FALLBACK_UP = new Vector3(0, 1, 0);
// How many full S-bends fit along the body — real carp/koi are
// sub-carangiform swimmers, roughly one-and-a-bit wavelengths head to tail.
const WAVE_NUMBER = 1.25;

function clampIndex(points: Vector3[], i: number): Vector3 {
  return points[Math.max(0, Math.min(points.length - 1, i))];
}

/**
 * Uniform Catmull-Rom position, hand-rolled (no three.js Curve class): a
 * closed-form cubic in `localT`, only additions/multiplications — no
 * distance-based weighting or arc-length remapping, so it can't produce
 * NaN/degenerate results from closely-spaced or duplicate control points
 * the way three.js's getTangentAt/getUtoTmapping machinery could.
 */
function catmullRomPoint(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number, out: Vector3) {
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * (2 * p1.z + (p2.z - p0.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t3);
}

/** Analytical derivative of the same cubic — the spline's tangent direction. */
function catmullRomTangent(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number, out: Vector3) {
  const t2 = t * t;
  out.x = 0.5 * ((p2.x - p0.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t + 3 * (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t2);
  out.y = 0.5 * ((p2.y - p0.y) + 2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t + 3 * (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t2);
  out.z = 0.5 * ((p2.z - p0.z) + 2 * (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t + 3 * (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t2);
}

function radiusAt(controlRadii: number[], t: number): number {
  const scaled = t * (controlRadii.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(i0 + 1, controlRadii.length - 1);
  const f = scaled - i0;
  return controlRadii[i0] * (1 - f) + controlRadii[i1] * f;
}

/**
 * Builds (or refreshes) a tapered body around a smooth curve through the
 * given control points (a hand-rolled Catmull-Rom spline, resampled at a
 * much finer resolution than the sparse physics control points so the
 * silhouette reads as a continuous fish rather than a faceted polyline).
 * Cross-section is a slightly flattened, ventrally-offset ellipse — real
 * fish aren't cylinders: flatter belly, a touch of dorsal ridge. A lateral
 * S-curve undulation (amplitude growing toward the tail, phase travelling
 * backward over time via `wavePhase`) is layered on top of the base spline
 * — the actual swimming motion of a fish's body, not just a rigid shape
 * dragged along a path. Reuses `geometry` across frames when the vertex
 * count already matches. UVs: u = position along the body, v = angle
 * around it — used to map the skin texture.
 */
export function buildKoiBody(
  controlPoints: Vector3[],
  controlRadii: number[],
  wavePhase: number,
  waveAmp: number,
  geometry?: BufferGeometry,
  bankAngle = 0,
): BufferGeometry {
  const ringCount = SPINE_SAMPLES;
  const segCount = controlPoints.length - 1;

  const vertsNeeded = ringCount * RING_SEGMENTS;
  const geo = geometry ?? new BufferGeometry();
  const reuse = geo.getAttribute("position")?.count === vertsNeeded;

  const positions = reuse ? (geo.getAttribute("position").array as Float32Array) : new Float32Array(vertsNeeded * 3);
  const uvs = reuse ? (geo.getAttribute("uv").array as Float32Array) : new Float32Array(vertsNeeded * 2);

  const p = new Vector3();
  const tangent = new Vector3();
  const right = new Vector3();
  const ringUp = new Vector3();

  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const scaled = t * segCount;
    const k = Math.min(Math.floor(scaled), segCount - 1);
    const localT = scaled - k;

    const p0 = clampIndex(controlPoints, k - 1);
    const p1 = clampIndex(controlPoints, k);
    const p2 = clampIndex(controlPoints, k + 1);
    const p3 = clampIndex(controlPoints, k + 2);

    catmullRomPoint(p0, p1, p2, p3, localT, p);
    catmullRomTangent(p0, p1, p2, p3, localT, tangent);
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();

    const ref = Math.abs(tangent.dot(UP)) > 0.95 ? FALLBACK_UP : UP;
    right.crossVectors(tangent, ref).normalize();
    ringUp.crossVectors(right, tangent).normalize();

    // Bank/roll into turns, like a real swimming fish tilting its body
    // toward the inside of a curve rather than staying perfectly upright.
    // Rotating {right, ringUp} around the tangent axis (they're already an
    // orthonormal frame with it) tilts the whole cross-section; the roll is
    // let grow slightly toward the tail so the twist reads as a flex of the
    // body rather than a rigid whole-fish rotation.
    if (bankAngle !== 0) {
      const bankHere = bankAngle * (0.5 + 0.5 * t);
      const cosB = Math.cos(bankHere);
      const sinB = Math.sin(bankHere);
      const rx = right.x, ry = right.y, rz = right.z;
      right.x = rx * cosB - ringUp.x * sinB;
      right.y = ry * cosB - ringUp.y * sinB;
      right.z = rz * cosB - ringUp.z * sinB;
      ringUp.x = rx * sinB + ringUp.x * cosB;
      ringUp.y = ry * sinB + ringUp.y * cosB;
      ringUp.z = rz * sinB + ringUp.z * cosB;
    }

    // Lateral undulation: near-zero at the head, growing toward the tail,
    // travelling backward as wavePhase advances — the S-curve swimming
    // motion. Applied to the ring center before building its cross-section.
    if (waveAmp > 0) {
      const envelope = t * t;
      const lateral = envelope * waveAmp * Math.sin(WAVE_NUMBER * t * Math.PI * 2 - wavePhase);
      p.x += right.x * lateral;
      p.y += right.y * lateral;
      p.z += right.z * lateral;
    }

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
  // No computeBoundingSphere here: it's an O(vertices) pass whose only
  // consumer is frustum culling, which the mesh has disabled (frustumCulled
  // = false in Koi.tsx — a fixed background element that's always at least
  // partially on screen) — recomputing it every single frame was pure
  // wasted work on the animation's hot path.
  return geo;
}
