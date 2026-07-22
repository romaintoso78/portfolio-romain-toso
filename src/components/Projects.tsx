import { SectionHeading } from "./ui/SectionHeading";
import { Card } from "./ui/Card";
import { Tag } from "./ui/Tag";
import { Reveal } from "./ui/Reveal";
import { projects } from "../data/projects";

export function Projects() {
  return (
    <section id="projets" aria-labelledby="projets-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <SectionHeading id="projets-heading" eyebrow="Réalisations" title="Projets" />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={(i % 2) * 0.05} className={project.featured ? "sm:col-span-2" : ""}>
              <Card wide={project.featured}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-text sm:text-xl">{project.name}</h3>
                  {project.featured && (
                    <span className="rounded border border-warm/40 bg-warm/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-warm">
                      Projet phare
                    </span>
                  )}
                </div>
                {project.meta && <p className="mt-1 font-mono text-xs text-muted">{project.meta}</p>}
                <p className="mt-4 text-sm leading-relaxed text-text sm:text-base">{project.description}</p>

                {project.points && (
                  <ul
                    className={`mt-4 grid gap-x-6 gap-y-2 ${
                      project.featured ? "sm:grid-cols-2" : ""
                    }`}
                  >
                    {project.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <Tag key={tech}>{tech}</Tag>
                  ))}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
