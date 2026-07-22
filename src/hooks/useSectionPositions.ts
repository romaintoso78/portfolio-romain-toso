import { useEffect, useState } from "react";

export function useSectionPositions(sectionIds: string[]) {
  const [positions, setPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    const compute = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;

      const next: Record<string, number> = {};
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          next[id] = el.offsetTop / scrollable;
        }
      });
      setPositions(next);
    };

    compute();
    window.addEventListener("resize", compute);
    const timeout = window.setTimeout(compute, 300);
    return () => {
      window.removeEventListener("resize", compute);
      window.clearTimeout(timeout);
    };
  }, [sectionIds]);

  return positions;
}
