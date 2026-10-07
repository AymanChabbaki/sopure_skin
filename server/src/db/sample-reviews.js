/**
 * Generates SAMPLE reviews in Moroccan darija so the review UI can be seen before real reviews exist.
 * Every row is flagged is_sample = true: remove them from Admin → Avis → "Supprimer les avis d'exemple"
 * (or `npm run db:sample-reviews -- --remove`) before launch. They are never sent to Google's structured data.
 */
import { pool, query } from './pool.js';
import { migrate } from './migrate.js';

const NAMES = [
  'Salma', 'Imane', 'Khadija', 'Meryem', 'Siham', 'Hajar', 'Fatima Zahra', 'Nour', 'Yasmine', 'Ghita', 'Kawtar', 'Oumaima',
  'Chaimae', 'Hiba', 'Soukaina', 'Asmae', 'Sara', 'Douaa', 'Ikram', 'Malak', 'Wiam', 'Rania', 'Zineb', 'Nisrine', 'Loubna',
  'Houda', 'Najwa', 'Btissam', 'Ilham', 'Amina', 'Rim', 'Lina', 'Yousra', 'Hanane', 'Safae', 'Mouna',
];
const CITIES = ['Casablanca', 'Casablanca', 'Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Meknès', 'Kénitra', 'Oujda', 'Tétouan', 'Mohammedia', 'El Jadida', 'Salé', 'Témara'];

const BY_TYPE = {
  nettoyants: [
    'Nettoyant zwin bzaf, kay n9i lwjeh bla ma ynechef. Daba kanst3mlo sbah w l3chiya',
    'Mousse khfifa w ri7tha mzyana, lbachra wlat n9iya. Merci So Pure Skin',
    'Mli bdit had nettoyant les boutons n9so bzaf, kansah bih',
    'Kayn9i mzyan walakin bla ma y7ra9. Parfait l peau sensible',
  ],
  'baumes-huiles-demaquillantes': [
    'Huile démaquillante top! Kat7iyed maquillage w crème solaire f d9i9a',
    'Double nettoyage wla sahel b had l huile, lbachra wlat soft',
    'Kanbghiha bzaf, kat dweb maquillage waterproof bla ma tfrek 3iniya',
  ],
  toners: [
    'Toner rotinti dyali daba, kay hydrati w lwjeh kaywli kaylma3',
    'Sma3t 3lih f TikTok w b9it ntsenah, w b9a kyfo3ni bzaf! Glass skin',
    'Toner khfif, l bachra kat chrbo f l7in. Kanst3mlo m3a coton',
    'Mn ba3d 2 semaines teint wla mwa7ed w mfresh',
  ],
  'toner-pads': [
    'Les pads 3ajbouni bzaf, sahlin w pratique f sbah',
    'Kan7et pad 3la les boutons 10 min w kay hda7 l7mora',
    'Pads mbllin mzyan, w ri7a dyalhom khfifa. Ghadi n3awd nchrihom',
  ],
  essences: [
    'Essence zwina bzaf, lbachra wlat glowy w rotba',
    'Texture khfifa w kat dkhol f l7in, kayban farq',
  ],
  serums: [
    'Sérum ghzal! Les taches bdaw ytfa7ou mn ba3d chhar',
    'Kanst3mlo kol lila, lbachra wlat lisse w les pores sghaarou',
    'Hada a7san sérum jarrebt, l prix mzyan w résultat bayn',
    'Les boutons n9so w l marques dyalhom bdaw ymchiw, merci 3la nasi7a',
    'Sérum khfif ma kaykhllich lbachra grasse, kanbghih',
    'Mn awel semaine 7essit b farq, teint wla éclatant',
  ],
  emulsions: [
    'Émulsion khfifa w kat hydrati bla ma tlsa9, parfaite f sif',
    'Mzyana l peau mixte, ma kat3tich brillance',
  ],
  cremes: [
    'Crème hydratante top, lbachra b9at rotba nhar kaml',
    'Texture zwina bzaf w kat dkhol mzyan, ma kat3tich effet gras',
    'Kanst3mlha l3chiya w kanfi9 b wjhi mrta7. Bachra sensible w ma darlich walo',
    'Crème kat hda2 l7mora w l irritation, top!',
  ],
  'contour-des-yeux': [
    'Contour des yeux zwin, les cernes n9so chwiya w lbachra wlat rotba',
    'Kanst3mlo kol sbah 9bel maquillage, kayban farq f les ridules',
  ],
  'protection-solaire': [
    'Ecran solaire khfif bzaf, ma kay3tich trace blanche. Enfin!',
    'A7san SPF jarrebtha, kat dkhol f lbachra b7al crème',
    'Ma kat3tich brillance w maquillage kayb9a mzyan fo9ha',
    'Kanst3mlha kol nhar, ma bqatch lbachra kat7mar f chems',
  ],
  masques: [
    'Masque zwin bzaf, mn ba3d 15 min lbachra kat welli fresh',
    'Kandiro marra f simana, les pores kay n9aw mzyan',
    'Ri7to zwina w lbachra kat welli soft b7al bébé',
  ],
  exfoliants: ['Exfoliant doux, lbachra wlat lisse w les points noirs n9so'],
  'soins-apaisants': ['Kay hda2 lbachra mn l7mora f l7in, wajib f routine', 'Bachra sensible w had soin n9adha bzaf'],
  brumes: ['Brume fresh bzaf f sif, kanrechha 3la maquillage tahowa'],
  patchs: ['Les patchs kay khdmo mzyan 3la les boutons, f lil kay n9so'],
};

