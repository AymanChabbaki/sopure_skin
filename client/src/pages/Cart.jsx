import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { CartLine, FreeShippingProgress } from '../components/layout/CartDrawer.jsx';
import { PageHeader } from '../components/ui/Primitives.jsx';
import { Seo } from '../components/ui/Seo.jsx';
import { useCart, useCartCount, useCartSubtotal } from '../store/cart.js';
import { useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { formatPrice } from '../lib/format.js';

export default function Cart() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const items = useCart((s) => s.items);
  const count = useCartCount();
  const subtotal = useCartSubtotal();
  const { data: settings } = useSettings();
  const s = settings?.shipping;

  return (
    <>
      <Seo title={t('cart.title')} noindex />
      <PageHeader title={t('cart.title')} />
      <div className="container-x pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-500">
              <ShoppingBag className="size-8" />
            </span>
            <p className="mt-5 font-display text-3xl">{t('cart.empty')}</p>
            <p className="mt-2 text-muted">{t('cart.emptyText')}</p>
            <Link to={lp('/shop')} className="btn-dark mt-6">
              {t('common.continueShopping')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              <FreeShippingProgress count={count} />
              <ul className="mt-2 divide-y divide-line">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <CartLine key={item.id} item={item} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
            <aside className="card h-fit p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-2xl">{t('checkout.summary')}</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">{t('cart.subtotal')}</dt>
                  <dd className="font-medium">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t('cart.shipping')}</dt>
                  <dd className="text-end">
                    {s && count > s.freeAboveItems ? (
                      <span className="font-medium text-emerald-700">{t('common.free')}</span>
                    ) : (
                      <span className="text-xs text-muted">{t('product.deliveryInfo', { casa: s?.casablancaFee ?? 20, other: s?.otherFee ?? 35 })}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <Link to={lp('/checkout')} className="btn-primary mt-6 w-full py-4">
                {t('cart.checkout')} <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
              <p className="mt-4 text-center text-xs text-muted">{t('checkout.secure')}</p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
