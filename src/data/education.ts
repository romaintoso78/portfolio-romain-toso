import type { EducationEntry } from "../types";

export const education: EducationEntry[] = [
  {
    school: "ESGI Paris",
    program: "Cycle Bac+5 Expert en Ingénierie Informatique",
    period: "2024 – 2027 (en cours)",
    detail: "Spécialisation Cybersécurité, orientation DevOps en 3e année.",
    modules: [
      "Kubernetes",
      "Terraform",
      "GitOps",
      "Platform Engineering",
      "Sécurité offensive",
      "Réseaux",
    ],
    status: "En cours, diplôme visé : septembre 2027.",
  },
  {
    school: "ESGI Paris",
    program: "Bachelor Informatique générale",
    period: "Diplômé en 2024",
    detail: "Spécialisations Infrastructure (Systèmes et Réseaux), Développement Web et Cybersécurité.",
    modules: ["Systèmes et Réseaux", "Développement Web (HTML/PHP/CSS/JS)", "Cybersécurité"],
  },
  {
    school: "Lycée Alain, Le Vésinet",
    program: "Baccalauréat général — Mathématiques et NSI",
    period: "2019 – 2022",
  },
];
