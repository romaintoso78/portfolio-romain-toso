import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Group, Mesh, Vector3 } from "three";
import { buildKoiBody } from "./koiGeometry";
import { tailFinGeometry, pectoralFinGeometry, dorsalFinGeometry, barbelGeometry } from "./finGeometry";
import { readKoiColors } from "./colors";
import { buildKoiSkinTexture } from "./skinTexture";
import type { RippleSpawner } from "./Ripples";

const SEG_COUNT = 14;
const LAG = 4;
const HISTORY_MAX = SEG_COUNT * LAG + 20;
// Blunt rounded head, thick midsection, a pinched peduncle just before the
// tail fin — a smooth torpedo taper reads more like a slug than a fish.
const RADII = [
  1.4, 4.6, 6.8, 7.9, 8.2, 8, 7.4, 6.4, 5.2, 3.8, 2.4, 1.4, 0.9, 0.4,
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
  const barbelGeo = useMemo(() => barbelGeometry(6), []);
  const skinTexture = useMemo(() => buildKoiSkinTexture(readKoiColors()), []);

  // The skin texture is painted once onto a canvas — repaint it in place
  // (same texture instance, same patch layout) whenever the theme toggles,
  // otherwise the koi's colors would freeze at whatever theme was active
  // when it first mounted.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      buildKoiSkinTexture(readKoiColors(), 1, skinTexture);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [skinTexture]);

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

    geometryRef.current = buildKoiBody(spine, RADII, geometryRef.current);
    if (bodyRef.current) bodyRef.current.geometry = geometryRef.current;

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
      const eyeOffset = 2.7;
      const eyeForward = 1.8;
      eyeLRef.current.position.set(head.x + fwdX * eyeForward + perpX * eyeOffset, head.y + fwdY * eyeForward + perpY * eyeOffset, head.z);
      eyeRRef.current.position.set(head.x + fwdX * eyeForward - perpX * eyeOffset, head.y + fwdY * eyeForward - perpY * eyeOffset, head.z);
    }

    if (barbelLRef.current && barbelRRef.current) {
      const sway = reduceMotion ? 0 : Math.sin(state.time * 1.3) * 0.12;
      const barbelOffset = 1.8;
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

  const inkColor = useMemo(() => readKoiColors().ink, []);
  const finColor = useMemo(() => readKoiColors().paper, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const c = readKoiColors();
      inkColor.copy(c.ink);
      finColor.copy(c.paper);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [inkColor, finColor]);

  return (
    <group>
      <mesh ref={bodyRef}>
        <meshPhysicalMaterial
          map={skinTexture}
          roughness={0.32}
          metalness={0.03}
          clearcoat={0.65}
          clearcoatRoughness={0.18}
          iridescence={0.3}
          iridescenceIOR={1.3}
        />
      </mesh>

      <group ref={tailRef}>
        <mesh geometry={tailGeo} scale={0.95}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.6} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={finLRef}>
        <mesh geometry={pectoralGeo} scale={0.85}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.55} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={finRRef}>
        <mesh geometry={pectoralGeo} scale={0.85}>
          <meshPhysicalMaterial color={finColor} roughness={0.4} transparent opacity={0.55} side={DoubleSide} clearcoat={0.3} />
        </mesh>
      </group>
      <group ref={dorsalRef}>
        <mesh geometry={dorsalGeo} scale={0.85}>
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

      <group ref={barbelLRef}>
        <mesh geometry={barbelGeo}>
          <meshStandardMaterial color={finColor} roughness={0.5} />
        </mesh>
      </group>
      <group ref={barbelRRef}>
        <mesh geometry={barbelGeo}>
          <meshStandardMaterial color={finColor} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
