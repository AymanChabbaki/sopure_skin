import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Search, Heart, ShoppingBag, Menu, ChevronDown, ArrowRight } from 'lucide-react';
import { Logo } from '../ui/Logo.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { useCart, useCartCount } from '../../store/cart.js';
import { useWishlist } from '../../store/wishlist.js';
import { useUi } from '../../store/ui.js';
import { useBrands, useCategories } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { cn } from '../../lib/format.js';

function MegaMenu({ id, onNavigate }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const types = categories.filter((c) => c.kind === 'type');
  const routines = categories.filter((c) => c.kind === 'routine' && c.slug.split('-').length === 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="absolute inset-x-0 top-full border-t border-line bg-white shadow-soft"
    >
      <div className="container-x grid gap-10 py-10 lg:grid-cols-12">
        {id === 'shop' ? (
          <>
            <div className="lg:col-span-5">
              <p className="eyebrow mb-4">{t('nav.shopByType')}</p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {types.map((c) => (
                  <li key={c.id}>
                    <Link onClick={onNavigate} to={lp(`/category/${c.slug}`)} className="text-sm text-ink/80 transition hover:text-brand-600">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3">
              <p className="eyebrow mb-4">{t('nav.shopByRoutine')}</p>
              <ul className="space-y-2.5">
                {routines.map((c) => (
                  <li key={c.id}>
                    <Link onClick={onNavigate} to={lp(`/category/${c.slug}`)} className="text-sm text-ink/80 transition hover:text-brand-600">
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link onClick={onNavigate} to={lp('/shop')} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                    {t('nav.allProducts')} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
                  </Link>
                </li>
              </ul>
            </div>
            <Link
              onClick={onNavigate}
              to={lp('/shop?onSale=true')}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 via-brand-50 to-sand p-8 lg:col-span-4"
            >
              <p className="eyebrow">{t('nav.offers')}</p>
              <p className="mt-3 font-display text-3xl leading-tight text-ink">{t('home.offersTitle')}</p>
              <p className="mt-2 text-sm text-muted">{t('home.offersSubtitle')}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-700">
                {t('common.discover')} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:-scale-x-100" />
              </span>
              <div className="absolute -end-10 -bottom-10 size-40 rounded-full bg-brand-300/30 blur-2xl transition group-hover:scale-125" />
            </Link>
          </>
        ) : (
          <div className="lg:col-span-12">
            <div className="mb-5 flex items-center justify-between">
              <p className="eyebrow">{t('nav.brands')}</p>
              <Link onClick={onNavigate} to={lp('/brands')} className="text-sm font-medium text-brand-700">
                {t('nav.viewAll')}
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-2 xl:grid-cols-6">
              {brands.map((b) => (
                <li key={b.id}>
                  <Link
                    onClick={onNavigate}
                    to={lp(`/brand/${b.slug}`)}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {b.name}
                    <span className="text-xs text-muted">{b.productCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
  const closeTimer = useRef();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));
  useEffect(() => setMega(null), [pathname]);

  const openMega = (id) => {
    clearTimeout(closeTimer.current);
    setMega(id);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMega(null), 120);
  };

  const links = [
    { id: 'home', to: lp('/'), label: t('nav.home') },
    { id: 'shop', to: lp('/shop'), label: t('nav.shop'), mega: true },
    { id: 'brands', to: lp('/brands'), label: t('nav.brands'), mega: true },
    { id: 'best', to: lp('/shop?sort=popular'), label: t('nav.bestSellers'), query: 'sort=popular' },
    { id: 'new', to: lp('/shop?sort=newest'), label: t('nav.newArrivals'), query: 'sort=newest' },
    { id: 'offers', to: lp('/shop?onSale=true'), label: t('nav.offers'), accent: true, query: 'onSale=true' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled || mega ? 'bg-white/90 shadow-[0_1px_0_0_var(--color-line)] backdrop-blur-xl' : 'bg-white',
      )}
      onMouseLeave={scheduleClose}
    >
      <div className={cn('container-x flex items-center gap-4 transition-all duration-300', scrolled ? 'h-16' : 'h-16 lg:h-20')}>
        <button type="button" className="icon-btn -ms-2 xl:hidden" onClick={() => setMenuOpen(true)} aria-label={t('nav.menu')}>
          <Menu className="size-5" />
        </button>

        <Link to={lp('/')} className="shrink-0" aria-label="So Pure Skin">
          <Logo />
        </Link>

        <nav className="ms-6 hidden h-full items-center xl:flex" aria-label="Main">
          {links.map((l) => (
            <div key={l.id} className="h-full" onMouseEnter={() => (l.mega ? openMega(l.id) : setMega(null))}>
              <NavLink
                to={l.to}
                end
                className={({ isActive }) => {
                  // Several links share /shop: those with a filter are active only when it is applied
                  const active = l.query ? isActive && search.includes(l.query) : isActive && !(l.id === 'shop' && search);
                  return cn(
                    'relative flex h-full items-center gap-1 px-2.5 text-[13px] font-medium tracking-wide whitespace-nowrap uppercase transition-colors xl:px-3.5 rtl:text-sm rtl:normal-case',
                    l.accent ? 'text-brand-600 hover:text-brand-800' : 'text-ink/75 hover:text-ink',
                    (active || mega === l.id) && (l.accent ? 'text-brand-800' : 'text-ink'),
                  );
                }}
              >
                {l.label}
                {l.mega && <ChevronDown className={cn('size-3.5 transition-transform', mega === l.id && 'rotate-180')} />}
                {mega === l.id && <motion.span layoutId="nav-underline" className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-brand-500" />}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-full border border-line px-4 text-sm text-muted transition hover:border-brand-300 md:flex 2xl:w-56"
          >
            <Search className="size-4" />
            <span className="hidden 2xl:inline">{t('nav.search')}…</span>
          </button>
          <button type="button" onClick={() => setSearchOpen(true)} className="icon-btn md:hidden" aria-label={t('nav.search')}>
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

      <div onMouseEnter={() => clearTimeout(closeTimer.current)}>
        <AnimatePresence>{mega && <MegaMenu key={mega} id={mega} onNavigate={() => setMega(null)} />}</AnimatePresence>
      </div>
    </header>
  );
}
