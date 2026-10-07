import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Home, Store, Search, Heart, ShoppingBag, ChevronDown, Phone } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa6';
import { Drawer } from '../ui/Drawer.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { useUi } from '../../store/ui.js';
import { useCart, useCartCount } from '../../store/cart.js';
import { useCategories, useBrands, useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { cn } from '../../lib/format.js';

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-start text-base font-medium" aria-expanded={open}>
        {title}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenu() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const open = useUi((s) => s.menuOpen);
  const setOpen = useUi((s) => s.setMenuOpen);
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: settings } = useSettings();
  const close = () => setOpen(false);
  const linkCls = 'block py-2 text-sm text-ink/75 hover:text-brand-600';

  return (
    <Drawer open={open} onClose={close} title={t('nav.menu')} side="start">
      <nav className="px-5" aria-label="Mobile">
        <Link to={lp('/')} onClick={close} className="block border-b border-line py-4 text-base font-medium">
          {t('nav.home')}
        </Link>
        <Link to={lp('/shop')} onClick={close} className="block border-b border-line py-4 text-base font-medium">
          {t('nav.allProducts')}
        </Link>
        <Accordion title={t('nav.categories')}>
          {categories.filter((c) => c.kind === 'type').map((c) => (
            <Link key={c.id} to={lp(`/category/${c.slug}`)} onClick={close} className={linkCls}>
              {c.name}
            </Link>
          ))}
        </Accordion>
        <Accordion title={t('nav.routines')}>
          {categories.filter((c) => c.kind === 'routine').map((c) => (
            <Link key={c.id} to={lp(`/category/${c.slug}`)} onClick={close} className={linkCls}>
              {c.name}
            </Link>
          ))}
        </Accordion>
        <Accordion title={t('nav.brands')}>
          <div className="grid grid-cols-2">
            {brands.map((b) => (
              <Link key={b.id} to={lp(`/brand/${b.slug}`)} onClick={close} className={linkCls}>
                {b.name}
              </Link>
            ))}
          </div>
        </Accordion>
        {[
          ['/shop?sort=popular', t('nav.bestSellers')],
          ['/shop?sort=newest', t('nav.newArrivals')],
          ['/shop?onSale=true', t('nav.offers')],
          ['/about', t('nav.about')],
          ['/faq', t('nav.faq')],
          ['/contact', t('nav.contact')],
        ].map(([to, label]) => (
          <Link key={to} to={lp(to)} onClick={close} className="block border-b border-line py-4 text-base font-medium">
            {label}
          </Link>
        ))}
        <div className="py-6">
          <p className="label">{t('common.language')}</p>
          <LanguageSwitcher variant="pills" />
        </div>
        {settings?.contact && (
          <div className="flex gap-2 pb-8">
            <a href={`https://wa.me/${settings.contact.whatsapp}`} target="_blank" rel="noreferrer" className="btn-outline flex-1 px-3" aria-label="WhatsApp">
              <FaWhatsapp className="size-4 text-[#25D366]" /> WhatsApp
            </a>
            <a href={`tel:${settings.contact.phone.replace(/\s/g, '')}`} className="btn-outline px-4" aria-label={t('contact.phone')}>
              <Phone className="size-4" />
            </a>
            {settings.contact.instagram && (
              <a href={settings.contact.instagram} target="_blank" rel="noreferrer" className="btn-outline px-4" aria-label="Instagram">
                <FaInstagram className="size-4" />
              </a>
            )}
          </div>
        )}
      </nav>
    </Drawer>
  );
}

/** App-like bottom tab bar on phones. */
export function MobileBottomNav() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const count = useCartCount();
  const openCart = useCart((s) => s.open);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const item = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors';
  const active = ({ isActive }) => cn(item, isActive ? 'text-brand-600' : 'text-muted');

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Quick">
      <div className="flex">
        <NavLink to={lp('/')} end className={active}>
          <Home className="size-5" /> {t('nav.home')}
        </NavLink>
        <NavLink to={lp('/shop')} className={active}>
          <Store className="size-5" /> {t('nav.shop')}
        </NavLink>
        <button type="button" onClick={() => setSearchOpen(true)} className={cn(item, 'text-muted')}>
          <Search className="size-5" /> {t('nav.search')}
        </button>
        <NavLink to={lp('/wishlist')} className={active}>
          <Heart className="size-5" /> {t('nav.wishlist')}
        </NavLink>
        <button type="button" onClick={openCart} className={cn(item, 'relative text-muted')}>
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute top-1 left-1/2 ms-2 grid min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] leading-4 text-white">
              {count}
            </span>
          )}
          {t('nav.cart')}
        </button>
      </div>
    </nav>
  );
}
