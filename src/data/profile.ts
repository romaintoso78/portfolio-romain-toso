import type { Profile } from "../types";

export const profile: Profile = {
  name: "Romain Toso",
  role: "Apprenti Ingénieur Infrastructure & Cybersécurité",
  subtitle: "En route vers le DevOps / Platform Engineering",
  location: "Île-de-France (Guyancourt)",
  school: "ESGI Paris — Cycle Bac+5 Cybersécurité",
  schoolYear: "3e année en cours, spécialisation DevOps",
  company: "SOCOTEC — Équipe Système",
  contract: "Alternance 3 ans, jusqu'à septembre 2027",
  schedule: "3 jours entreprise (lun–mer) / 2 jours école (jeu–ven)",
  availability: "Poste à pourvoir à partir de septembre 2027",
  contextLine: "SOCOTEC · Équipe Système · ~130 sites supervisés",
  summary: [
    "Alternant infrastructure chez SOCOTEC, groupe français du TIC présent sur plus de 130 agences en France, au sein de l'équipe Système.",
    "Automatise systématiquement plutôt que de cliquer : scripts PowerShell, API Centreon, pipelines CI/CD pour fiabiliser l'exploitation quotidienne.",
    "Conçoit également des architectures complètes de zéro, de la maquette réseau à la mise en production, avec la sécurité comme fil conducteur.",
    "Objectif : un poste DevOps / Platform Engineer à l'issue du Bac+5, en septembre 2027.",
  ],
  email: "rominet340@gmail.com",
  github: "https://github.com/romaintoso78",
  // TODO: renseigner le profil LinkedIn une fois disponible — le lien
  // reste masqué tant que ce champ est vide (voir Hero.tsx / Contact.tsx).
  linkedin: undefined,
  // TODO: déposer public/cv-romain-toso.pdf puis remettre cette valeur —
  // le bouton "Télécharger le CV" reste masqué tant que ce champ est vide.
  cvUrl: undefined,
};
