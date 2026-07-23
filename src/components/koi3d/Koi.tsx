import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { buildKoiBody, WAVE_NUMBER } from "./koiGeometry";
import { tailFinGeometry, pectoralFinGeometry, dorsalFinGeometry, barbelGeometry } from "./finGeometry";
import { readKoiColors } from "./colors";
import { buildKoiSkinTexture } from "./skinTexture";
import type { RippleSpawner } from "./Ripples";

const SEG_COUNT = 14;
// History points are recorded every STEP units of *distance travelled*, not
// every frame — otherwise the body would stretch when the koi moves fast
// (points spread far apart) and bunch up into a blob when it slows down or
// stops (points all land on top of each other). This keeps its length
// constant no matter the speed.
const STEP = 8.3;
const HISTORY_MAX = SEG_COUNT + 6;
// Blunt rounded head, thick midsection, a pinched peduncle just before the
// tail fin — a smooth torpedo taper reads more like a slug than a fish.
const RADII = [
  4, 13, 19, 22.3, 23, 22.3, 20.5, 17.6, 14.4, 10.4, 6.5, 3.8, 2.3, 1.1,
];

interface KoiProps {
  reduceMotion: boolean;
  spawnerRef: React.MutableRefObject<RippleSpawner | null>;
}

export function Koi({ reduceMotion, spawnerRef }: KoiProps) {
  const { size } = useThree();
  const bodyRef = useRef<Mesh>(null);
  const tailRef = useRef<Group>(null);
  const finLRef = useRef<Group>(null);
  const finRRef = useRef<Group>(null);
  const dorsalRef = useRef<Group>(null);
  const eyeLRef = useRef<Group>(null);
  const eyeRRef = useRef<Group>(null);
  const barbelLRef = useRef<Group>(null);
  const barbelRRef = useRef<Group>(null);
  const geometryRef = useRef<BufferGeometry | undefined>(undefined);

  const tailGeo = useMemo(() => tailFinGeometry(), []);
  const pectoralGeo = useMemo(() => pectoralFinGeometry(), []);
  const dorsalGeo = useMemo(() => dorsalFinGeometry(), []);
  const barbelGeo = useMemo(() => barbelGeometry(16), []);
  const skinTexture = useMemo(() => buildKoiSkinTexture(readKoiColors()), []);

  // Shared material *instances* (not JSX color props) for every fin/eye/
  // barbel — passing a Color as a `color` prop only seeds the material's
  // own internal color once; mutating that source Color afterwards doesn't
  // reach the already-mounted material. Updating `.color` directly on
  // these instances does, since it's the exact object every mesh renders
  // with.
  // Plain MeshStandardMaterial, not MeshPhysicalMaterial — clearcoat/sheen
  // each add a full extra specular evaluation per fragment, multiplied
  // across several overlapping semi-transparent fins at full canvas
  // resolution. That shader cost was a real, continuous frame-time tax,
  // not a one-off — worth spending on a background decoration only once
  // the base animation is confirmed smooth.
  const finMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        roughness: 0.45,
        transparent: true,
        opacity: 0.55,
        side: DoubleSide,
      }),
    [],
  );
  const barbelMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.5 }), []);
  const eyeMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.15, metalness: 0.1 }), []);

  useEffect(() => {
    const c = readKoiColors();
    finMaterial.color.copy(c.paper);
    barbelMaterial.color.copy(c.paper);
    eyeMaterial.color.copy(c.ink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The skin texture is painted once onto a canvas — repaint it in place
  // (same texture instance, same patch layout) whenever the theme toggles.
  // Same story for the shared fin/barbel/eye materials: their `.color` is
  // updated directly rather than relying on a prop that only applies once.
  useEffect(() => {
    const update = () => {
      const c = readKoiColors();
      buildKoiSkinTexture(c, 1, skinTexture);
      finMaterial.color.copy(c.paper);
      barbelMaterial.color.copy(c.paper);
      eyeMaterial.color.copy(c.ink);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [skinTexture, finMaterial, barbelMaterial, eyeMaterial]);

  const state = useMemo(() => {
    const start = new Vector3(0, 0, 0);
    // Under reduced motion the physics loop never runs, so seed a static
    // resting curve here — otherwise the koi would never have enough
    // history to build a body and would simply never appear.
    const history: Vector3[] = reduceMotion
      ? Array.from(
          { length: HISTORY_MAX },
          (_, i) => new Vector3(-i * STEP, Math.sin(i * 0.28) * 6, 0),
        )
      : [start.clone()];
    return {
      mouse: { x: 0, y: 0, active: false, lastMove: -1e9 },
      idleTarget: new Vector3(0, 0, 0),
      idleTimer: 0,
      // Whether idle-wander mode was active last frame — lets us detect the
      // exact frame it switches back on after the cursor goes away, so a
      // fresh (heading-biased) target gets picked right then instead of
      // reusing whatever idleTarget was last left over from however long
      // ago idle mode was last active, which could be anywhere on screen
      // relative to where the koi is now.
      wasIdle: true,
      head: start.clone(),
      vel: new Vector3(0, 0, 0),
      // Explicit kinematic state: a fish can only thrust along the way it's
      // currently facing and turn at a bounded rate — it can't strafe
      // sideways or reverse instantly the way a free vector-steered point
      // could. heading/speed are the authoritative values; vel is derived
      // from them each frame (kept around only because other code reads
      // vel.length() for the ripple-speed threshold).
      heading: 0,
      speed: 0,
      history,
      // Separate from history[0] on purpose: history[0] is overwritten every
      // frame to keep the tip live, so it can't also serve as the "have we
      // moved STEP units yet" baseline — comparing against it would reset
      // that baseline every frame and distance would never accumulate.
      lastCommit: start.clone(),
      time: 0,
      // Traveling body-undulation phase (the S-curve wave down the length
      // of the body). Accumulated rather than derived straight from `time`
      // so its rate can follow current speed without discontinuities.
      wavePhase: 0,
      // Independent slow oscillator driving pectoral-fin sculling while
      // hovering/idling — real koi row their pectorals for station-keeping,
      // a completely different rhythm from the tail's swimming beat.
      finPhase: 0,
      // Smoothed (lagged) rotation values for fins/dorsal — a fin is a
      // soft, flexible membrane, not a rigid plate snapping to a target
      // angle every frame. Chasing the target with exponential smoothing
      // gives it inertia/flex instead of a robotic instant response.
      // The tail fin's own lag state (lateral offset, not an angle) lives
      // just below — it derives its motion from the body's actual traveling
      // wave rather than an independent swish, so it needs the wave's
      // lateral displacement smoothed, not an angle.
      tailLateral: 0,
      tailLateralBase: 0,
      finRotL: 0,
      finRotR: 0,
      dorsalRot: 0,
      // Current body roll/bank into turns (radians), smoothed the same way.
      bank: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const toWorld = (clientX: number, clientY: number) => ({
      x: clientX - size.width / 2,
      y: -(clientY - size.height / 2),
    });

    const onMove = (e: MouseEvent) => {
      const p = toWorld(e.clientX, e.clientY);
      state.mouse.x = p.x;
      state.mouse.y = p.y;
      state.mouse.active = true;
      state.mouse.lastMove = performance.now();
    };
    const onLeave = () => {
      state.mouse.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [size, state]);

  const pickIdleTarget = () => {
    // A fully random point anywhere on screen, picked on a timer regardless
    // of whether the koi ever got close to the *previous* one, meant it
    // spent most of idle time (measured: ~40%) grinding through a hard turn
    // rather than gliding — every few seconds it could be asked to reverse
    // course almost entirely. Real idle wandering is the opposite: long,
    // easy glides with only occasional gentle course changes. Bias the next
    // destination to a modest swing off the *current* heading instead of a
    // uniformly random direction, so it never has to reorient hard just to
    // hold station.
    const swing = (Math.random() - 0.5) * Math.PI * 0.55; // up to ~50° either way
    const angle = state.heading + swing;
    const dist = 260 + Math.random() * 220;
    const maxX = size.width * 0.42;
    const maxY = size.height * 0.32;
    state.idleTarget.set(
      Math.max(-maxX, Math.min(maxX, state.head.x + Math.cos(angle) * dist)),
      Math.max(-maxY, Math.min(maxY, state.head.y + Math.sin(angle) * dist)),
      0,
    );
  };

  useEffect(() => {
    pickIdleTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    if (reduceMotion && geometryRef.current) return;

    const dt = Math.min(rawDt, 1 / 30);
    state.time += dt;

    if (!reduceMotion) {
      const now = performance.now();
      const idleFor = now - state.mouse.lastMove;
      let targetX: number;
      let targetY: number;
      const isIdleNow = !(state.mouse.active && idleFor < 4500);
      if (!isIdleNow) {
        targetX = state.mouse.x;
        targetY = state.mouse.y;
      } else {
        // The moment idle mode switches back on after the cursor stops
        // (or leaves), immediately pick a fresh target rather than reusing
        // whatever was last left in idleTarget — that could be anywhere on
        // screen relative to wherever the koi ended up while it was
        // following the cursor, forcing a jarring snap-turn right as the
        // cursor lets go.
        if (!state.wasIdle) {
          pickIdleTarget();
          state.idleTimer = 6 + Math.random() * 5;
        }

        // Beyond that, switch on arrival, not just on a timer — picking a
        // fresh target purely on a clock (even mid-glide, well before
        // actually getting there) was what forced constant hard
        // reorientation. The timer is now just a fallback in case a target
        // is unreachable for some reason, not the normal trigger.
        const idleDist = Math.hypot(state.idleTarget.x - state.head.x, state.idleTarget.y - state.head.y);
        state.idleTimer -= dt;
        if (state.idleTimer <= 0 || idleDist < 90) {
          pickIdleTarget();
          state.idleTimer = 6 + Math.random() * 5;
        }
        targetX = state.idleTarget.x;
        targetY = state.idleTarget.y;
      }
      state.wasIdle = isIdleNow;

      // A real koi never darts to match how fast you move the cursor — it
      // cruises at its own calm, constant pace and just steers toward
      // wherever the target currently is. However fast the mouse moves,
      // the fish's own speed is capped and eases only gently in direction.
      //
      // It also can't strafe: it can only thrust along the way it's
      // currently facing, and its heading can only turn at a bounded rate
      // (like a boat/fish, not a free-floating drone) — so it banks into
      // turns instead of snapping sideways. It also eases off its top
      // speed the sharper the turn it's making, the way a real fish (or
      // any swimming/steering body) slows into a tight turn.
      const cruiseSpeed = 85;
      // A body this long can't spin on the spot without looking like it's
      // curling into a knot — at cruise speed this gives a turning radius
      // roughly on the order of the koi's own length, a wide graceful arc
      // instead of a tight loop.
      const maxTurnRate = 0.85; // rad/s
      const maxAccel = 160;
      const arriveRadius = 70;

      // Quasi-noise: a couple of incommensurate sine waves summed together.
      // Fully deterministic (no drift/accumulation risk), but doesn't repeat
      // on a short obvious period the way a single sine would — enough to
      // break up the motion's perfect regularity without ever looking random
      // or jittery. Used as a tiny organic wobble on top of the pure
      // steering logic, the way no real swimming animal tracks a target
      // along a mathematically perfect path.
      const noise = Math.sin(state.time * 0.83) * 0.6 + Math.sin(state.time * 1.97 + 1.4) * 0.4;

      const dx = targetX - state.head.x;
      const dy = targetY - state.head.y;
      const dist = Math.hypot(dx, dy);
      const desiredHeading = Math.atan2(dy, dx) + noise * 0.05;

      let deltaAngle = desiredHeading - state.heading;
      deltaAngle = Math.atan2(Math.sin(deltaAngle), Math.cos(deltaAngle));
      const turnSharpness = Math.min(Math.abs(deltaAngle) / (Math.PI * 0.5), 1);

      const maxDeltaAngle = maxTurnRate * dt;
      const clampedDelta = Math.max(-maxDeltaAngle, Math.min(maxDeltaAngle, deltaAngle));
      state.heading += clampedDelta;

      const arrivalFactor = dist < arriveRadius ? dist / arriveRadius : 1;
      const desiredSpeed = cruiseSpeed * arrivalFactor * (1 - turnSharpness * 0.3) * (1 + noise * 0.04);
      const maxSpeedDelta = maxAccel * dt;
      state.speed += Math.max(-maxSpeedDelta, Math.min(maxSpeedDelta, desiredSpeed - state.speed));
      if (state.speed < 0) state.speed = 0;

      state.vel.x = Math.cos(state.heading) * state.speed;
      state.vel.y = Math.sin(state.heading) * state.speed;

      state.head.x += state.vel.x * dt;
      state.head.y += state.vel.y * dt;
      state.head.z = Math.sin(state.time * 1.1) * 1.4;

      // Real fish scale up mostly by beating the tail *faster*, not wider —
      // swimmers converge on a near-constant Strouhal number (tailbeat
      // frequency * amplitude / speed, ~0.2-0.4) across their whole speed
      // range, which in practice means frequency does almost all the work
      // and amplitude barely grows. It never fully stops even at rest — a
      // real fish keeps a lazy tail sway just holding station.
      const speedFrac = Math.min(state.speed / cruiseSpeed, 1);
      state.wavePhase += (0.55 + speedFrac * 2.35) * dt * Math.PI * 2;

      // Bank into the turn (roll toward the inside of the curve) — the
      // faster the koi is turning right now, the more it tilts, eased
      // toward that target with its own lag so the roll settles in and out
      // smoothly instead of snapping with the steering.
      const turnRate = dt > 0 ? clampedDelta / dt : 0;
      const targetBank = Math.max(-0.55, Math.min(0.55, turnRate * 0.4));
      state.bank += (targetBank - state.bank) * Math.min(1, dt * 5);

      const distFromLast = state.head.distanceTo(state.lastCommit);
      if (distFromLast >= STEP) {
        state.history.unshift(state.head.clone());
        if (state.history.length > HISTORY_MAX) state.history.length = HISTORY_MAX;
        state.lastCommit.copy(state.head);
      } else {
        // Still update the very tip continuously so the head doesn't lag
        // a full STEP behind while easing into a stop — this does NOT
        // affect the distFromLast baseline above (that's lastCommit). Mutate
        // the existing Vector3 in place rather than cloning a new one —
        // this branch runs on most frames, so a fresh allocation here was a
        // steady, needless stream of garbage for the GC to chase.
        state.history[0].copy(state.head);
      }

      const speed = state.vel.length();
      if (speed > cruiseSpeed * 0.7 && Math.random() < 0.03) {
        spawnerRef.current?.spawn(state.head.x, state.head.y);
      }
    }

    if (state.history.length < 2) return;

    const spine: Vector3[] = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const idx = Math.min(i, state.history.length - 1);
      spine.push(state.history[idx]);
    }

    // Defensive: a bad geometry rebuild should never freeze the rest of the
    // fish (fins/eyes/tail below) — worst case, the body keeps its last
    // good shape for a frame instead of the whole koi seizing up.
    try {
      // Amplitude stays close to constant across speeds (see the Strouhal
      // note above) — frequency is what carries the "swimming harder" read.
      const waveAmp = reduceMotion ? 0 : 4.8 + Math.min(state.speed / 85, 1) * 2.2;
      geometryRef.current = buildKoiBody(spine, RADII, state.wavePhase, waveAmp, geometryRef.current, reduceMotion ? 0 : state.bank);
      if (bodyRef.current) bodyRef.current.geometry = geometryRef.current;
    } catch (err) {
      console.error("buildKoiBody failed", err);
    }

    const head = spine[0];
    const tailBase = spine[Math.floor(SEG_COUNT * 0.78)] ?? spine[spine.length - 1];
    const tailTip = spine[spine.length - 1];
    // The koi's own facing direction (state.heading) is the authoritative
    // orientation now — steadier than re-deriving it from consecutive spine
    // samples, which can jitter slightly frame to frame.
    const heading = state.heading;
    const fwdX = Math.cos(heading);
    const fwdY = Math.sin(heading);
    const perpX = -fwdY;
    const perpY = fwdX;

    if (eyeLRef.current && eyeRRef.current) {
      // `head` is the very nose tip (RADII[0] = 4, about as narrow as the
      // body gets) — anchoring the eyes there with a large offset put them
      // floating outside the head entirely. Anchor instead just behind the
      // nose, where the head has actually widened out (RADII[1] = 13), and
      // keep the offset comfortably inside that radius so the eyes read as
      // sitting on the face, just barely proud of the surface, not past its
      // edge. A small upward bias matches a real fish's eye sitting in the
      // upper half of the head rather than dead-center.
      const eyeAnchor = spine[1] ?? head;
      const eyeBaseX = head.x * 0.3 + eyeAnchor.x * 0.7;
      const eyeBaseY = head.y * 0.3 + eyeAnchor.y * 0.7;
      const eyeBaseZ = head.z * 0.3 + eyeAnchor.z * 0.7;
      const eyeOffset = 4.6;
      const eyeForward = 0.6;
      const eyeUp = 1.6;
      eyeLRef.current.position.set(
        eyeBaseX + fwdX * eyeForward + perpX * (eyeOffset + eyeUp),
        eyeBaseY + fwdY * eyeForward + perpY * (eyeOffset + eyeUp),
        eyeBaseZ,
      );
      eyeRRef.current.position.set(
        eyeBaseX + fwdX * eyeForward - perpX * (eyeOffset - eyeUp),
        eyeBaseY + fwdY * eyeForward - perpY * (eyeOffset - eyeUp),
        eyeBaseZ,
      );
    }

    if (barbelLRef.current && barbelRRef.current) {
      const sway = reduceMotion ? 0 : Math.sin(state.time * 1.3) * 0.12;
      const barbelOffset = 4.9;
      barbelLRef.current.position.set(head.x + perpX * barbelOffset, head.y + perpY * barbelOffset, head.z - 1);
      barbelRRef.current.position.set(head.x - perpX * barbelOffset, head.y - perpY * barbelOffset, head.z - 1);
      barbelLRef.current.rotation.set(0, 0, heading + Math.PI + 0.35 + sway);
      barbelRRef.current.rotation.set(0, 0, heading + Math.PI - 0.35 - sway);
    }

    // How hard the koi is currently swimming — scales fin/tail motion so a
    // lazy idle drift and a determined swim toward the cursor don't look
    // like the exact same animation at two different speeds.
    const speedFactor = reduceMotion ? 0 : Math.min(state.speed / 85, 1);
    // Framerate-independent exponential smoothing factor for a given lag
    // rate (higher = snappier/less lag, lower = softer/more trailing flex).
    const lagFactor = (rate: number) => (reduceMotion ? 1 : Math.min(1, dt * rate));

    if (!reduceMotion) state.finPhase += (1.7 + speedFactor * 0.3) * dt * Math.PI * 2;

    if (finLRef.current && finRRef.current) {
      const finPoint = spine[3] ?? head;
      finLRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      finRRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);

      // Two very different behaviours blended by speed: near-rest, a koi
      // rows its pectorals independently (opposing phase) to hold station;
      // cruising, they tuck back close to the body and just trail the
      // swimming wave passively. Blending rather than switching means there's
      // no visible mode change as the koi speeds up or slows down.
      const hoverAmt = reduceMotion ? 0 : 1 - speedFactor;
      const cruiseFlap = reduceMotion ? 0 : Math.sin(state.wavePhase * 0.8) * (0.05 + speedFactor * 0.12);
      const targetL = 0.35 + cruiseFlap + Math.sin(state.finPhase) * 0.5 * hoverAmt;
      const targetR = 0.35 + cruiseFlap + Math.sin(state.finPhase + Math.PI) * 0.5 * hoverAmt;
      state.finRotL += (targetL - state.finRotL) * lagFactor(9);
      state.finRotR += (targetR - state.finRotR) * lagFactor(9);
      const tuck = speedFactor * 0.1;
      finLRef.current.rotation.set(Math.PI / 2 + state.finRotL, 0, heading + Math.PI * (0.82 + tuck));
      finRRef.current.rotation.set(-Math.PI / 2 - state.finRotR, 0, heading - Math.PI * (0.82 + tuck));
    }

    if (dorsalRef.current) {
      const dorsalPoint = spine[5] ?? head;
      dorsalRef.current.position.set(dorsalPoint.x, dorsalPoint.y, dorsalPoint.z + 1);
      const targetDorsal = reduceMotion ? 0 : Math.sin(state.wavePhase * 0.8 + 0.6) * (0.03 + speedFactor * 0.05);
      state.dorsalRot += (targetDorsal - state.dorsalRot) * lagFactor(7);
      dorsalRef.current.rotation.set(0, 0, heading + Math.PI / 2 + state.dorsalRot);
    }

    if (tailRef.current) {
      // The tail's angle is derived directly from the body's own traveling
      // wave (the exact same formula buildKoiBody paints onto the mesh),
      // not a separate hand-tuned "swish" sine layered on top — so it reads
      // as one continuous swimming motion instead of the tail visibly
      // running its own independent, repeating cycle disconnected from what
      // the rest of the body is doing.
      //
      // The wave is a *lateral* offset, so it has to be applied along the
      // body's actual local direction at the tail, not the koi's current
      // overall heading — during a turn the tail trails behind through the
      // curved path and can point quite differently from however the head
      // is facing right now. Using the global heading there produced a
      // sharp, unnatural kink between body and tail mid-turn. Estimate the
      // local direction from the tail's own neighboring spine points instead.
      const tBaseIdx = Math.floor(SEG_COUNT * 0.78);
      const baseTanX = spine[tBaseIdx + 1].x - spine[tBaseIdx - 1].x;
      const baseTanY = spine[tBaseIdx + 1].y - spine[tBaseIdx - 1].y;
      const baseTanLen = Math.hypot(baseTanX, baseTanY) || 1;
      const rightBaseX = baseTanY / baseTanLen;
      const rightBaseY = -baseTanX / baseTanLen;

      const tipTanX = tailTip.x - spine[spine.length - 2].x;
      const tipTanY = tailTip.y - spine[spine.length - 2].y;
      const tipTanLen = Math.hypot(tipTanX, tipTanY) || 1;
      const rightTipX = tipTanY / tipTanLen;
      const rightTipY = -tipTanX / tipTanLen;

      const t1 = 1;
      const tBase = tBaseIdx / (SEG_COUNT - 1);
      const waveAmpTail = reduceMotion ? 0 : 4.8 + Math.min(state.speed / 85, 1) * 2.2;

      const targetLateralTip = reduceMotion
        ? 0
        : t1 * t1 * waveAmpTail * Math.sin(WAVE_NUMBER * t1 * Math.PI * 2 - state.wavePhase);
      const targetLateralBase = reduceMotion
        ? 0
        : tBase * tBase * waveAmpTail * Math.sin(WAVE_NUMBER * tBase * Math.PI * 2 - state.wavePhase);

      state.tailLateral += (targetLateralTip - state.tailLateral) * lagFactor(16);
      state.tailLateralBase += (targetLateralBase - state.tailLateralBase) * lagFactor(16);

      const tbX = tailBase.x + rightBaseX * state.tailLateralBase;
      const tbY = tailBase.y + rightBaseY * state.tailLateralBase;
      const ttX = tailTip.x + rightTipX * state.tailLateral;
      const ttY = tailTip.y + rightTipY * state.tailLateral;
      const tailHeading = Math.atan2(ttY - tbY, ttX - tbX);

      tailRef.current.position.set(tbX, tbY, tailBase.z);
      tailRef.current.rotation.set(0, 0, tailHeading);
    }
  });

  return (
    <group>
      <mesh ref={bodyRef} frustumCulled={false}>
        {/*
          Plain standard material — clearcoat/iridescence/sheen (all from
          MeshPhysicalMaterial) each add real per-fragment shader cost, paid
          continuously every frame across the whole body's screen footprint.
          That was a genuine, ongoing performance tax, not a one-time cost.
        */}
        <meshStandardMaterial map={skinTexture} roughness={0.45} metalness={0.02} />
      </mesh>

      <group ref={tailRef}>
        <mesh geometry={tailGeo} material={finMaterial} scale={2.5} />
      </group>
      <group ref={finLRef}>
        <mesh geometry={pectoralGeo} material={finMaterial} scale={2.6} />
      </group>
      <group ref={finRRef}>
        <mesh geometry={pectoralGeo} material={finMaterial} scale={2.6} />
      </group>
      <group ref={dorsalRef}>
        <mesh geometry={dorsalGeo} material={finMaterial} scale={2.5} />
      </group>

      <group ref={eyeLRef}>
        <mesh material={eyeMaterial}>
          <sphereGeometry args={[1.9, 20, 20]} />
        </mesh>
      </group>
      <group ref={eyeRRef}>
        <mesh material={eyeMaterial}>
          <sphereGeometry args={[1.9, 20, 20]} />
        </mesh>
      </group>

      <group ref={barbelLRef}>
        <mesh geometry={barbelGeo} material={barbelMaterial} />
      </group>
      <group ref={barbelRRef}>
        <mesh geometry={barbelGeo} material={barbelMaterial} />
      </group>
    </group>
  );
}
