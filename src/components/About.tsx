import { SectionHeading } from "./ui/SectionHeading";
import { Reveal } from "./ui/Reveal";
import { profile } from "../data/profile";

export function About() {
  return (
    <section id="profil" aria-labelledby="profil-heading" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="À propos" title="Profil" />
        </Reveal>
        <div className="space-y-4">
          {profile.summary.map((line, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-base leading-relaxed text-text sm:text-lg">{line}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
