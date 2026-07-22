import { SectionHeading } from "./ui/SectionHeading";
import { Tag } from "./ui/Tag";
import { Reveal } from "./ui/Reveal";
import { education } from "../data/education";

export function Education() {
  return (
    <section id="formation" aria-labelledby="formation-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading id="formation-heading" eyebrow="Parcours" title="Formation" />
        </Reveal>

        <ol className="relative border-l border-border pl-8">
          {education.map((entry, i) => (
            <Reveal key={`${entry.school}-${entry.program}`} delay={i * 0.05}>
              <li className="relative mb-12 last:mb-0">
                <span
                  className="absolute -left-[calc(2rem+4.5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-accent bg-bg"
                  aria-hidden="true"
                />
                <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">{entry.period}</p>
                <h3 className="font-display text-lg font-semibold text-text sm:text-xl">{entry.school}</h3>
                <p className="mt-1 text-sm font-medium text-text sm:text-base">{entry.program}</p>
                {entry.detail && (
                  <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{entry.detail}</p>
                )}
                {entry.modules && entry.modules.length > 0 && (
                  <>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-muted">
                      Modules du cursus
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.modules.map((m) => (
                        <Tag key={m}>{m}</Tag>
                      ))}
                    </div>
                  </>
                )}
                {entry.status && <p className="mt-4 font-mono text-xs text-accent">{entry.status}</p>}
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
