import { SectionHeading } from "./ui/SectionHeading";
import { Tag } from "./ui/Tag";
import { Reveal } from "./ui/Reveal";
import { education } from "../data/education";

export function Education() {
  return (
    <section id="formation" aria-labelledby="formation-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="Parcours" title="Formation" />
        </Reveal>

        <Reveal>
          <ol className="relative border-l border-border pl-8">
            <li className="relative">
              <span
                className="absolute -left-[calc(2rem+4.5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-accent bg-bg"
                aria-hidden="true"
              />
              <h3 className="font-display text-lg font-semibold text-text sm:text-xl">{education.school}</h3>
              <p className="mt-1 text-sm font-medium text-text sm:text-base">{education.program}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{education.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {education.modules.map((m) => (
                  <Tag key={m}>{m}</Tag>
                ))}
              </div>
              <p className="mt-4 font-mono text-xs text-accent">{education.status}</p>
            </li>
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
