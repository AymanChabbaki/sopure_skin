import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, PackageSearch, Check } from 'lucide-react';
import { ProductGrid } from '../components/product/ProductGrid.jsx';
import { PageHeader } from '../components/ui/Primitives.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { BrandLogo } from '../components/ui/BrandLogo.jsx';
import { Seo } from '../components/ui/Seo.jsx';
import { useBrands, useCategories, useProducts } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { cn } from '../lib/format.js';

const SORTS = ['popular', 'rating', 'newest', 'price_asc', 'price_desc'];

function FilterGroup({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-medium" aria-expanded={open}>
        {title}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ checked, onChange, label, count }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="grid size-5 shrink-0 place-items-center rounded-md border border-line transition peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300">
        {checked && <Check className="size-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1 text-ink/80 group-hover:text-ink">{label}</span>
      {count != null && <span className="text-xs text-muted">{count}</span>}
    </label>
  );
}

function Filters({ params, setParam, toggleList, fixed }) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const selected = (key) => (params.get(key) || '').split(',').filter(Boolean);
  const [min, setMin] = useState(params.get('minPrice') || '');
  const [max, setMax] = useState(params.get('maxPrice') || '');

  useEffect(() => {
    setMin(params.get('minPrice') || '');
    setMax(params.get('maxPrice') || '');
  }, [params]);

  return (
    <div>
      {fixed !== 'category' && (
        <>
          <FilterGroup title={t('shop.category')}>
            {categories.filter((c) => c.kind === 'type').map((c) => (
              <CheckRow key={c.id} label={c.name} count={c.productCount} checked={selected('category').includes(c.slug)} onChange={() => toggleList('category', c.slug)} />
            ))}
          </FilterGroup>
          <FilterGroup title={t('shop.routine')} defaultOpen={false}>
            {categories.filter((c) => c.kind === 'routine').map((c) => (
              <CheckRow key={c.id} label={c.name} count={c.productCount} checked={selected('category').includes(c.slug)} onChange={() => toggleList('category', c.slug)} />
            ))}
          </FilterGroup>
        </>
      )}
      {fixed !== 'brand' && (
        <FilterGroup title={t('shop.brand')}>
          <div className="max-h-72 overflow-y-auto pe-1">
            {brands.map((b) => (
              <CheckRow key={b.id} label={b.name} count={b.productCount} checked={selected('brand').includes(b.slug)} onChange={() => toggleList('brand', b.slug)} />
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title={t('shop.price')}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ minPrice: min, maxPrice: max });
          }}
        >
          <input className="input py-2" inputMode="numeric" placeholder={t('shop.min')} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} aria-label={t('shop.min')} />
          <span className="text-muted">-</span>
          <input className="input py-2" inputMode="numeric" placeholder={t('shop.max')} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} aria-label={t('shop.max')} />
          <button type="submit" className="icon-btn shrink-0 bg-brand-50" aria-label="OK">
            <Check className="size-4" />
          </button>
        </form>
      </FilterGroup>
      <div className="py-5">
        <CheckRow label={t('shop.onSale')} checked={params.get('onSale') === 'true'} onChange={() => setParam({ onSale: params.get('onSale') === 'true' ? '' : 'true' })} />
      </div>
    </div>
  );
}

