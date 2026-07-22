import { useScrollProgress } from "../hooks/useScrollProgress";
import { useSectionPositions } from "../hooks/useSectionPositions";

interface StatusRailProps {
  sections: { id: string; label: string }[];
  activeId: string;
}

export function StatusRail({ sections, activeId }: StatusRailProps) {
  const progress = useScrollProgress();
  const positions = useSectionPositions(sections.map((s) => s.id));

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Progression de la page"
      className="fixed left-4 top-0 z-40 hidden h-screen w-8 lg:flex lg:items-center xl:left-8"
    >
      <div className="relative h-[60vh] w-px bg-border">
        <div
          className="absolute left-0 top-0 w-px bg-accent transition-[height] duration-150 ease-out"
          style={{ height: `${Math.min(progress * 100, 100)}%` }}
        />
        {sections.map((section) => {
          const top = (positions[section.id] ?? 0) * 100;
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollTo(section.id)}
              aria-label={`Aller à la section ${section.label}`}
              aria-current={isActive ? "true" : undefined}
              className="group absolute -left-[7px] flex h-4 w-4 -translate-y-1/2 items-center justify-center"
              style={{ top: `${top}%` }}
            >
              <span
                className={`h-2 w-2 rounded-full border transition-all duration-200 ${
                  isActive
                    ? "scale-125 border-accent bg-accent"
                    : "border-muted bg-bg group-hover:border-accent"
                }`}
              />
              <span className="pointer-events-none absolute left-5 whitespace-nowrap border border-border bg-surface px-2 py-1 font-mono text-xs text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
