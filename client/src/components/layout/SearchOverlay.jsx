import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { useUi } from '../../store/ui.js';
import { useProducts } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { Price } from '../ui/Primitives.jsx';

const POPULAR = ['Anua', 'SKIN1004', 'Beauty of Joseon', 'Niacinamide', 'Centella', 'Sun'];

export function SearchOverlay() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearchOpen);
  const [q, setQ] = useState('');
  const deferred = useDeferredValue(q.trim());
  const inputRef = useRef(null);
  const { data, isFetching } = useProducts({ q: deferred, limit: 6 }, { enabled: open && deferred.length >= 2 });

  useEffect(() => {
    if (!open) return undefined;
    const t1 = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  // Ctrl/Cmd + K opens search anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const close = () => setOpen(false);
  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    close();
    navigate(lp(`/shop?q=${encodeURIComponent(q.trim())}`));
  };

  const results = deferred.length >= 2 ? data?.rows ?? [] : [];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t('nav.search')}>
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative mx-auto mt-0 max-h-[100dvh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl sm:mt-16 sm:rounded-3xl"
          >
            <form onSubmit={submit} className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
              {isFetching ? <Loader2 className="size-5 animate-spin text-brand-500" /> : <Search className="size-5 text-muted" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-lg"
                type="search"
                enterKeyHint="search"
              />
              <button type="button" onClick={close} className="icon-btn" aria-label={t('nav.close')}>
                <X className="size-5" />
              </button>
            </form>

            <div className="p-5">
              {deferred.length < 2 ? (
                <>
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wider text-muted uppercase">
                    <TrendingUp className="size-4" /> {t('search.popular')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((term) => (
                      <button key={term} type="button" onClick={() => setQ(term)} className="rounded-full border border-line px-4 py-2 text-sm transition hover:border-brand-400 hover:bg-brand-50">
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              ) : results.length === 0 && !isFetching ? (
                <p className="py-10 text-center text-muted">{t('search.noResults', { q: deferred })}</p>
              ) : (
                <>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {results.map((p, i) => (
                      <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <Link to={lp(`/product/${p.slug}`)} onClick={close} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50">
                          <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                            {p.images[0] && <img src={p.images[0].thumbUrl} alt="" className="size-full object-contain p-1 mix-blend-multiply" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] tracking-wider text-brand-600 uppercase">{p.brand?.name}</span>
                            <span className="line-clamp-1 text-sm">{p.name}</span>
                            <Price price={p.price} compareAt={p.compareAtPrice} size="sm" />
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                  {data?.total > results.length && (
                    <button type="button" onClick={submit} className="btn-outline mt-4 w-full">
                      {t('search.seeAll')} ({data.total}) <ArrowRight className="size-4 rtl:-scale-x-100" />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
