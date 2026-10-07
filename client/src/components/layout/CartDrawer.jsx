import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag, Trash2, Truck, PartyPopper, ArrowRight } from 'lucide-react';
import { Drawer } from '../ui/Drawer.jsx';
import { QuantityInput } from '../ui/Primitives.jsx';
import { useCart, useCartCount, useCartSubtotal } from '../../store/cart.js';
import { useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { formatPrice } from '../../lib/format.js';

/** "Free delivery for more than N products" progress, shared by drawer and cart page. */
export function FreeShippingProgress({ count }) {
  const { t } = useTranslation();
  const { data } = useSettings();
  const threshold = (data?.shipping?.freeAboveItems ?? 5) + 1;
  const remaining = Math.max(threshold - count, 0);
  const pct = Math.min((count / threshold) * 100, 100);

  return (
    <div className="rounded-2xl bg-brand-50 p-4">
      <p className="flex items-center gap-2 text-sm text-brand-900">
        {remaining === 0 ? <PartyPopper className="size-4 shrink-0 text-brand-600" /> : <Truck className="size-4 shrink-0 text-brand-600" />}
        {remaining === 0 ? t('cart.freeUnlocked') : t('cart.freeProgress', { count: remaining })}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-brand-600 rtl:origin-right"
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function CartLine({ item, compact = false }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const close = useCart((s) => s.close);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      className="flex gap-4 py-4"
    >
      <Link to={lp(`/product/${item.slug}`)} onClick={close} className="size-20 shrink-0 overflow-hidden rounded-2xl bg-sand sm:size-24">
        {item.image && <img src={item.image} alt={item.name} className="size-full object-contain p-1.5 mix-blend-multiply" loading="lazy" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        {item.brand && <p className="text-[11px] tracking-[0.15em] text-brand-600 uppercase rtl:tracking-normal">{item.brand}</p>}
        <Link to={lp(`/product/${item.slug}`)} onClick={close} className="line-clamp-2 text-sm text-ink hover:text-brand-700">
          {item.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityInput size="sm" value={item.quantity} onChange={(q) => setQuantity(item.id, q)} />
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
            {!compact && (
              <button type="button" onClick={() => remove(item.id)} className="icon-btn size-8 text-muted" aria-label={t('cart.remove')}>
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export function CartDrawer() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { items, isOpen, close } = useCart();
  const count = useCartCount();
  const subtotal = useCartSubtotal();

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={`${t('cart.title')}${count ? ` (${count})` : ''}`}
      footer={
        items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t('cart.subtotal')}</span>
              <span className="text-lg font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-muted">
              {t('cart.shipping')}: {t('cart.shippingCalculated')}
            </p>
            <Link to={lp('/checkout')} onClick={close} className="btn-primary w-full py-4">
              {t('cart.checkout')}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
            <Link to={lp('/cart')} onClick={close} className="block text-center text-sm text-muted underline-offset-4 hover:underline">
              {t('cart.viewCart')}
            </Link>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-500"
          >
            <ShoppingBag className="size-8" />
          </motion.div>
          <p className="font-display text-2xl">{t('cart.empty')}</p>
          <p className="text-sm text-muted">{t('cart.emptyText')}</p>
          <Link to={lp('/shop')} onClick={close} className="btn-dark mt-2">
            {t('common.continueShopping')}
          </Link>
        </div>
      ) : (
        <div className="p-5">
          <FreeShippingProgress count={count} />
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </Drawer>
  );
}
