import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, PackageCheck, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useAllPacks, useRoutinePacks } from '../../hooks/useStore.js';
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
export function PackCard({ pack, index, className }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const add = useCart((s) => s.add);
  const [picked, setPicked] = useState(() => new Set(pack.products.filter(available).map((p) => p.id)));
  const [sizes, setSizes] = useState(() => Object.fromEntries(pack.products.filter((p) => p.sizes?.length).map((p) => [p.id, firstSize(p)?.label])));

  const sizeOf = (p) => p.sizes?.find((z) => z.label === sizes[p.id]) || null;
  const priceOf = (p) => sizeOf(p)?.price ?? p.price;
  const chosen = pack.products.filter((p) => picked.has(p.id));
  const total = chosen.reduce((sum, p) => sum + priceOf(p), 0);
  const periods = pack.itemPeriods ?? {};
  const grouped = pack.products.some((p) => periods[p.id]);
  const groups = grouped
    ? ['morning', 'night'].map((slot) => [slot, pack.products.filter((p) => periods[p.id] === slot || periods[p.id] === 'both')])
    : [['all', pack.products]];

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
      transition={{ delay: Math.min(index, 3) * 0.08 }}
      className={cn('flex flex-col overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft', className)}
    >
      <header className="bg-gradient-to-br from-brand-50 to-sand px-6 py-5">
        <p className="eyebrow flex items-center gap-1.5">
          <PackageCheck className="size-4" /> {t('packs.eyebrow', { count: pack.products.length })}
        </p>
        <h3 className="mt-2 font-display text-2xl leading-tight text-ink">{pack.name}</h3>
        {pack.routinePeriod && pack.routinePeriod !== 'none' && (
          <p className="mt-1 text-xs font-semibold text-brand-700">{t(`packs.period.${pack.routinePeriod}`)}</p>
        )}
        {pack.description && <p className="mt-1.5 text-sm text-muted">{pack.description}</p>}
      </header>

      <div className="flex-1 px-4">
        {groups.filter(([, products]) => products.length).map(([slot, products]) => (
          <div key={slot} className={cn(slot !== 'all' && 'mt-4')}>
            {slot !== 'all' && <h4 className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">{t(`packs.period.${slot}`)}</h4>}
            <ul className="divide-y divide-line">
        {products.map((p) => {
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
          </div>
        ))}
      </div>

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
export function RoutinePacks({ category, categories, title, subtitle, className, emptyMessage }) {
  const { t } = useTranslation();
  const { packs, isLoading, isError } = useRoutinePacks(categories ?? (category ? [category] : []));
  if (!isLoading && !packs.length && (isError || !emptyMessage)) return null;
  return (
    <section className={className}>
      <SectionHeading eyebrow={t('packs.sectionEyebrow')} title={title || t('packs.title')} subtitle={subtitle || t('packs.subtitle')} />
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-96 rounded-[2rem]" />
          ))}
        </div>
      ) : packs.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack, i) => (
            <PackCard key={pack.id} pack={pack} index={i} />
          ))}
        </div>
      ) : <p className="rounded-3xl bg-brand-50 p-6 text-center text-ink/80">{emptyMessage}</p>}
    </section>
  );
}

/**
 * Swipeable row of packs (home page, shop), linking to the full /packs page.
 * The list is a static snapshot, so it costs no API call.
 */
export function PacksRail({ className, limit = 10 }) {
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const { data: packs = [], isLoading } = useAllPacks();
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', direction: i18n.dir(), containScroll: 'trimSnaps' });
  const [can, setCan] = useState({ prev: false, next: false });
  const update = useCallback((api) => setCan({ prev: api.canScrollPrev(), next: api.canScrollNext() }), []);
  useEffect(() => {
    if (!embla) return undefined;
    update(embla);
    embla.on('select', update).on('reInit', update);
    return () => embla.off('select', update).off('reInit', update);
  }, [embla, update]);

  if (!isLoading && !packs.length) return null;
  const shown = packs.slice(0, limit);
  return (
    <section className={className}>
      <SectionHeading eyebrow={t('packs.sectionEyebrow')} title={t('packs.railTitle')} subtitle={t('packs.subtitle')} link={lp('/packs')} linkLabel={t('packs.viewAll', { count: packs.length })} />
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="-ms-4 flex items-stretch sm:-ms-6">
            {isLoading
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="min-w-0 shrink-0 basis-[86%] ps-4 sm:basis-[48%] sm:ps-6 lg:basis-1/3">
                    <Skeleton className="h-96 rounded-[2rem]" />
                  </div>
                ))
              : shown.map((pack, i) => (
                  <div key={pack.id} className="flex min-w-0 shrink-0 basis-[86%] ps-4 sm:basis-[48%] sm:ps-6 lg:basis-1/3">
                    <PackCard pack={pack} index={i} className="w-full" />
                  </div>
                ))}
          </div>
        </div>
        {[
          ['prev', can.prev, () => embla?.scrollPrev(), ChevronLeft, '-start-4'],
          ['next', can.next, () => embla?.scrollNext(), ChevronRight, '-end-4'],
        ].map(([dir, enabled, onClick, Icon, pos]) => (
          <button
            key={dir}
            type="button"
            onClick={onClick}
            aria-label={dir}
            className={cn(
              'absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-soft transition hover:bg-brand-500 hover:text-white lg:grid',
              pos,
              !enabled && 'pointer-events-none opacity-0',
            )}
          >
            <Icon className="size-5 rtl:-scale-x-100" />
          </button>
        ))}
      </div>
    </section>
  );
}

/** Every pack in a grid (the /packs page). */
export function AllPacks({ className }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: packs = [], isLoading } = useAllPacks();
  return (
    <section className={className}>
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96 rounded-[2rem]" />
          ))}
        </div>
      ) : packs.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack, i) => (
            <PackCard key={pack.id} pack={pack} index={i % 3} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-50 p-8 text-center">
          <p>{t('packs.empty')}</p>
          <Link to={lp('/shop')} className="btn-primary">{t('nav.allProducts')}</Link>
        </div>
      )}
    </section>
  );
}
