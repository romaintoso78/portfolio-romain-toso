import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Group, Mesh, Vector3 } from "three";
import { buildKoiBody } from "./koiGeometry";
import { tailFinGeometry, sideFinGeometry } from "./finGeometry";
import { readKoiColors } from "./colors";
import type { RippleSpawner } from "./Ripples";

const SEG_COUNT = 11;
const LAG = 4;
const HISTORY_MAX = SEG_COUNT * LAG + 20;
// Blunt rounded head, thick midsection, a pinched peduncle just before the
// tail fin — a smooth torpedo taper reads more like a slug than a fish.
const RADII = [1.1, 4.4, 6.6, 7.8, 8, 7.2, 5.6, 3.6, 1.9, 1.1, 0.5];

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
  const geometryRef = useRef<BufferGeometry | undefined>(undefined);

  const tailGeo = useMemo(() => tailFinGeometry(), []);
  const finGeo = useMemo(() => sideFinGeometry(), []);

  const state = useMemo(() => {
    const start = new Vector3(0, 0, 0);
    // Under reduced motion the physics loop never runs, so seed a static
    // resting curve here — otherwise the koi would never have enough
    // history to build a body and would simply never appear.
    const history: Vector3[] = reduceMotion
      ? Array.from(
          { length: HISTORY_MAX },
          (_, i) => new Vector3(-i * 2.4, Math.sin(i * 0.28) * 6, 0),
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

      state.history.unshift(state.head.clone());
      if (state.history.length > HISTORY_MAX) state.history.length = HISTORY_MAX;

      const speed = state.vel.length();
      if (speed > cruiseSpeed * 0.7 && Math.random() < 0.03) {
        spawnerRef.current?.spawn(state.head.x, state.head.y);
      }
    }

    if (state.history.length < 2) return;

    const spine: Vector3[] = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const idx = Math.min(i * LAG, state.history.length - 1);
      spine.push(state.history[idx]);
    }

    const colors = readKoiColors();
    geometryRef.current = buildKoiBody(spine, RADII, colors, geometryRef.current);
    if (bodyRef.current) bodyRef.current.geometry = geometryRef.current;

    const head = spine[0];
    const neck = spine[1] ?? head;
    const tailBase = spine[Math.floor(SEG_COUNT * 0.72)] ?? spine[spine.length - 1];
    const tailTip = spine[spine.length - 1];
    const heading = Math.atan2(head.y - neck.y, head.x - neck.x);

    if (eyeLRef.current && eyeRRef.current) {
      const dx = head.x - neck.x;
      const dy = head.y - neck.y;
      const len = Math.hypot(dx, dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;
      const eyeOffset = 2.6;
      const eyeForward = 1.5;
      eyeLRef.current.position.set(
        head.x + (dx / len) * eyeForward + perpX * eyeOffset,
        head.y + (dy / len) * eyeForward + perpY * eyeOffset,
        head.z,
      );
      eyeRRef.current.position.set(
        head.x + (dx / len) * eyeForward - perpX * eyeOffset,
        head.y + (dy / len) * eyeForward - perpY * eyeOffset,
        head.z,
      );
    }

    if (finLRef.current && finRRef.current) {
      const finPoint = spine[2] ?? head;
      finLRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      finRRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      const flap = reduceMotion ? 0 : Math.sin(state.time * 2.4) * 0.16;
      finLRef.current.rotation.set(Math.PI / 2 + 0.3 + flap, 0, heading + Math.PI * 0.85);
      finRRef.current.rotation.set(-Math.PI / 2 - 0.3 - flap, 0, heading - Math.PI * 0.85);
    }

    if (dorsalRef.current) {
      const dorsalPoint = spine[4] ?? head;
      dorsalRef.current.position.set(dorsalPoint.x, dorsalPoint.y, dorsalPoint.z);
      dorsalRef.current.rotation.set(0, 0, heading + Math.PI / 2);
    }

    if (tailRef.current) {
      const tx = tailTip.x - tailBase.x;
      const ty = tailTip.y - tailBase.y;
      const tailHeading = Math.atan2(ty, tx);
      const swish = reduceMotion ? 0 : Math.sin(state.time * 1.7) * 0.28;
      tailRef.current.position.set(tailBase.x, tailBase.y, tailBase.z);
      tailRef.current.rotation.set(0, 0, tailHeading + swish);
    }
  });

  const inkColor = useMemo(() => readKoiColors().ink, []);
  const finColor = useMemo(() => readKoiColors().paper, []);

  return (
    <group>
      <mesh ref={bodyRef}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.3}
          metalness={0.04}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
          iridescence={0.35}
          iridescenceIOR={1.3}
        />
      </mesh>

      <group ref={tailRef}>
        <mesh geometry={tailGeo} scale={0.6}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.55} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={finLRef}>
        <mesh geometry={finGeo} scale={0.55}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.5} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={finRRef}>
        <mesh geometry={finGeo} scale={0.55}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.5} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={dorsalRef}>
        <mesh geometry={finGeo} scale={0.42}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.5} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>

      <group ref={eyeLRef}>
        <mesh>
          <sphereGeometry args={[1.3, 12, 12]} />
          <meshStandardMaterial color={inkColor} roughness={0.15} metalness={0.1} />
        </mesh>
      </group>
      <group ref={eyeRRef}>
        <mesh>
          <sphereGeometry args={[1.3, 12, 12]} />
          <meshStandardMaterial color={inkColor} roughness={0.15} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
}
