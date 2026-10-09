import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { useCart, useCartCount, useCartSubtotal } from '../../store/cart.js';
import { cn, formatPrice } from '../../lib/format.js';

/**
 * Floating cart button stacked above the WhatsApp button (inline-end side).
 * Bounces with a "+n" bubble whenever products are added; shows the total on hover (desktop).
 */
export function FloatingCart() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const count = useCartCount();
  const subtotal = useCartSubtotal();
  const isOpen = useCart((s) => s.isOpen);
  const open = useCart((s) => s.open);
  const [scope, animate] = useAnimate();
  const [bump, setBump] = useState(null);
  const previous = useRef(count);

  useEffect(() => {
    const added = count - previous.current;
    previous.current = count;
    if (added <= 0 || !scope.current) return;
    animate(scope.current, { scale: [1, 1.25, 0.92, 1.06, 1], rotate: [0, -12, 10, -5, 0] }, { duration: 0.6 });
    setBump({ id: Date.now(), added });
  }, [count, animate, scope]);

  // Mobile product pages have a sticky purchase bar: sit higher there (like the WhatsApp button below)
  const onProduct = pathname.includes('/product/');

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.4 }}
          className={cn('fixed end-4 z-30 md:end-6 md:bottom-24', onProduct ? 'bottom-56' : 'bottom-36')}
        >
          <button
            ref={scope}
            type="button"
            onClick={open}
            aria-label={`${t('nav.cart')} (${count})`}
            className="group relative flex h-13 items-center gap-2 rounded-full bg-brand-500 ps-3.5 pe-3.5 text-white shadow-lift transition-[padding,background-color] duration-300 hover:bg-brand-600 md:hover:pe-5"
          >
            <ShoppingBag className="size-[22px] shrink-0" />
            {/* Total, revealed on hover */}
            {count > 0 && (
              <span className="hidden max-w-0 overflow-hidden text-sm font-semibold whitespace-nowrap transition-[max-width] duration-300 group-hover:max-w-40 md:inline">
                {formatPrice(subtotal)}
              </span>
            )}
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 14 }}
                  className="absolute -end-1 -top-1 grid min-w-[22px] place-items-center rounded-full border-2 border-white bg-ink px-1 text-[11px] leading-[18px] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* "+n" bubble floating up on every add */}
          <AnimatePresence>
            {bump && (
              <motion.span
                key={bump.id}
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], y: -46, scale: 1 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                onAnimationComplete={() => setBump(null)}
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-700 shadow-soft"
                aria-hidden
              >
                +{bump.added}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
