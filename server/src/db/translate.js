/**
 * Fills missing English / Arabic content with Groq (free tier friendly):
 *  - products: short_description + description translated from French
 *  - categories: a short SEO introduction written in fr / en / ar
 * Only EMPTY fields are filled, so texts edited in the admin are never overwritten. Safe to re-run.
 *   npm run db:translate            (everything)
 *   npm run db:translate -- --limit=5
 */
import { pool, query } from './pool.js';
import { stripHtml } from '../lib/utils.js';

// Quality over speed: the smaller model made real Arabic mistakes (brand names translated, wrong terms)
const MODELS = [process.env.GROQ_TRANSLATE_MODEL || 'openai/gpt-oss-120b'];
const limitArg = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]) || Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let turn = 0;

/** JSON completion with model rotation and rate-limit waits. */
async function complete(system, user) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const model = MODELS[turn++ % MODELS.length];
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_completion_tokens: 4000,
        response_format: { type: 'json_object' },
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'medium' } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (res.ok) {
      const content = (await res.json()).choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch {
        continue; // malformed JSON: try again
      }
    }
    const wait = (Number(res.headers.get('retry-after')) || 10) * 1000;
    console.log(`  ${model}: HTTP ${res.status}, waiting ${Math.round(wait / 1000)}s`);
    await sleep(Math.min(wait, 60000));
  }
  throw new Error('Groq unavailable after retries');
}

// Shared by both prompts: keeps brand names intact and Arabic terminology consistent
const GLOSSARY = `Never translate brand or product names: I'm From, Anua, SKIN1004, Beauty of Joseon, COSRX, Numbuzin, Medicube, TIRTIR, Abib, Dr. Althea, etc. stay exactly as written in Latin script (e.g. \"I'm From Rice Toner\" stays \"I'm From Rice Toner\" in the Arabic text).
Arabic glossary (use these exact terms): toner = تونر ; sérum = سيروم ; ampoule = أمبولة ; essence = إيسنس ; crème = كريم ; nettoyant = غسول ; huile démaquillante = زيت منظف ; protection solaire = واقي الشمس ; lacté = حليبي ; sébum = الدهون ; pores = المسام ; peau mixte = البشرة المختلطة ; peau grasse = البشرة الدهنية ; peau sèche = البشرة الجافة ; peau sensible = البشرة الحساسة ; taches = البقع الداكنة ; boutons / acné = حب الشباب ; points noirs = الرؤوس السوداء ; rougeurs = الاحمرار ; joues = الخدين ; zone T = منطقة T ; éclat = إشراقة ; barrière cutanée = حاجز البشرة.
Re-read your Arabic before answering: correct grammar and spelling, every sentence must match the French meaning exactly.`;

const TRANSLATE_SYSTEM = `You translate product texts for a Moroccan online shop of authentic Korean skincare (So Pure Skin).
Translate the French input into English and into Modern Standard Arabic (clear, simple, natural for Moroccan customers).
Rules: keep brand names, product names, ingredient names (e.g. Niacinamide, Centella, Heartleaf) and numbers/percentages unchanged in Latin script.
Do not add claims, do not remove information, keep paragraph breaks (\\n\\n). Plain text only, no HTML, no markdown.
Answer with JSON only: {"en":{"short":"...","description":"..."},"ar":{"short":"...","description":"..."}}
${GLOSSARY}`;

const CATEGORY_SYSTEM = `You write short, factual SEO introductions for category pages of So Pure Skin, a Moroccan online shop of authentic Korean skincare
(cash on delivery everywhere in Morocco).
For the given category, write 2 sentences (max 300 characters) per language: what this product type does in a Korean routine and who it suits,
then say that So Pure Skin delivers authentic Korean products everywhere in Morocco with cash on delivery.
Do NOT mention any brand name, product name, price, delivery fee or free-delivery threshold. No medical claims, no superlatives, no emojis.
Answer with JSON only: {"fr":"...","en":"...","ar":"..."} (ar = Modern Standard Arabic; keep brand names in Latin script).
${GLOSSARY}`;

async function translateProducts() {
  const { rows } = await query(
    `SELECT id, name->>'fr' AS name, short_description, description FROM products
      WHERE coalesce(description->>'fr', '') <> ''
        AND (coalesce(description->>'en', '') = '' OR coalesce(description->>'ar', '') = '')
      ORDER BY sales_count DESC`,
  );
  const todo = rows.slice(0, limitArg);
  console.log(`Products to translate: ${todo.length}`);
  for (const [i, p] of todo.entries()) {
    const short = stripHtml(p.short_description?.fr || '');
    const description = p.description.fr;
    try {
      const out = await complete(TRANSLATE_SYSTEM, JSON.stringify({ name: p.name, short, description }));
      const ok = (o) => o && typeof o.description === 'string' && o.description.trim();
      if (!ok(out.en) || !ok(out.ar)) throw new Error('incomplete translation');
      // Merge only into empty language slots
      await query(
        `UPDATE products SET
           short_description = short_description
             || CASE WHEN coalesce(short_description->>'en','') = '' AND $2 <> '' THEN jsonb_build_object('en', $2::text) ELSE '{}'::jsonb END
             || CASE WHEN coalesce(short_description->>'ar','') = '' AND $3 <> '' THEN jsonb_build_object('ar', $3::text) ELSE '{}'::jsonb END,
           description = description
             || CASE WHEN coalesce(description->>'en','') = '' THEN jsonb_build_object('en', $4::text) ELSE '{}'::jsonb END
             || CASE WHEN coalesce(description->>'ar','') = '' THEN jsonb_build_object('ar', $5::text) ELSE '{}'::jsonb END,
           updated_at = now()
         WHERE id = $1`,
        [p.id, (out.en.short || '').trim(), (out.ar.short || '').trim(), out.en.description.trim(), out.ar.description.trim()],
      );
      console.log(`[${i + 1}/${todo.length}] ${p.name}`);
    } catch (err) {
      console.log(`[${i + 1}/${todo.length}] SKIPPED ${p.name}: ${err.message}`);
    }
  }
}

async function describeCategories() {
  const { rows } = await query(
    `SELECT id, slug, kind, name FROM categories
      WHERE coalesce(description->>'fr','') = '' OR coalesce(description->>'en','') = '' OR coalesce(description->>'ar','') = ''
      ORDER BY kind, position`,
  );
  console.log(`Categories to describe: ${rows.length}`);
  for (const c of rows) {
    try {
      const out = await complete(CATEGORY_SYSTEM, JSON.stringify({ category: c.name.fr, english_name: c.name.en, type: c.kind === 'routine' ? 'skin-type routine' : 'product type' }));
      if (!out.fr || !out.en || !out.ar) throw new Error('incomplete');
      await query(
        `UPDATE categories SET description = jsonb_build_object('fr', $2::text, 'en', $3::text, 'ar', $4::text) || description
          WHERE id = $1`,
        [c.id, out.fr.trim(), out.en.trim(), out.ar.trim()],
      );
      console.log(`category ${c.slug}`);
    } catch (err) {
      console.log(`category ${c.slug} SKIPPED: ${err.message}`);
    }
  }
}

(async () => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  await describeCategories();
  await translateProducts();
  console.log('Done.');
})()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