const GENERIC = [
  'Produit original 100%, w livraison sri3a. Allah i3tikom sa7a',
  'Kolchi mzyan, commande wslatni f 24h l Casa. Merci bzaf',
  'Jarrebto w 3jebni, ghadi n3awd ncheri',
  'Service top w nasi7a mzyana f WhatsApp. Kanseh b So Pure Skin',
  'Bachra dyali wlat a7san bzaf, merci 3la routine',
  'Livraison sri3a w l colis mzyan, l produit b7al ma f tsawer',
  'منتوج زوين بزاف، بشرتي ولات رطبة. شكرا',
  'التوصيل كان سريع والمنتوج أصلي. الله يعطيكم الصحة',
  'كنستعملو كل نهار وعجبني بزاف',
];
const MEH = [
  'Zwin walakin l prix chwiya ghali',
  'Mzyan, walakin khasso chwiya dyal lw9t bach ybayn résultat',
  'Ma 3jebnich ri7to bzaf walakin kaykhdem',
];

// Deterministic pseudo-random so re-runs give the same reviews
let seed = 1004;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

async function generate() {
  await migrate();
  const { rows: existing } = await query('SELECT count(*) FROM reviews WHERE is_sample');
  if (existing[0].count > 0) {
    console.log(`${existing[0].count} sample reviews already exist. Run with --remove first to regenerate.`);
    return;
  }
  const { rows: products } = await query(
    `SELECT p.id, p.sales_count,
            (SELECT c.slug FROM product_categories pc JOIN categories c ON c.id = pc.category_id
              WHERE pc.product_id = p.id AND c.kind = 'type' LIMIT 1) AS type
       FROM products p WHERE p.is_active ORDER BY p.id`,
  );

  let total = 0;
  for (const p of products) {
    // Popular products get more reviews
    const count = 3 + Math.floor(rand() * 4) + Math.min(Math.floor(p.sales_count / 40), 4);
    const pool = [...(BY_TYPE[p.type] || []), ...(BY_TYPE[p.type] || []), ...GENERIC];
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const r = rand();
      const rating = r < 0.68 ? 5 : r < 0.93 ? 4 : 3;
      let body = rating === 3 ? pick(MEH) : pick(pool);
      for (let tries = 0; used.has(body) && tries < 6; tries++) body = rating === 3 ? pick(MEH) : pick(pool);
      used.add(body);
      const daysAgo = Math.floor(rand() * 200) + 1;
      await query(
        `INSERT INTO reviews (product_id, author_name, city, rating, body, locale, is_approved, is_sample, created_at)
         VALUES ($1, $2, $3, $4, $5, 'ar', true, true, now() - make_interval(days => $6, hours => $7))`,
        [p.id, `${pick(NAMES)} ${String.fromCharCode(65 + Math.floor(rand() * 26))}.`, pick(CITIES), rating, body, daysAgo, Math.floor(rand() * 24)],
      );
      total += 1;
    }
  }
  console.log(`Created ${total} sample reviews on ${products.length} products.`);
}

async function remove() {
  const { rowCount } = await query('DELETE FROM reviews WHERE is_sample');
  console.log(`Removed ${rowCount} sample reviews.`);
}

(process.argv.includes('--remove') ? remove() : generate())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
