# Portfolio — Romain Toso

Portfolio professionnel monopage. Vitrine d'un profil infrastructure IT en transition vers le DevOps, avec la cybersécurité comme différenciateur.

## Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS v4
- Framer Motion (motion minimale, scroll reveals)
- lucide-react (icônes)
- Polices self-hébergées via `@fontsource` (Archivo, Inter, JetBrains Mono)

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview   # prévisualiser le build de prod
```

## Où éditer le contenu

Tout le contenu est externalisé dans `src/data/` — aucun texte en dur dans les composants :

| Fichier | Contenu |
|---|---|
| `src/data/profile.ts` | Identité, liens (email, GitHub, LinkedIn), CV |
| `src/data/experience.ts` | Missions SOCOTEC |
| `src/data/projects.ts` | Projets école et personnels |
| `src/data/skills.ts` | Compétences par catégorie |
| `src/data/education.ts` | Parcours ESGI |

Pour ajouter une mission ou un projet, il suffit d'ajouter une entrée dans le fichier concerné — aucune modification de composant nécessaire.

## À compléter avant mise en ligne

- [ ] `src/data/profile.ts` : remplacer `email`, `github`, `linkedin` (actuellement des `TODO_...`)
- [ ] Déposer le CV dans `public/cv-romain-toso.pdf` (référencé par le bouton "Télécharger le CV")
- [ ] Optionnel : `public/avatar.jpg` si une photo de profil est ajoutée
- [ ] Optionnel : `public/og-image.png` (1200×630) pour un aperçu de partage social — voir le commentaire dans `index.html`
- [ ] Remplacer `TODO-DOMAIN.vercel.app` dans `index.html`, `public/robots.txt` et `public/sitemap.xml` par le nom de domaine réel une fois connu
- [ ] Si un formulaire Formspree est utilisé : copier `.env.example` vers `.env` et renseigner `VITE_FORMSPREE_ENDPOINT` (sans endpoint configuré, le formulaire retombe sur un `mailto:` vers l'adresse de `profile.ts`)

## Déploiement (Vercel)

1. Connecter le dépôt GitHub sur [vercel.com/new](https://vercel.com/new)
2. Framework preset : **Vite** (détecté automatiquement)
3. Build command : `npm run build` — Output directory : `dist`
4. Ajouter la variable d'environnement `VITE_FORMSPREE_ENDPOINT` si un formulaire Formspree est utilisé
5. Déployer — Vercel fournit une URL `*.vercel.app`, ou un domaine personnalisé si configuré

## Qualité

- TypeScript strict, aucune dépendance UI lourde, aucun state manager
- Cible Lighthouse ≥ 95 sur Performance / Accessibilité / Bonnes pratiques / SEO
- `prefers-reduced-motion: reduce` désactive toutes les animations
- Landmarks sémantiques, focus clavier visible, contrastes AA/AAA
