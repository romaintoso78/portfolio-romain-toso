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
    () => new MeshPhysicalMaterial({ roughness: 0.4, transparent: true, opacity: 0.55, side: DoubleSide, clearcoat: 0.3 }),
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
      toTarget: new Vector3(),
      steer: new Vector3(),
      history,
      // Separate from history[0] on purpose: history[0] is overwritten every
      // frame to keep the tip live, so it can't also serve as the "have we
      // moved STEP units yet" baseline — comparing against it would reset
      // that baseline every frame and distance would never accumulate.
      lastCommit: start.clone(),
      time: 0,
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
      const cruiseSpeed = 85;
      const maxAccel = 210;
      const arriveRadius = 70;

      state.toTarget.set(targetX - state.head.x, targetY - state.head.y, 0);
      const dist = state.toTarget.length();
      const desiredSpeed = dist < arriveRadius ? cruiseSpeed * (dist / arriveRadius) : cruiseSpeed;
      if (dist > 1e-3) state.toTarget.multiplyScalar(desiredSpeed / dist);

      state.steer.copy(state.toTarget).sub(state.vel);
      const steerMag = state.steer.length();
      const maxDelta = maxAccel * dt;
      if (steerMag > maxDelta) state.steer.multiplyScalar(maxDelta / steerMag);
      state.vel.add(state.steer);
      if (state.vel.length() > cruiseSpeed) state.vel.setLength(cruiseSpeed);

      state.head.x += state.vel.x * dt;
      state.head.y += state.vel.y * dt;
      state.head.z = Math.sin(state.time * 1.1) * 1.4;

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
      geometryRef.current = buildKoiBody(spine, RADII, geometryRef.current);
      if (bodyRef.current) bodyRef.current.geometry = geometryRef.current;
    } catch (err) {
      console.error("buildKoiBody failed", err);
    }

    const head = spine[0];
    const neck = spine[1] ?? head;
    const tailBase = spine[Math.floor(SEG_COUNT * 0.78)] ?? spine[spine.length - 1];
    const tailTip = spine[spine.length - 1];
    const heading = Math.atan2(head.y - neck.y, head.x - neck.x);

    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    const dlen = Math.hypot(dx, dy) || 1;
    const fwdX = dx / dlen;
    const fwdY = dy / dlen;
    const perpX = -dy / dlen;
    const perpY = dx / dlen;

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

    if (finLRef.current && finRRef.current) {
      const finPoint = spine[3] ?? head;
      finLRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      finRRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      const flap = reduceMotion ? 0 : Math.sin(state.time * 2.2) * 0.18;
      finLRef.current.rotation.set(Math.PI / 2 + 0.35 + flap, 0, heading + Math.PI * 0.82);
      finRRef.current.rotation.set(-Math.PI / 2 - 0.35 - flap, 0, heading - Math.PI * 0.82);
    }

    if (dorsalRef.current) {
      const dorsalPoint = spine[5] ?? head;
      dorsalRef.current.position.set(dorsalPoint.x, dorsalPoint.y, dorsalPoint.z + 1);
      dorsalRef.current.rotation.set(0, 0, heading + Math.PI / 2);
    }

    if (tailRef.current) {
      const tx = tailTip.x - tailBase.x;
      const ty = tailTip.y - tailBase.y;
      const tailHeading = Math.atan2(ty, tx);
      const swish = reduceMotion ? 0 : Math.sin(state.time * 1.7) * 0.3;
      tailRef.current.position.set(tailBase.x, tailBase.y, tailBase.z);
      tailRef.current.rotation.set(0, 0, tailHeading + swish);
    }
  });

  return (
    <group>
      <mesh ref={bodyRef}>
        <meshPhysicalMaterial
          map={skinTexture}
          roughness={0.4}
          metalness={0.02}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          iridescence={0.2}
          iridescenceIOR={1.3}
        />
      </mesh>

      <group ref={tailRef}>
        <mesh geometry={tailGeo} material={finMaterial} scale={2.7} />
      </group>
      <group ref={finLRef}>
        <mesh geometry={pectoralGeo} material={finMaterial} scale={2.3} />
      </group>
      <group ref={finRRef}>
        <mesh geometry={pectoralGeo} material={finMaterial} scale={2.3} />
      </group>
      <group ref={dorsalRef}>
        <mesh geometry={dorsalGeo} material={finMaterial} scale={2.3} />
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
