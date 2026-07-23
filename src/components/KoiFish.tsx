import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight, PointLight } from "three";
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

  const ambientRef = useRef<AmbientLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);
  const pointRef = useRef<PointLight>(null);

  // Light colors are only set once by the `color` prop above — mutating the
  // referenced object afterwards doesn't reach the mounted light, so without
  // this the scene stayed lit with whichever theme was active on first
  // paint. Update the actual light instances directly when the theme toggles.
  useEffect(() => {
    const update = () => {
      const c = readKoiColors();
      ambientRef.current?.color.copy(c.ink);
      directionalRef.current?.color.copy(c.gold);
      pointRef.current?.color.copy(c.shu);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 1 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight ref={ambientRef} intensity={0.55} color={colors.ink} />
        <directionalLight ref={directionalRef} position={[80, 120, 140]} intensity={1.4} color={colors.gold} />
        <pointLight ref={pointRef} position={[-100, -60, 60]} intensity={0.5} color={colors.shu} />

        <Koi reduceMotion={reduceMotion} spawnerRef={spawnerRef} />
        <Ripples spawnerRef={spawnerRef} />
      </Canvas>
    </div>
  );
}
