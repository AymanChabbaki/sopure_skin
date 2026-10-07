# So Pure Skin

> Filter Snap kimshi, walakin skin care kib9a

Boutique e-commerce de cosmétiques coréens (FR / EN / AR), paiement à la livraison.

- **Front** : React 19 + Vite 8, Tailwind CSS 4, Motion, React Router 8, TanStack Query, i18next, lucide-react
- **Back** : Express 5, PostgreSQL (AlwaysData), Cloudflare R2 (images WebP via sharp)
- **Assistante IA « Soso »** : Groq (`openai/gpt-oss-120b`, repli automatique sur `gpt-oss-20b`)
- **Admin** : `/admin` (commandes, produits, avis, catégories, marques, newsletter, paramètres, équipe)

## Démarrage en local

```bash
npm install
cp server/.env.example server/.env   # remplir DATABASE_URL, JWT_SECRET, R2_*, GROQ_API_KEY
npm run db:migrate                   # crée / met à jour les tables
npm run dev                          # boutique http://localhost:5173 · API http://localhost:4000
```

### Scripts de données

| Commande | Rôle |
|---|---|
| `npm run db:seed` | Importe les produits de `seed_products.json` + leurs images (`downloaded_images/`) et crée le compte admin |
| `npm run db:logos` | Envoie les logos des marques (`server/src/db/brand-logos`) sur R2 |
| `npm run db:testimonials -w server -- <dossier>` | Ajoute des captures WhatsApp de clientes aux témoignages |
| `npm run db:sample-reviews` | Génère des avis d'exemple (`-- --remove` pour les supprimer) |

> Les avis d'exemple sont marqués `is_sample` : supprimez-les avant le lancement
> (Admin → Avis clients → « Supprimer les exemples »). Ils ne sont jamais envoyés à Google.

## Déploiement sur Vercel (Services)

Le dépôt est **un seul projet Vercel avec deux services**, déclarés dans `vercel.json` :

| Service | Dossier | Rôle |
|---|---|---|
| `web` | `client/` (Vite) | Fichiers statiques sur le CDN : JS/CSS, images, polices, `/admin` |
| `api` | `server/` (Express, `src/app.js`) | `/api/*`, `sitemap.xml`, `robots.txt`, `llms.txt` et les pages `/fr`, `/en`, `/ar` avec injection SEO |

- Les règles publiques (redirection `/` → `/fr`, routage vers chaque service) sont au niveau racine de `vercel.json`.
- `api` récupère le gabarit HTML du client via la *binding* interne `WEB_URL` : aucune URL à configurer.
- Le build du service `api` applique les migrations : `DATABASE_URL` doit être défini **avant** le premier déploiement.

1. Poussez le dépôt sur GitHub et importez-le dans Vercel (*Root Directory* : racine du dépôt).
2. Dans **Settings → Environment Variables**, ajoutez :

   | Variable | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SITE_URL` | `https://votre-domaine.com` |
   | `CORS_ORIGINS` | `https://votre-domaine.com` |
   | `DATABASE_URL` | URL AlwaysData (le `@` du mot de passe s'écrit `%40`) |
   | `DATABASE_POOL_MAX` | `3` |
   | `JWT_SECRET` | longue chaîne aléatoire |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Cloudflare R2 |
   | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_FALLBACK_MODELS` | Groq |

3. Redéployez, puis ajoutez votre domaine dans **Settings → Domains**.

Limites : 4,5 Mo par requête vers une fonction (l'admin compresse les grosses photos avant l'envoi)
et disque en lecture seule, d'où R2 obligatoire. En local, `vercel dev` lance les deux services ensemble.

Hors Vercel (VPS, AlwaysData Node.js) : `npm run build` puis `NODE_ENV=production npm start` (un seul serveur Express sert tout).

## Règles métier

| Règle | Valeur par défaut | Modifiable dans |
|---|---|---|
| Livraison Casablanca | 20 DH | Admin → Paramètres → Livraison |
| Livraison autres villes | 35 DH | idem |
| Livraison gratuite | plus de 5 produits (≥ 6) | idem |
| Paiement | à la livraison uniquement | — |

Prix et frais sont toujours recalculés côté serveur ; le stock est décrémenté à la commande
et réintégré si la commande est annulée ou retournée.

## SEO / GEO

- `/sitemap.xml` : toutes les pages × 3 langues avec hreflang et images
- `/robots.txt` : autorise moteurs et assistants IA, bloque `/admin`, `/api`, panier, checkout
- `/llms.txt` : catalogue lisible par les IA (ChatGPT, Claude, Perplexity…)
- Données structurées `OnlineStore`, `Product`, `BreadcrumbList`, `FAQPage` ; `AggregateRating` uniquement à partir de vrais avis

## Structure

```
vercel.json       services web + api et routage public
client/src
  components/     layout, home (hero, slogan, témoignages…), product (fiche, avis), chat (Soso), ui
  pages/          Home, Shop, Product, Cart, Checkout, OrderSuccess, InfoPages
  admin/          tableau de bord (chargé à la demande)
  i18n/           fr.js, en.js, ar.js (RTL automatique en arabe)
server/src
  app.js          application Express (export par défaut pour Vercel) · index.js : lancement local
  routes/         public.js, chat.js (Soso + outils), admin/*
  lib/            catalogue, réglages (livraison), stockage R2, images WebP
  db/             migrations SQL et scripts de données
  seo.js          sitemap, robots, llms.txt, injection SEO
```
