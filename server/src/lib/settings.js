import { query } from '../db/pool.js';

export const DEFAULT_SETTINGS = {
  shipping: {
    // Free delivery when the cart holds MORE than this number of products
    freeAboveItems: 5,
    // Fee by zone. `cities` are shown to customers, `aliases` are other spellings (Arabic, variants).
    // Matching ignores case, accents and dashes; orders store the listed name ("casa" -> "Casablanca").
    zones: [
      {
        id: 'casablanca',
        label: { fr: 'Casablanca', en: 'Casablanca', ar: 'الدار البيضاء' },
        fee: 20,
        cities: ['Casablanca'],
        aliases: ['Casa', 'Dar el Beida', 'الدار البيضاء', 'كازا'],
      },
      {
        id: 'casa-region',
        label: { fr: 'Région de Casablanca', en: 'Casablanca region', ar: 'ضواحي الدار البيضاء' },
        fee: 30,
        cities: ['Mediouna', 'Tit Mellil', 'Rahma', 'Lissasfa', 'Bouskoura', 'Dar Bouazza', 'Nouaceur', 'Aïn Harrouda', 'Had Soualem', 'Deroua', 'Mohammedia'],
        aliases: ['Tit Melil', 'Ain Harouda', 'مديونة', 'تيط مليل', 'الرحمة', 'ليساسفة', 'بوسكورة', 'دار بوعزة', 'النواصر', 'عين حرودة', 'حد السوالم', 'الدروة', 'المحمدية'],
      },
      {
        id: 'big-cities',
        label: { fr: 'Grandes villes', en: 'Major cities', ar: 'المدن الكبرى' },
        fee: 35,
        cities: ['Marrakech', 'Settat', 'Berrechid', 'Fès', 'Rabat', 'Salé', 'Témara', 'Tanger', 'Oujda', 'Meknès', 'Agadir', 'Kénitra', 'Tétouan', 'El Jadida'],
        aliases: ['Berchid', 'Marrakesh', 'Fez', 'Tangier', 'مراكش', 'سطات', 'برشيد', 'فاس', 'الرباط', 'سلا', 'تمارة', 'طنجة', 'وجدة', 'مكناس', 'أكادير', 'القنيطرة', 'تطوان', 'الجديدة'],
      },
    ],
    // Every city not listed in a zone
    otherFee: 40,
  },
  announcements: [
    {
      fr: 'Livraison gratuite pour plus de 5 produits',
      en: 'Free delivery on orders of more than 5 products',
      ar: 'توصيل مجاني عند شراء أكثر من 5 منتجات',
    },
    {
      fr: 'Paiement à la livraison partout au Maroc',
      en: 'Cash on delivery everywhere in Morocco',
      ar: 'الدفع عند الاستلام في جميع أنحاء المغرب',
    },
    {
      fr: 'Livraison Casablanca 20 DH · Autres villes 35 DH',
      en: 'Delivery Casablanca 20 MAD · Other cities 35 MAD',
      ar: 'التوصيل الدار البيضاء 20 درهم · باقي المدن 35 درهم',
    },
    {
      fr: '100% produits coréens authentiques',
      en: '100% authentic Korean skincare',
      ar: 'منتجات كورية أصلية 100%',
    },
  ],
  // side: where the text sits on desktop (the empty part of the photo)
  // focus: CSS object-position used on mobile to keep the subject in frame
  hero: [
    {
      title: { fr: 'La K-beauty, en toute pureté', en: 'K-beauty, in all its purity', ar: 'الجمال الكوري بكل نقاء' },
      subtitle: {
        fr: 'Des soins coréens authentiques sélectionnés pour révéler votre éclat naturel.',
        en: 'Authentic Korean skincare curated to reveal your natural glow.',
        ar: 'منتجات عناية كورية أصلية مختارة لإبراز إشراقتك الطبيعية.',
      },
      cta: { fr: 'Découvrir la boutique', en: 'Shop now', ar: 'تسوقي الآن' },
      link: '/shop',
      image: '/hero/hero-1.webp',
      imageSm: '/hero/hero-1-sm.webp',
      side: 'left',
      focus: '72% center',
    },
    {
      title: { fr: 'Une peau désaltérée et lumineuse', en: 'Quenched, luminous skin', ar: 'بشرة مرتوية ومشرقة' },
      subtitle: {
        fr: 'Sérums, essences et crèmes coréens pour une hydratation qui dure toute la journée.',
        en: 'Korean serums, essences and creams for hydration that lasts all day.',
        ar: 'سيروم وإيسنس وكريمات كورية لترطيب يدوم طوال اليوم.',
      },
      cta: { fr: 'Voir les sérums', en: 'Shop serums', ar: 'اكتشفي السيروم' },
      link: '/category/serums',
      image: '/hero/hero-2.webp',
      imageSm: '/hero/hero-2-sm.webp',
      side: 'left',
      focus: '78% center',
    },
    {
      title: { fr: 'Plus de 5 produits ? Livraison offerte', en: 'More than 5 products? Free delivery', ar: 'أكثر من 5 منتجات؟ التوصيل مجاني' },
      subtitle: {
        fr: 'Composez votre routine complète et payez à la livraison, partout au Maroc.',
        en: 'Build your complete routine and pay on delivery, anywhere in Morocco.',
        ar: 'كوّني روتينك الكامل وادفعي عند الاستلام في أي مكان بالمغرب.',
      },
      cta: { fr: 'Composer ma routine', en: 'Build my routine', ar: 'كوّني روتينك' },
      link: '/routine',
      image: '/hero/hero-3.webp',
      imageSm: '/hero/hero-3-sm.webp',
      side: 'right',
      focus: '30% center',
    },
  ],
  // Which links show in the main navigation bar (desktop header + mobile menu).
  // Keys are the fixed nav item ids; false hides the link. Missing keys default to visible.
  // `order` lists the ids in display order; ids missing from it keep their default position at the end.
  navbar: {
    home: true,
    shop: true,
    brands: true,
    hair: true,
    body: true,
    best: true,
    new: true,
    offers: true,
    routine: true,
    order: ['home', 'shop', 'brands', 'hair', 'body', 'best', 'new', 'offers', 'routine'],
  },
  // Return policy published to Google only once enabled by the shop (never invented)
  returns: { enabled: false, days: 7, fees: 'customer' },
  // WhatsApp screenshots from customers: [{ url, thumbUrl }]
  testimonials: [],
  contact: {
    phone: '+212 6 25 37 08 41',
    whatsapp: '212625370841',
    email: 'so.pure.skin1@gmail.com',
    city: 'Casablanca',
    instagram: 'https://www.instagram.com/sopure.skin/',
    tiktok: 'https://www.tiktok.com/@sopure.skin',
  },
  seo: {
    // Search terms first ("cosmétiques coréens", "k-beauty maroc"), brand name last
    title: {
      fr: 'Cosmétiques coréens & K-beauty au Maroc | So Pure Skin',
      en: 'Korean Skincare & K-beauty in Morocco | So Pure Skin',
      ar: 'مستحضرات التجميل الكورية في المغرب | So Pure Skin',
    },
    description: {
      fr: 'Cosmétiques coréens 100% originaux au Maroc : Anua, SKIN1004, Beauty of Joseon, COSRX, Medicube, Abib… Sérums, toners, écrans solaires. Paiement à la livraison.',
      en: '100% authentic Korean skincare in Morocco: Anua, SKIN1004, Beauty of Joseon, COSRX, Medicube, Abib… Serums, toners, sunscreens. Cash on delivery.',
      ar: 'مستحضرات تجميل كورية أصلية 100% في المغرب: Anua و SKIN1004 و Beauty of Joseon و COSRX و Medicube… سيروم، تونر، واقي شمس. الدفع عند الاستلام.',
    },
  },
};

