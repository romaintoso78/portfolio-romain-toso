import { motion, useReducedMotion } from "framer-motion";
import { Download, ArrowDown } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./ui/icons";
import { profile } from "../data/profile";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.09 },
    },
  };

  const item = {
    hidden: prefersReducedMotion ? {} : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
  };

  const scrollToProjects = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("projets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="hero"
      aria-label="Introduction"
      className="flex min-h-screen flex-col justify-center px-5 pt-14 sm:px-8"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl"
      >
        <motion.p variants={item} className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-muted">
          {profile.role}
        </motion.p>

        <motion.h1
          variants={item}
          className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl"
        >
          {profile.name}
        </motion.h1>

        <motion.p variants={item} className="mt-4 font-display text-lg text-muted sm:text-xl">
          {profile.subtitle}
        </motion.p>

        <motion.p variants={item} className="mt-6 font-mono text-sm text-accent">
          {profile.contextLine}
        </motion.p>

        <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#projets"
            onClick={scrollToProjects}
            className="inline-flex items-center rounded border border-accent bg-accent/10 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-accent/20"
          >
            Voir les projets
          </a>
          <a
            href={profile.cvUrl}
            download
            className="inline-flex items-center gap-2 rounded border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent"
          >
            <Download size={16} aria-hidden="true" />
            Télécharger le CV
          </a>

          <div className="ml-auto flex items-center gap-3">
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              aria-label="Profil GitHub de Romain Toso"
              className="flex h-10 w-10 items-center justify-center rounded border border-border text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <GithubIcon size={18} />
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="Profil LinkedIn de Romain Toso"
              className="flex h-10 w-10 items-center justify-center rounded border border-border text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <LinkedinIcon size={18} />
            </a>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="mx-auto mt-16 flex w-full max-w-3xl justify-start"
      >
        <ArrowDown size={16} className="text-muted" aria-hidden="true" />
      </motion.div>
    </section>
  );
}
