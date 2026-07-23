import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Koi } from "./koi3d/Koi";
import { Ripples, type RippleSpawner } from "./koi3d/Ripples";
import { readKoiColors } from "./koi3d/colors";

export function KoiFish() {
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const spawnerRef = useRef<RippleSpawner | null>(null);
  const colors = useMemo(() => readKoiColors(), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 1 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.55} color={colors.ink} />
        <directionalLight position={[80, 120, 140]} intensity={1.4} color={colors.gold} />
        <pointLight position={[-100, -60, 60]} intensity={0.5} color={colors.shu} />

        <Koi reduceMotion={reduceMotion} spawnerRef={spawnerRef} />
        <Ripples spawnerRef={spawnerRef} />
      </Canvas>
    </div>
  );
}
