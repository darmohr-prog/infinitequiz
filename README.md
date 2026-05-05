# Infinité Quiz

Quiz adaptatif généré par IA — 50 questions, 5 niveaux, calibré pour les 14 ans.  
Le niveau s'ajuste à chaque réponse. Questions uniques à chaque partie.

---

## Déploiement sur Vercel (recommandé)

### Étape 1 — Préparer le dépôt GitHub

1. Crée un compte sur [github.com](https://github.com) si tu n'en as pas
2. Crée un nouveau dépôt (bouton **New repository**), nomme-le `infinitequiz`
3. Sur ton ordinateur, ouvre un terminal dans le dossier du projet et tape :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/infinitequiz.git
git push -u origin main
```

---

### Étape 2 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
2. Clique **Add New Project** → sélectionne le dépôt `infinitequiz`
3. Vercel détecte automatiquement Next.js — laisse les paramètres par défaut
4. Avant de cliquer **Deploy**, va dans **Environment Variables** et ajoute :

| Nom | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (ta clé Anthropic) |

5. Clique **Deploy** — attends 1-2 minutes
6. Vercel te donne une URL publique type `infinitequiz.vercel.app` ✅

> Ta clé API n'est jamais exposée au navigateur — elle reste côté serveur.

---

### Étape 3 — Installer sur smartphone (PWA)

**Sur iPhone (Safari) :**
1. Ouvre l'URL dans Safari
2. Appuie sur le bouton Partager ⬆
3. Sélectionne **"Sur l'écran d'accueil"**
4. L'app apparaît comme une vraie application

**Sur Android (Chrome) :**
1. Ouvre l'URL dans Chrome
2. Appuie sur les 3 points ⋮ en haut à droite
3. Sélectionne **"Ajouter à l'écran d'accueil"**

---

### Ajouter une icône personnalisée (optionnel)

Dépose deux fichiers PNG dans le dossier `public/` :
- `icon-192.png` (192×192 pixels)
- `icon-512.png` (512×512 pixels)

---

## Développement local

```bash
npm install
cp .env.example .env.local
# Édite .env.local et colle ta clé Anthropic
npm run dev
# → Ouvre http://localhost:3000
```

---

## Structure du projet

```
infinitequiz/
├── app/
│   ├── layout.js          # Métadonnées PWA
│   ├── page.js            # Page principale
│   ├── Quiz.js            # Composant quiz (client)
│   └── api/
│       └── generate/
│           └── route.js   # Route API → Anthropic (serveur)
├── public/
│   ├── manifest.json      # Config PWA
│   ├── icon-192.png       # (à créer)
│   └── icon-512.png       # (à créer)
├── .env.example
├── .gitignore
├── next.config.js
└── package.json
```
