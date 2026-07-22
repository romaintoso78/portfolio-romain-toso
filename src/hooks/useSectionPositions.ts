import { useEffect, useState } from "react";

export function useSectionPositions(sectionIds: string[]) {
  const [positions, setPositions] = useState<Record<string, number>>({});
  // sectionIds is re-created on every render by callers; key on its content
  // instead of its reference so this effect doesn't recompute on every render.
  const sectionIdsKey = sectionIds.join("|");

  useEffect(() => {
    const ids = sectionIdsKey.split("|").filter(Boolean);

    const compute = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;

      const next: Record<string, number> = {};
      ids.forEach((id) => {
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
  }, [sectionIdsKey]);

  return positions;
}
