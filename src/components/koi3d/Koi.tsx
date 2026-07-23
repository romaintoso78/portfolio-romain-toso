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
const RADII = [0, 3.4, 5.6, 7.2, 8, 7.6, 6.4, 4.8, 3.2, 1.8, 0.4];

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

      const stiffness = 85;
      const damping = 11.5;
      const ax = (targetX - state.head.x) * stiffness - state.vel.x * damping;
      const ay = (targetY - state.head.y) * stiffness - state.vel.y * damping;
      state.vel.x += ax * dt;
      state.vel.y += ay * dt;
      state.head.x += state.vel.x * dt;
      state.head.y += state.vel.y * dt;
      state.head.z = Math.sin(state.time * 1.6) * 1.6;

      state.history.unshift(state.head.clone());
      if (state.history.length > HISTORY_MAX) state.history.length = HISTORY_MAX;

      const speed = Math.hypot(state.vel.x, state.vel.y);
      if (speed > 90 && Math.random() < 0.05) {
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

    if (finLRef.current && finRRef.current) {
      const finPoint = spine[2] ?? head;
      finLRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      finRRef.current.position.set(finPoint.x, finPoint.y, finPoint.z);
      const flap = reduceMotion ? 0 : Math.sin(state.time * 5) * 0.25;
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
      const swish = reduceMotion ? 0 : Math.sin(state.time * 3.2) * 0.35;
      tailRef.current.position.set(tailBase.x, tailBase.y, tailBase.z);
      tailRef.current.rotation.set(0, 0, tailHeading + swish);
    }
  });

  const inkColor = useMemo(() => readKoiColors().ink, []);

  return (
    <group>
      <mesh ref={bodyRef}>
        <meshPhysicalMaterial vertexColors roughness={0.35} metalness={0.05} clearcoat={0.5} clearcoatRoughness={0.25} />
      </mesh>

      <group ref={tailRef}>
        <mesh geometry={tailGeo} scale={0.55}>
          <meshStandardMaterial color={inkColor} roughness={0.5} transparent opacity={0.88} side={DoubleSide} />
        </mesh>
      </group>
      <group ref={finLRef}>
        <mesh geometry={finGeo} scale={0.5}>
          <meshStandardMaterial color={inkColor} roughness={0.5} transparent opacity={0.8} side={DoubleSide} />
        </mesh>
      </group>
      <group ref={finRRef}>
        <mesh geometry={finGeo} scale={0.5}>
          <meshStandardMaterial color={inkColor} roughness={0.5} transparent opacity={0.8} side={DoubleSide} />
        </mesh>
      </group>
      <group ref={dorsalRef}>
        <mesh geometry={finGeo} scale={0.4}>
          <meshStandardMaterial color={inkColor} roughness={0.5} transparent opacity={0.75} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
