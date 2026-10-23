import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Search, Heart, ShoppingBag, Menu, ChevronDown, ArrowRight, Sparkles, X, Loader2 } from 'lucide-react';
import { Logo } from '../ui/Logo.jsx';
import { Price } from '../ui/Primitives.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { useCart, useCartCount } from '../../store/cart.js';
import { useWishlist } from '../../store/wishlist.js';
import { useUi } from '../../store/ui.js';
import { useBrands, useCategories, useProducts, useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { cn, sortByNavOrder } from '../../lib/format.js';

const ease = [0.22, 1, 0.36, 1];

// Panel unrolls from the top, then its columns and links cascade in
const panelVariants = {
  hidden: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
  show: {
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: { duration: 0.45, ease, staggerChildren: 0.08, delayChildren: 0.08 },
  },
  exit: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.22, ease: 'easeIn' } },
};
const columnVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease, staggerChildren: 0.025 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
};
const cardVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease } },
};

const linkCls = 'group/link inline-flex items-center gap-1.5 text-sm text-ink/80 transition hover:text-brand-600';
const Dot = () => <span className="size-1 rounded-full bg-brand-400 opacity-0 transition group-hover/link:opacity-100" aria-hidden />;

function MegaMenu({ id, onNavigate }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const types = categories.filter((c) => c.kind === 'type');
  const routines = categories.filter((c) => c.kind === 'routine' && c.slug.split('-').length === 2);

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="absolute inset-x-0 top-full border-t border-line bg-white shadow-soft"
    >
      <div className="container-x grid gap-10 py-10 lg:grid-cols-12">
        {id === 'shop' ? (
          <>
            <motion.div variants={columnVariants} className="lg:col-span-5">
              <motion.p variants={itemVariants} className="eyebrow mb-4">
                {t('nav.shopByType')}
              </motion.p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {types.map((c) => (
                  <motion.li key={c.id} variants={itemVariants}>
                    <Link onClick={onNavigate} to={lp(`/category/${c.slug}`)} className={linkCls}>
                      <Dot />
                      {c.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={columnVariants} className="lg:col-span-3">
              <motion.p variants={itemVariants} className="eyebrow mb-4">
                {t('nav.shopByRoutine')}
              </motion.p>
              <ul className="space-y-2.5">
                {routines.map((c) => (
                  <motion.li key={c.id} variants={itemVariants}>
                    <Link onClick={onNavigate} to={lp(`/category/${c.slug}`)} className={linkCls}>
                      <Dot />
                      {c.name}
                    </Link>
                  </motion.li>
                ))}
                <motion.li variants={itemVariants} className="pt-1">
                  <Link onClick={onNavigate} to={lp('/routine')} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100">
                    <Sparkles className="size-3.5" /> {t('nav.routineBuilder')}
                  </Link>
                </motion.li>
                <motion.li variants={itemVariants}>
                  <Link onClick={onNavigate} to={lp('/shop')} className="group inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                    {t('nav.allProducts')} <ArrowRight className="size-3.5 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </Link>
                </motion.li>
              </ul>
            </motion.div>
            <motion.div variants={cardVariants} className="lg:col-span-4">
              <Link
                onClick={onNavigate}
                to={lp('/shop?onSale=true')}
                className="group relative block h-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 via-brand-50 to-sand p-8"
              >
                <p className="eyebrow">{t('nav.offers')}</p>
                <p className="mt-3 font-display text-3xl leading-tight text-ink">{t('home.offersTitle')}</p>
                <p className="mt-2 text-sm text-muted">{t('home.offersSubtitle')}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-700">
                  {t('common.discover')} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:-scale-x-100" />
                </span>
                <motion.div
                  aria-hidden
                  className="absolute -end-10 -bottom-10 size-40 rounded-full bg-brand-300/30 blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </Link>
            </motion.div>
          </>
        ) : (
          <motion.div variants={columnVariants} className="lg:col-span-12">
            <motion.div variants={itemVariants} className="mb-5 flex items-center justify-between">
              <p className="eyebrow">{t('nav.brands')}</p>
              <Link onClick={onNavigate} to={lp('/brands')} className="text-sm font-medium text-brand-700">
                {t('nav.viewAll')}
              </Link>
            </motion.div>
            <ul className="grid grid-cols-3 gap-2 xl:grid-cols-6">
              {brands.map((b) => (
                <motion.li key={b.id} variants={itemVariants}>
                  <Link
                    onClick={onNavigate}
                    to={lp(`/brand/${b.slug}`)}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {b.name}
                    <span className="text-xs text-muted">{b.productCount}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/** Desktop search bar that unfolds in the middle of the header, with live results underneath. */
function InlineSearch({ onClose }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const deferred = useDeferredValue(q.trim());
  const root = useRef(null);
  const { data, isFetching } = useProducts({ q: deferred, limit: 6 }, { enabled: deferred.length >= 2 });
  const results = deferred.length >= 2 ? data?.rows ?? [] : [];

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onDown = (e) => !root.current?.contains(e.target) && !e.target.closest?.('[aria-expanded]') && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(lp(`/shop?q=${encodeURIComponent(q.trim())}`));
  };

  return (
    <motion.div
      ref={root}
      initial={{ opacity: 0, scaleX: 0.4 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.4 }}
      transition={{ duration: 0.3, ease }}
      className="absolute top-1/2 left-1/2 z-10 hidden w-[min(640px,52vw)] -translate-x-1/2 -translate-y-1/2 xl:block"
    >
      <form onSubmit={submit} className="flex h-11 items-center gap-3 rounded-full border border-brand-200 bg-white px-4 shadow-soft">
        {isFetching ? <Loader2 className="size-4 animate-spin text-brand-500" /> : <Search className="size-4 text-muted" />}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
          type="search"
          enterKeyHint="search"
          aria-label={t('nav.search')}
        />
        <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
      </form>

      <AnimatePresence>
        {deferred.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-2xl"
          >
            {results.length === 0 && !isFetching ? (
              <p className="px-4 py-6 text-center text-sm text-muted">{t('search.noResults', { q: deferred })}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={lp(`/product/${p.slug}`)} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50">
                      <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                        {p.images[0] && <img src={p.images[0].thumbUrl} alt="" className="size-full object-contain p-1 mix-blend-multiply" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] tracking-wider text-brand-600 uppercase">{p.brand?.name}</span>
                        <span className="line-clamp-1 text-sm">{p.name}</span>
                        <Price price={p.price} compareAt={p.compareAtPrice} size="sm" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data?.total > results.length && (
              <button type="button" onClick={submit} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                {t('search.seeAll')} ({data.total}) <ArrowRight className="size-4 rtl:-scale-x-100" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Header() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { pathname, search } = useLocation();
  const count = useCartCount();
  const openCart = useCart((s) => s.open);
  const wishCount = useWishlist((s) => s.ids.length);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setMenuOpen = useUi((s) => s.setMenuOpen);
  const [mega, setMega] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [searching, setSearching] = useState(false);
  const closeTimer = useRef();
  const { scrollY } = useScroll();
  const { data: settings } = useSettings();
  const navbar = settings?.navbar || {};

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));
  useEffect(() => {
    setMega(null);
    setSearching(false);
  }, [pathname, search]);

  const openMega = (id) => {
    clearTimeout(closeTimer.current);
    setMega(id);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMega(null), 120);
  };

  const links = sortByNavOrder([
    { id: 'home', to: lp('/'), label: t('nav.home') },
    { id: 'shop', to: lp('/shop'), label: t('nav.shop'), mega: true },
    { id: 'brands', to: lp('/brands'), label: t('nav.brands'), mega: true },
    { id: 'hair', to: lp('/category/soins-cheveux'), label: t('nav.hair') },
    { id: 'body', to: lp('/category/soins-corps'), label: t('nav.body') },
    { id: 'best', to: lp('/shop?bestSeller=true'), label: t('nav.bestSellers'), query: 'bestSeller=true' },
    { id: 'new', to: lp('/shop?sort=newest'), label: t('nav.newArrivals'), query: 'sort=newest' },
    { id: 'offers', to: lp('/shop?onSale=true'), label: t('nav.offers'), accent: true, query: 'onSale=true' },
    { id: 'routine', to: lp('/routine'), label: t('nav.myRoutine'), icon: Sparkles },
  ], navbar.order).filter((l) => navbar[l.id] !== false);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled || mega ? 'bg-white/90 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur-xl' : 'bg-white',
      )}
      onMouseLeave={scheduleClose}
    >
      <div className={cn('container-x relative flex items-center gap-4 transition-all duration-300', scrolled ? 'h-16' : 'h-16 lg:h-20')}>
        {/* Logo side and icons side share the free space equally, so the menu sits exactly in the center */}
        <div className="flex flex-1 items-center gap-2">
          <button type="button" className="icon-btn -ms-2 xl:hidden" onClick={() => setMenuOpen(true)} aria-label={t('nav.menu')}>
            <Menu className="size-5" />
          </button>
          {/* Centered on phones/tablets (hamburger layout), left-aligned next to the menu on desktop */}
          <Link to={lp('/')} className="absolute left-1/2 shrink-0 -translate-x-1/2 xl:static xl:translate-x-0" aria-label="So Pure Skin">
            <Logo />
          </Link>
        </div>

        {/* Desktop: the inline search takes the menu's place while it is open */}
        <AnimatePresence>{searching && <InlineSearch onClose={() => setSearching(false)} />}</AnimatePresence>
        <motion.nav
          animate={{ opacity: searching ? 0 : 1, y: searching ? -8 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn('hidden h-full shrink-0 items-center xl:flex', searching && 'pointer-events-none')}
          aria-label="Main"
          aria-hidden={searching || undefined}
        >
          {links.map((l) => (
            <div key={l.id} className="h-full" onMouseEnter={() => (l.mega ? openMega(l.id) : setMega(null))}>
              <NavLink
                to={l.to}
                end
                className={({ isActive }) => {
                  // Several links share /shop: those with a filter are active only when it is applied
                  const active = l.query ? isActive && search.includes(l.query) : isActive && !(l.id === 'shop' && search);
                  return cn(
                    'relative flex h-full items-center gap-1 px-2 text-[12px] font-medium tracking-normal whitespace-nowrap uppercase transition-colors rtl:text-sm rtl:normal-case',
                    l.accent ? 'text-brand-600 hover:text-brand-800' : 'text-ink/75 hover:text-ink',
                    (active || mega === l.id) && (l.accent ? 'text-brand-800' : 'text-ink'),
                  );
                }}
              >
                {l.icon && <l.icon className="size-3.5" />}
                {l.label}
                {l.mega && <ChevronDown className={cn('size-3.5 transition-transform', mega === l.id && 'rotate-180')} />}
                {mega === l.id && <motion.span layoutId="nav-underline" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-500" />}
              </NavLink>
            </div>
          ))}
        </motion.nav>

        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
          {/* Desktop: toggles the inline search; smaller screens: full-screen search */}
          <button
            type="button"
            onClick={() => {
              setMega(null);
              setSearching((s) => !s);
            }}
            className={cn('icon-btn hidden xl:inline-flex', searching && 'bg-brand-50 text-brand-700')}
            aria-label={searching ? t('nav.close') : t('nav.search')}
            aria-expanded={searching}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={searching ? 'x' : 's'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {searching ? <X className="size-5" /> : <Search className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className="icon-btn xl:hidden" aria-label={t('nav.search')}>
            <Search className="size-5" />
          </button>
          <LanguageSwitcher />
          <Link to={lp('/wishlist')} className="icon-btn hidden sm:inline-flex" aria-label={t('nav.wishlist')}>
            <Heart className="size-5" />
            {wishCount > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-brand-500" />}
          </Link>
          <button type="button" onClick={openCart} className="icon-btn" aria-label={`${t('nav.cart')} (${count})`}>
            <ShoppingBag className="size-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                  className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] leading-5 font-semibold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Soft veil over the page while a menu is open (moving onto it closes the menu) */}
      <AnimatePresence>
        {mega && (
          <motion.div
            key="veil"
            aria-hidden
            className="absolute inset-x-0 top-full hidden h-screen bg-ink/20 backdrop-blur-[2px] xl:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onMouseEnter={scheduleClose}
          />
        )}
      </AnimatePresence>
      <div onMouseEnter={() => clearTimeout(closeTimer.current)}>
        <AnimatePresence mode="wait">{mega && <MegaMenu key={mega} id={mega} onNavigate={() => setMega(null)} />}</AnimatePresence>
      </div>
    </header>
  );
}