let cache = null;

export async function getSettings() {
  if (cache) return cache;
  const { rows } = await query('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cache = { ...DEFAULT_SETTINGS, ...stored };
  return cache;
}

export async function saveSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
  cache = null;
}

/* -------------------------------- Shipping -------------------------------- */
// Same rules in client/src/hooks/useStore.js (checkout preview); the server value is the one charged.

const normCity = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim();

/** Delivery zone of a city, or null (= "other cities"). */
export function shippingZone(city, shipping) {
  const c = normCity(city);
  if (!c) return null;
  return (shipping.zones || []).find((z) => [...z.cities, ...(z.aliases || [])].some((name) => normCity(name) === c)) || null;
}

export const isCasablanca = (city, shipping) => shippingZone(city, shipping)?.id === 'casablanca';

export function computeShipping({ city, itemsCount }, shipping) {
  if (itemsCount > shipping.freeAboveItems) return 0;
  return shippingZone(city, shipping)?.fee ?? shipping.otherFee;
}

/** Name to store on the order: "casa" / "الدار البيضاء" become "Casablanca" so statistics group correctly. */
export function canonicalCity(city, shipping) {
  const zone = shippingZone(city, shipping);
  if (!zone) return String(city).trim();
  if (zone.id === 'casablanca') return zone.cities[0];
  // The listed spelling ("tit-mellil" -> "Tit Mellil"); aliases keep what the customer typed
  return zone.cities.find((name) => normCity(name) === normCity(city)) || String(city).trim();
}

/** Figures for texts: Casablanca fee and the range of the other zones ("30–40"). */
export function shippingSummary(shipping) {
  const casa = (shipping.zones || []).find((z) => z.id === 'casablanca')?.fee ?? shipping.otherFee;
  const others = [...(shipping.zones || []).filter((z) => z.id !== 'casablanca').map((z) => z.fee), shipping.otherFee];
  const min = Math.min(...others);
  const max = Math.max(casa, ...others);
  return { casa, min, max, other: min === Math.max(...others) ? `${min}` : `${min}–${Math.max(...others)}` };
}

/** Full fee table in English, for the assistant and llms.txt ("Casablanca 20 MAD; Casablanca region (Mediouna, …) 30 MAD; …"). */
export function shippingTable(shipping) {
  const zones = (shipping.zones || []).map(
    (z) => `${z.label?.en || z.label?.fr || z.id}${z.id === 'casablanca' ? '' : ` (${z.cities.join(', ')})`} ${z.fee} MAD`,
  );
  return [...zones, `all other cities ${shipping.otherFee} MAD`].join('; ');
}
