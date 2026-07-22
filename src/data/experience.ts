import type { Experience } from "../types";

export const experience: Experience = {
  company: "SOCOTEC",
  role: "Alternant Infrastructure, Équipe Système",
  period: "Septembre 2024 – Septembre 2027",
  location: "Île-de-France",
  missions: [
    {
      id: "agences-3-0",
      title: "Projet Agences 3.0",
      tagline: "Migration d'infrastructure · fil rouge de l'alternance",
      context:
        "Centralisation des serveurs de fichiers de ~130 agences vers un NAS Dell PowerScale unique.",
      actions: [
        "Refonte des GPO Drive Maps dans SYSVOL",
        "Réécriture des scripts de connexion .bat (lecteurs S:, L:, X:, Z:)",
        "Transferts de données pilotés par Robocopy",
        "Scripts PowerShell d'analyse automatisée des logs Robocopy (détection d'échecs, volumétrie, écarts)",
      ],
      tech: ["Dell PowerScale", "Active Directory", "GPO", "SYSVOL", "Robocopy", "PowerShell", "DFS"],
    },
    {
      id: "supervision-centreon",
      title: "Automatisation de la supervision Centreon",
      tagline: "Automatisation · API",
      context: "Suppression de la création manuelle d'hôtes dans l'outil de supervision.",
      actions: [
        "Scripts PowerShell exploitant l'API Centreon v2 et CLAPI",
        "Création automatisée d'hôtes et de services",
        "Réconciliation Active Directory ↔ Centreon (détection des serveurs non supervisés)",
        "Gestion et normalisation des paramètres SNMP",
      ],
      tech: ["Centreon", "API REST v2", "CLAPI", "PowerShell", "SNMP", "Active Directory"],
    },
    {
      id: "dhcp",
      title: "Administration DHCP",
      tagline: "Exploitation · haute disponibilité",
      context: "Gestion du parc DHCP multi-serveurs de l'entreprise.",
      actions: [
        "Administration des serveurs INFRDHCPMUAP01 / INFRDHCPMUAP02",
        "Automatisation de la configuration du failover",
        "Scripting de normalisation des descriptions de scopes",
      ],
      tech: ["Windows Server", "DHCP", "Failover", "PowerShell"],
    },
    {
      id: "veeam",
      title: "Décommissionnement Veeam",
      tagline: "Exploitation · sauvegarde",
      context: "Nettoyage de l'inventaire de sauvegarde après retrait de serveurs.",
      actions: [
        "Retrait des serveurs décommissionnés des repositories",
        "Nettoyage des managed servers et de l'inventaire",
        "Vérification de la cohérence des jobs après suppression",
      ],
      tech: ["Veeam Backup & Replication", "PowerShell"],
    },
    {
      id: "kiosque-almalinux",
      title: "Kiosque de supervision AlmaLinux",
      tagline: "Linux · exploitation",
      context: "Mise en place d'un poste kiosque affichant en continu les dashboards Centreon pour l'équipe exploitation.",
      actions: [
        "Installation et durcissement d'AlmaLinux",
        "Configuration du démarrage automatique en mode kiosque",
        "Affichage permanent des vues Centreon",
      ],
      tech: ["AlmaLinux", "Linux", "Centreon", "Bash"],
    },
    {
      id: "gouvernance-droits",
      title: "Gouvernance des droits et du stockage",
      tagline: "Sécurité · automatisation",
      context: "Remise en conformité des permissions sur le partage réseau principal.",
      actions: [
        "Scripts de remédiation ACL / NTFS sur le partage FR_SITES",
        "Suppressions d'objets ordinateurs AD à grande échelle",
        "Automatisation de la gestion des cibles et chemins DFS",
      ],
      tech: ["ACL", "NTFS", "Active Directory", "DFS", "PowerShell"],
    },
  ],
};
