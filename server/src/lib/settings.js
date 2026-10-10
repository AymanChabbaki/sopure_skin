import { query } from '../db/pool.js';

export const DEFAULT_SETTINGS = {
  shipping: {
    casablancaFee: 20,
    otherFee: 35,
    // Free delivery when the cart holds MORE than this number of products
    freeAboveItems: 5,
    casablancaAliases: ['casablanca', 'casa', 'dar el beida', 'الدار البيضاء'],
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
      link: '/shop',
      image: '/hero/hero-3.webp',
      imageSm: '/hero/hero-3-sm.webp',
      side: 'right',
      focus: '30% center',
    },
  ],
  // WhatsApp screenshots from customers: [{ url, thumbUrl }]
  testimonials: [],
  contact: {
    phone: '+212 6 25 37 08 41',
    whatsapp: '212625370841',
    email: 'so.pure.skin1@gmail.com',
    city: 'Casablanca',
    // Public profile URL still to confirm (the link received was the account settings page)
    instagram: 'https://www.instagram.com/sopure.skin/',
    tiktok: 'https://www.tiktok.com/@sopure.skin',
  },
  seo: {
    title: {
      fr: 'So Pure Skin | Cosmétiques coréens authentiques au Maroc',
      en: 'So Pure Skin | Authentic Korean skincare in Morocco',
      ar: 'So Pure Skin | مستحضرات تجميل كورية أصلية في المغرب',
    },
    description: {
      fr: 'Boutique de K-beauty au Maroc : Anua, Skin1004, Beauty of Joseon, COSRX et plus. Paiement à la livraison, livraison Casablanca 20 DH.',
      en: 'K-beauty store in Morocco: Anua, Skin1004, Beauty of Joseon, COSRX and more. Cash on delivery, Casablanca delivery 20 MAD.',
      ar: 'متجر الجمال الكوري في المغرب: Anua و Skin1004 و Beauty of Joseon و COSRX والمزيد. الدفع عند الاستلام.',
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

export function isCasablanca(city, shipping) {
  const normalized = String(city).trim().toLowerCase();
  return shipping.casablancaAliases.some((alias) => normalized === alias.toLowerCase());
}

export function computeShipping({ city, itemsCount }, shipping) {
  if (itemsCount > shipping.freeAboveItems) return 0;
  return isCasablanca(city, shipping) ? shipping.casablancaFee : shipping.otherFee;
}
