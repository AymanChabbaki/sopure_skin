import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Check, PackageCheck, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { usePacks } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { useCart } from '../../store/cart.js';
import { SectionHeading, Skeleton } from '../ui/Primitives.jsx';
import { cn, formatPrice } from '../../lib/format.js';

/** Default size for a sized product: the first one in stock. */
const firstSize = (p) => p.sizes?.find((z) => z.inStock) || null;
const available = (p) => (p.sizes?.length ? Boolean(firstSize(p)) : p.inStock);

/**
 * One pack: every product is ticked by default, the customer can untick some,
 * then adds the whole selection to the cart in one click.
 */
function PackCard({ pack, index }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const add = useCart((s) => s.add);
  const [picked, setPicked] = useState(() => new Set(pack.products.filter(available).map((p) => p.id)));
  const [sizes, setSizes] = useState(() => Object.fromEntries(pack.products.filter((p) => p.sizes?.length).map((p) => [p.id, firstSize(p)?.label])));

  const sizeOf = (p) => p.sizes?.find((z) => z.label === sizes[p.id]) || null;
  const priceOf = (p) => sizeOf(p)?.price ?? p.price;
  const chosen = pack.products.filter((p) => picked.has(p.id));
  const total = chosen.reduce((sum, p) => sum + priceOf(p), 0);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addAll = () => {
    chosen.forEach((p) => add(p, 1, sizeOf(p)));
    toast.success(t('packs.added', { count: chosen.length }), { description: pack.name });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="flex flex-col overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft"
    >
      <header className="bg-gradient-to-br from-brand-50 to-sand px-6 py-5">
        <p className="eyebrow flex items-center gap-1.5">
          <PackageCheck className="size-4" /> {t('packs.eyebrow', { count: pack.products.length })}
        </p>
        <h3 className="mt-2 font-display text-2xl leading-tight text-ink">{pack.name}</h3>
        {pack.description && <p className="mt-1.5 text-sm text-muted">{pack.description}</p>}
      </header>

      <ul className="flex-1 divide-y divide-line px-4">
        {pack.products.map((p) => {
          const on = picked.has(p.id);
          const canBuy = available(p);
          return (
            <li key={p.id} className={cn('flex items-center gap-3 py-3 transition', !on && 'opacity-50')}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={p.name}
                disabled={!canBuy}
                onClick={() => toggle(p.id)}
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-lg border-2 transition',
                  on ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300 bg-white',
                  !canBuy && 'cursor-not-allowed',
                )}
              >
                <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-3.5" strokeWidth={3} /></motion.span>}</AnimatePresence>
              </button>
              <Link to={lp(`/product/${p.slug}`)} className="size-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                {p.images?.[0] && <img src={p.images[0].thumbUrl} alt={p.name} loading="lazy" className="size-full object-contain p-1 mix-blend-multiply" />}
              </Link>
              <div className="min-w-0 flex-1">
                {p.brand && <p className="text-[10px] tracking-wider text-brand-600 uppercase">{p.brand.name}</p>}
                <Link to={lp(`/product/${p.slug}`)} className="line-clamp-2 text-sm leading-snug text-ink hover:text-brand-700">
                  {p.name}
                </Link>
                {!canBuy && <p className="text-xs text-rose-600">{t('common.outOfStock')}</p>}
                {canBuy && p.sizes?.length > 0 && (
                  <select
                    value={sizes[p.id] || ''}
                    onChange={(e) => setSizes((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="mt-1 rounded-lg border border-line bg-white px-2 py-1 text-xs"
                    aria-label={t('product.size')}
                  >
                    {p.sizes.map((z) => (
                      <option key={z.label} value={z.label} disabled={!z.inStock}>
                        {z.label} · {formatPrice(z.price)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(priceOf(p))}</span>
            </li>
          );
        })}
      </ul>

      <footer className="border-t border-line p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-muted">{t('packs.selected', { count: chosen.length, total: pack.products.length })}</span>
          <motion.span key={total} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-semibold text-ink">
            {formatPrice(total)}
          </motion.span>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={addAll} disabled={!chosen.length} className="btn-primary w-full py-3.5 disabled:opacity-50">
          <ShoppingBag className="size-4" />
          {chosen.length === pack.products.length ? t('packs.addAll') : t('packs.addSelection', { count: chosen.length })}
        </motion.button>
      </footer>
    </motion.article>
  );
}

/** Packs of a routine (category slug). Renders nothing when the routine has no pack. */
export function RoutinePacks({ category, title, subtitle, className }) {
  const { t } = useTranslation();
  const { data: packs = [], isLoading } = usePacks(category, { enabled: Boolean(category) });
  if (!category || (!isLoading && !packs.length)) return null;
  return (
    <section className={className}>
      <SectionHeading eyebrow={t('packs.sectionEyebrow')} title={title || t('packs.title')} subtitle={subtitle || t('packs.subtitle')} />
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-96 rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack, i) => (
            <PackCard key={pack.id} pack={pack} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
