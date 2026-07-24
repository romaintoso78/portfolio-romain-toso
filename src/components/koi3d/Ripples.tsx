import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { readKoiColors } from "./colors";

const MAX_RIPPLES = 6;

interface RippleState {
  x: number;
  y: number;
  r: number;
  alpha: number;
  active: boolean;
}

export interface RippleSpawner {
  spawn: (x: number, y: number) => void;
}

export function Ripples({ spawnerRef }: { spawnerRef: React.MutableRefObject<RippleSpawner | null> }) {
  const groupRef = useRef<Group>(null);
  const ripples = useMemo<RippleState[]>(
    () => Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, r: 0.1, alpha: 0, active: false })),
    [],
  );

  spawnerRef.current = {
    spawn(x: number, y: number) {
      const slot = ripples.find((r) => !r.active) ?? ripples[0];
      slot.x = x;
      slot.y = y;
      slot.r = 0.5;
      slot.alpha = 0.4;
      slot.active = true;
    },
  };

  const geometry = useMemo(() => new RingGeometry(0.85, 1, 32), []);
  // getComputedStyle (inside readKoiColors) forces a style recalculation —
  // fine once, but calling it every frame in the render loop was a real
  // stutter source. Cache it and only re-read on an actual theme change.
  const goldRef = useRef<Color>(readKoiColors().gold);

  useEffect(() => {
    const update = () => goldRef.current.copy(readKoiColors().gold);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    if (!groupRef.current) return;
    const gold = goldRef.current;

    groupRef.current.children.forEach((child, i) => {
      const ripple = ripples[i];
      const mesh = child as Mesh;
      if (!ripple.active) {
        mesh.visible = false;
        return;
      }
      ripple.r += 12 * dt;
      ripple.alpha -= 0.45 * dt;
      if (ripple.alpha <= 0) {
        ripple.active = false;
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.set(ripple.x, ripple.y, -0.5);
      mesh.scale.setScalar(ripple.r);
      const mat = mesh.material as MeshBasicMaterial;
      mat.opacity = Math.max(ripple.alpha, 0);
      mat.color.copy(gold);
    });
  });

  return (
    <group ref={groupRef}>
      {ripples.map((_, i) => (
        <mesh key={i} geometry={geometry} visible={false}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
