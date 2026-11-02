# So Pure Skin

> Filter Insta kimshi, walakin skin care kib9a

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

## Déploiement du frontend sur Cloudflare Workers

Le site (React) peut être servi par un Worker Cloudflare, l'API Express restant sur Vercel.
Le Worker (`client/worker/index.js`, config `client/wrangler.jsonc`) :

- sert les fichiers du build Vite depuis le réseau Cloudflare (bundles mis en cache 1 an, `client/public/_headers`) ;
- ajoute à chaque page boutique (`/fr`, `/en`, `/ar`…) les balises SEO et les liens pour Google, obtenus via `/api/seo/render` ;
- transmet à l'API `/api/*`, `sitemap.xml`, `robots.txt`, `llms*.txt`, `/feeds/*` et la clé IndexNow : le cookie admin reste sur le domaine de la boutique ;
- si l'API ne répond pas, la page s'affiche quand même (sans les balises SEO serveur).

Mise en place :

1. Dans `client/wrangler.jsonc`, mettre l'URL Vercel de l'API dans `API_ORIGIN` (ex. `https://sopure-skin.vercel.app`, pas www.sopureskin.com).
2. Générer un secret (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), puis :
   - côté Cloudflare : `cd client && npx wrangler secret put PROXY_SECRET`
   - côté Vercel : variable `PROXY_SECRET` avec la même valeur (l'API lit alors la vraie IP des visiteuses pour les limites de connexion, commandes, chat).
3. `npx wrangler login` puis `npm run deploy:cf -w client` (build + déploiement). Test : `https://sopureskin-web.<compte>.workers.dev`.
4. Domaine : avec le DNS de sopureskin.com sur Cloudflare, décommenter `routes` (`www.sopureskin.com`, `custom_domain`) et redéployer. Garder `SITE_URL=https://www.sopureskin.com` sur Vercel.
5. Le domaine Vercel `www.sopureskin.com` doit alors être retiré du projet Vercel (sinon conflit DNS) ; l'API reste joignable par son URL `.vercel.app`.

Développement : `npm run cf:dev -w client` (Worker local sur http://localhost:8787, `API_ORIGIN` modifiable avec `--var API_ORIGIN:http://localhost:4000`).

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

Une seule source de vérité : `server/src/seo.js` calcule les métadonnées de chaque page. Elles sont injectées dans le HTML envoyé aux robots
et renvoyées par `/api/seo` lors de la navigation dans le site (composant `ServerSeo`), pour que Google voie toujours les mêmes données.

- **Pages** : titres à intention locale (« … – 250 DH au Maroc »), descriptions de 160 caractères, canonical, hreflang fr/en/ar + x-default, Open Graph
- **Images** : balises `<img>` avec texte alternatif dans le HTML des robots, noms de fichiers descriptifs (`produit-1.webp`), sitemap avec toutes les images, préchargement de l'image principale
- **Données structurées** : `OnlineStore` (contact, livraison `hasShippingService`, retours si activés), `Product` (prix, stock, livraison, délais, note issue uniquement des vrais avis), `BreadcrumbList`, `CollectionPage`, `FAQPage`
- **Fichiers** : `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/feeds/google-merchant.xml`, clé IndexNow
- **IndexNow** : chaque modification dans l'admin est envoyée immédiatement à Bing (ChatGPT search, Copilot), Yandex, Seznam et Naver
- **Contenu** : descriptions produits et introductions de catégories en anglais et en arabe (`npm run db:translate`, ne remplit que les champs vides)

### Après la mise en ligne

1. **Google Search Console** : ajouter le domaine, copier le code de vérification dans `GOOGLE_SITE_VERIFICATION`, soumettre `/sitemap.xml`.
2. **Bing Webmaster Tools** : importer depuis Search Console (ou `BING_SITE_VERIFICATION`), puis Admin → Paramètres → SEO → « Notifier les moteurs ».
3. **Google Merchant Center** : ajouter le flux `https://votre-domaine/feeds/google-merchant.xml` (pays Maroc, langue français).
4. **Google Business Profile** : fiche « So Pure Skin » à Casablanca (même nom, téléphone et site que sur le site).
5. **Domaine des images** : remplacer l'adresse `r2.dev` par un sous-domaine personnalisé (ex. `cdn.sopureskin.com`) dans Cloudflare R2.

### Scripts SEO

| Commande | Rôle |
|---|---|
| `npm run db:translate -w server` | Traduit les produits et rédige les introductions de catégories (EN/AR) via Groq |
| `npm run db:rename-images -w server` | Renomme les images produits avec des noms descriptifs et améliore leurs textes alternatifs |

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