export default function Shop() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { slug: categorySlug, brandSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const fixed = categorySlug ? 'category' : brandSlug ? 'brand' : null;
  const category = categories.find((c) => c.slug === categorySlug);
  const brand = brands.find((b) => b.slug === brandSlug);
  const page = Number(params.get('page')) || 1;
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : 'popular';
  const q = params.get('q') || '';

  const query = useMemo(
    () => ({
      q,
      category: categorySlug || params.get('category') || '',
      brand: brandSlug || params.get('brand') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      onSale: params.get('onSale') === 'true',
      sort,
      page,
      limit: 24,
    }),
    [q, categorySlug, brandSlug, params, sort, page],
  );
  const { data, isLoading, isError, refetch, isPlaceholderData } = useProducts(query);

  const setParam = (updates) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in updates)) next.delete('page');
    setParams(next, { preventScrollReset: 'page' in updates ? false : true });
  };
  const toggleList = (key, value) => {
    const list = (params.get(key) || '').split(',').filter(Boolean);
    setParam({ [key]: (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]).join(',') });
  };

  const activeChips = [
    ...(params.get('category') || '').split(',').filter(Boolean).map((s) => ({ key: 'category', value: s, label: categories.find((c) => c.slug === s)?.name || s })),
    ...(params.get('brand') || '').split(',').filter(Boolean).map((s) => ({ key: 'brand', value: s, label: brands.find((b) => b.slug === s)?.name || s })),
    params.get('onSale') === 'true' && { key: 'onSale', label: t('shop.onSale') },
    (params.get('minPrice') || params.get('maxPrice')) && { key: 'price', label: `${params.get('minPrice') || 0} - ${params.get('maxPrice') || '∞'} ${t('common.currency')}` },
  ].filter(Boolean);

  const removeChip = (chip) => {
    if (chip.key === 'onSale') setParam({ onSale: '' });
    else if (chip.key === 'price') setParam({ minPrice: '', maxPrice: '' });
    else toggleList(chip.key, chip.value);
  };

  const title = category?.name || brand?.name || (q ? t('shop.searchFor', { q }) : t('shop.title'));
  const subtitle = category?.description || brand?.description || t('shop.subtitle');
  const total = data?.total ?? 0;

  return (
    <>
      <Seo title={title} description={subtitle} noindex={Boolean(q)} />
      <PageHeader eyebrow={brand ? t('nav.brands') : category ? (category.kind === 'routine' ? t('nav.routines') : t('nav.categories')) : null} title={title} subtitle={subtitle}>
        {brand?.logo && (
          <div className="mt-6 inline-flex rounded-2xl bg-white/80 px-6 py-4 shadow-sm backdrop-blur">
            <BrandLogo brand={brand} area={5000} maxHeight={60} />
          </div>
        )}
        <nav aria-label="Breadcrumb" className="mt-6 text-xs text-muted">
          <Link to={lp('/')} className="hover:text-brand-600">
            {t('nav.home')}
          </Link>
          <span className="mx-2">/</span>
          {fixed ? (
            <Link to={lp('/shop')} className="hover:text-brand-600">
              {t('nav.shop')}
            </Link>
          ) : (
            <span className="text-ink">{t('nav.shop')}</span>
          )}
          {fixed && (
            <>
              <span className="mx-2">/</span>
              <span className="text-ink">{title}</span>
            </>
          )}
        </nav>
      </PageHeader>

      <div className="container-x pb-20">
        {/* Toolbar */}
        <div className="sticky top-16 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:px-0 lg:top-20">
          <button type="button" onClick={() => setFiltersOpen(true)} className="btn-outline px-4 py-2.5 lg:hidden">
            <SlidersHorizontal className="size-4" /> {t('shop.filters')}
            {activeChips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] text-white">{activeChips.length}</span>}
          </button>
          <p className="hidden text-sm text-muted lg:block" aria-live="polite">
            {t('shop.results', { count: total })}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">{t('shop.sort')}</span>
            <select value={sort} onChange={(e) => setParam({ sort: e.target.value })} className="input w-auto cursor-pointer rounded-full py-2.5 pe-9">
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`shop.sortOptions.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeChips.length > 0 && (
          <motion.div layout className="flex flex-wrap items-center gap-2 pt-4">
            <AnimatePresence>
              {activeChips.map((chip) => (
                <motion.button
                  layout
                  key={`${chip.key}-${chip.value || ''}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => removeChip(chip)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs text-brand-800 hover:bg-brand-100"
                >
                  {chip.label} <X className="size-3" />
                </motion.button>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setParams(q ? { q } : {})}
              className="text-xs text-muted underline underline-offset-4 hover:text-ink"
            >
              {t('shop.clear')}
            </button>
          </motion.div>
        )}

        <div className="mt-6 grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label={t('shop.filters')}>
            <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pe-2">
              <Filters params={params} setParam={setParam} toggleList={toggleList} fixed={fixed} />
            </div>
          </aside>

          <div className={cn('min-w-0 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {isError ? (
              <div className="py-20 text-center">
                <p className="text-muted">{t('common.error')}</p>
                <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
                  {t('common.retry')}
                </button>
              </div>
            ) : !isLoading && total === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <PackageSearch className="size-14 text-brand-200" strokeWidth={1.25} />
                <p className="mt-4 text-muted">{t('shop.empty')}</p>
                <Link to={lp('/shop')} className="btn-outline mt-6">
                  {t('nav.allProducts')}
                </Link>
              </div>
            ) : (
              <ProductGrid products={data?.rows ?? []} loading={isLoading} className="md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4" />
            )}

            {data?.pages > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
                <button type="button" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })} className="icon-btn border border-line disabled:opacity-30" aria-label="Previous">
                  <ChevronLeft className="size-4 rtl:-scale-x-100" />
                </button>
                {Array.from({ length: data.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === data.pages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-2">
                      {i > 0 && p - arr[i - 1] > 1 && <span className="text-muted">…</span>}
                      <button
                        type="button"
                        onClick={() => setParam({ page: String(p) })}
                        aria-current={p === page ? 'page' : undefined}
                        className={cn('size-10 rounded-full text-sm transition', p === page ? 'bg-ink text-white' : 'hover:bg-brand-50')}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button type="button" disabled={page >= data.pages} onClick={() => setParam({ page: String(page + 1) })} className="icon-btn border border-line disabled:opacity-30" aria-label="Next">
                  <ChevronRight className="size-4 rtl:-scale-x-100" />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('shop.filters')}
        side="start"
        footer={
          <button type="button" onClick={() => setFiltersOpen(false)} className="btn-primary w-full py-4">
            {t('shop.apply')} ({total})
          </button>
        }
      >
        <div className="px-5">
          <Filters params={params} setParam={setParam} toggleList={toggleList} fixed={fixed} />
        </div>
      </Drawer>
    </>
  );
}
