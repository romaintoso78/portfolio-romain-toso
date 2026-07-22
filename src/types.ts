export interface Profile {
  name: string;
  role: string;
  subtitle: string;
  location: string;
  school: string;
  schoolYear: string;
  company: string;
  contract: string;
  schedule: string;
  availability: string;
  contextLine: string;
  summary: string[];
  email: string;
  github: string;
  linkedin: string;
  cvUrl: string;
}

export interface Mission {
  id: string;
  title: string;
  tagline: string;
  context: string;
  actions: string[];
  tech: string[];
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  location: string;
  missions: Mission[];
}

export interface Project {
  id: string;
  name: string;
  meta?: string;
  featured?: boolean;
  description: string;
  points?: string[];
  tech: string[];
}

export interface SkillCategory {
  category: string;
  items: { label: string; note?: string }[];
  inProgress?: string[];
}

export interface EducationEntry {
  school: string;
  program: string;
  detail: string;
  modules: string[];
  status: string;
}
