import { SectionHeading } from "./ui/SectionHeading";
import { Tag } from "./ui/Tag";
import { Reveal } from "./ui/Reveal";
import { skills } from "../data/skills";

export function Skills() {
  return (
    <section id="competences" aria-labelledby="competences-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <SectionHeading eyebrow="Savoir-faire" title="Compétences" />
        </Reveal>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((group, i) => (
            <Reveal key={group.category} delay={(i % 3) * 0.05}>
              <div>
                <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-muted">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Tag key={item.label} note={item.note}>
                      {item.label}
                    </Tag>
                  ))}
                  {group.inProgress?.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded border border-dashed border-warm/50 bg-warm/5 px-2.5 py-1 font-mono text-xs text-warm"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
