import type { SkillCategory } from "../types";

export const skills: SkillCategory[] = [
  {
    category: "Systèmes",
    items: [
      { label: "Windows Server" },
      { label: "Active Directory" },
      { label: "GPO" },
      { label: "DHCP" },
      { label: "DFS" },
      { label: "ACL / NTFS" },
      { label: "Debian" },
      { label: "AlmaLinux" },
    ],
  },
  {
    category: "Scripting & Automatisation",
    items: [
      { label: "PowerShell", note: "avancé" },
      { label: "Bash" },
      { label: "Python" },
      { label: "Go" },
      { label: "Java" },
    ],
  },
  {
    category: "Développement",
    items: [{ label: "JavaScript" }, { label: "PHP" }, { label: "SQL" }],
  },
  {
    category: "Réseau & Sécurité",
    items: [
      { label: "pfSense" },
      { label: "OPNsense" },
      { label: "CARP" },
      { label: "OpenVPN" },
      { label: "VLAN" },
      { label: "802.1X" },
      { label: "Hardening" },
      { label: "OSINT" },
      { label: "Pentest" },
    ],
  },
  {
    category: "Supervision & Sauvegarde",
    items: [
      { label: "Centreon", note: "API v2, CLAPI" },
      { label: "Grafana" },
      { label: "Veeam Backup & Replication" },
      { label: "TrueNAS" },
    ],
  },
  {
    category: "DevOps & Cloud",
    items: [
      { label: "Docker" },
      { label: "GitHub Actions" },
      { label: "Azure DevOps" },
      { label: "Azure" },
      { label: "Proxmox" },
      { label: "VMware" },
      { label: "EVE-NG" },
    ],
    inProgress: ["Kubernetes (CKA)", "Terraform", "GitOps", "Platform Engineering"],
  },
  {
    category: "Outils",
    items: [{ label: "Git" }, { label: "GLPI" }, { label: "Teleport" }],
  },
  {
    category: "Soft skills",
    items: [
      { label: "Communication" },
      { label: "Esprit d'équipe" },
      { label: "Autonomie" },
      { label: "Esprit critique" },
      { label: "Créativité" },
      { label: "Empathie" },
    ],
  },
  {
    category: "Langues",
    items: [
      { label: "Anglais", note: "B2" },
      { label: "Espagnol", note: "A2" },
    ],
  },
];
