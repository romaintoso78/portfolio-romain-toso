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
      { label: "EVE-NG" },
    ],
    inProgress: ["Kubernetes (CKA)", "Terraform", "GitOps", "Platform Engineering"],
  },
  {
    category: "Outils",
    items: [{ label: "Git" }, { label: "GLPI" }, { label: "Teleport" }],
  },
];
