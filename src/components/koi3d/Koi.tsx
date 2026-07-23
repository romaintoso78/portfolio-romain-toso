import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { buildKoiBody } from "./koiGeometry";
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
  const finMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        roughness: 0.4,
        transparent: true,
        opacity: 0.55,
        side: DoubleSide,
        clearcoat: 0.3,
        sheen: 0.6,
        sheenRoughness: 0.35,
        sheenColor: 0xffffff,
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
      // Smoothed (lagged) rotation values for tail/fins/dorsal — a fin is a
      // soft, flexible membrane, not a rigid plate snapping to a target
      // angle every frame. Chasing the target with exponential smoothing
      // gives it inertia/flex instead of a robotic instant response.
      tailRot: 0,
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
    state.idleTarget.set(
      (Math.random() - 0.5) * size.width * 0.7,
      (Math.random() - 0.5) * size.height * 0.55,
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
      if (state.mouse.active && idleFor < 4500) {
        targetX = state.mouse.x;
        targetY = state.mouse.y;
      } else {
        state.idleTimer -= dt;
        if (state.idleTimer <= 0) {
          pickIdleTarget();
          state.idleTimer = 3 + Math.random() * 3;
        }
        targetX = state.idleTarget.x;
        targetY = state.idleTarget.y;
      }

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
        // affect the distFromLast baseline above (that's lastCommit).
        state.history[0] = state.head.clone();
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
      const eyeOffset = 7.4;
      const eyeForward = 4.9;
      eyeLRef.current.position.set(head.x + fwdX * eyeForward + perpX * eyeOffset, head.y + fwdY * eyeForward + perpY * eyeOffset, head.z);
      eyeRRef.current.position.set(head.x + fwdX * eyeForward - perpX * eyeOffset, head.y + fwdY * eyeForward - perpY * eyeOffset, head.z);
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
      const tx = tailTip.x - tailBase.x;
      const ty = tailTip.y - tailBase.y;
      const tailHeading = Math.atan2(ty, tx);
      // Synced to the same traveling wave as the body (not an independent
      // sine) so the tail fin reads as part of the same swimming motion
      // instead of wagging on its own separate rhythm. A short lag on top
      // gives the fin a touch of flex/whip rather than tracking the wave
      // rigidly.
      const targetSwish = reduceMotion ? 0 : Math.sin(state.wavePhase) * (0.18 + speedFactor * 0.22);
      state.tailRot += (targetSwish - state.tailRot) * lagFactor(16);
      tailRef.current.position.set(tailBase.x, tailBase.y, tailBase.z);
      tailRef.current.rotation.set(0, 0, tailHeading + state.tailRot);
    }
  });

  return (
    <group>
      <mesh ref={bodyRef} frustumCulled={false}>
        <meshPhysicalMaterial
          map={skinTexture}
          roughness={0.4}
          metalness={0.02}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          iridescence={0.2}
          iridescenceIOR={1.3}
          sheen={0.4}
          sheenRoughness={0.5}
          sheenColor={0xffffff}
        />
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
          <sphereGeometry args={[1.9, 12, 12]} />
        </mesh>
      </group>
      <group ref={eyeRRef}>
        <mesh material={eyeMaterial}>
          <sphereGeometry args={[1.9, 12, 12]} />
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
