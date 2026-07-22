import { SectionHeading } from "./ui/SectionHeading";
import { Tag } from "./ui/Tag";
import { Reveal } from "./ui/Reveal";
import { experience } from "../data/experience";

export function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="Expérience" title={`${experience.company} · ${experience.role}`} />
        </Reveal>

        <Reveal>
          <p className="-mt-6 mb-12 font-mono text-xs text-muted">
            {experience.period} · {experience.location}
          </p>
        </Reveal>

        <ol className="relative border-l border-border pl-8">
          {experience.missions.map((mission, i) => (
            <Reveal key={mission.id} delay={i * 0.04}>
              <li className="relative mb-12 last:mb-0">
                <span
                  className="absolute -left-[calc(2rem+4.5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-accent bg-bg"
                  aria-hidden="true"
                />
                <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted">{mission.tagline}</p>
                <h3 className="font-display text-lg font-semibold text-text sm:text-xl">{mission.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{mission.context}</p>
                <ul className="mt-4 space-y-2">
                  {mission.actions.map((action) => (
                    <li key={action} className="flex gap-2.5 text-sm leading-relaxed text-text sm:text-base">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                      {action}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mission.tech.map((tech) => (
                    <Tag key={tech}>{tech}</Tag>
                  ))}
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
