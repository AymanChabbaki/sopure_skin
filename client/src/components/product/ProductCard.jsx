import { memo } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCart } from '../../store/cart.js';
import { useWishlist } from '../../store/wishlist.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { cn, discountPercent } from '../../lib/format.js';
import { Price } from '../ui/Primitives.jsx';
import { Stars } from '../ui/Stars.jsx';

function ProductCardBase({ product, priority = false }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const add = useCart((s) => s.add);
  const liked = useWishlist((s) => s.ids.includes(product.id));
  const toggleWish = useWishlist((s) => s.toggle);
  const [first, second] = product.images;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const href = lp(`/product/${product.slug}`);

  const onAdd = (e) => {
    e.preventDefault();
    add(product);
    toast.success(t('common.added'), { description: product.name });
  };

  return (
    <article className="group relative flex flex-col">
      <Link
        to={href}
        className="relative block aspect-[4/5] overflow-hidden rounded-3xl bg-sand"
        aria-label={product.name}
        viewTransition
      >
        {first ? (
          <>
            <img
              src={first.thumbUrl || first.url}
              alt={first.alt || product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              width="480"
              height="600"
              className={cn(
                'absolute inset-0 size-full object-contain p-4 mix-blend-multiply transition duration-700 ease-out group-hover:scale-105',
                second && 'group-hover:opacity-0',
              )}
            />
            {second && (
              <img
                src={second.thumbUrl || second.url}
                alt=""
                loading="lazy"
                decoding="async"
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover opacity-0 transition duration-700 ease-out group-hover:scale-105 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <ShoppingBag className="size-10 opacity-30" />
          </div>
        )}

        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white">-{discount}%</span>
          )}
          {product.isNew && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink backdrop-blur">{t('common.new')}</span>
          )}
          {!product.inStock && (
            <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-white">{t('common.outOfStock')}</span>
          )}
        </div>

        {product.inStock && (
          <button
            type="button"
            onClick={onAdd}
            className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 py-3 text-sm font-medium text-ink opacity-0 shadow-soft backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-brand-500 hover:text-white md:flex"
          >
            <ShoppingBag className="size-4" />
            {t('common.addToCart')}
          </button>
        )}
      </Link>

      <motion.button
        type="button"
        whileTap={{ scale: 0.8 }}
        onClick={() => toggleWish(product.id)}
        aria-label={liked ? t('common.removeFromWishlist') : t('common.addToWishlist')}
        aria-pressed={liked}
        className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition hover:text-brand-600"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={liked ? 'on' : 'off'}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          >
            <Heart className={cn('size-4', liked && 'fill-brand-500 text-brand-500')} />
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-1">
        {product.brand && (
          <Link
            to={lp(`/brand/${product.brand.slug}`)}
            className="text-[11px] font-medium tracking-[0.18em] text-brand-600 uppercase hover:text-brand-800 rtl:tracking-normal"
          >
            {product.brand.name}
          </Link>
        )}
        <Link to={href} className="line-clamp-2 text-sm leading-snug text-ink hover:text-brand-700 sm:text-[15px]">
          {product.name}
        </Link>
        {product.ratingCount > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <Stars value={product.rating} size={12} />
            <span className="tabular-nums">({product.ratingCount})</span>
          </span>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price price={product.price} compareAt={product.compareAtPrice} size="sm" />
          {product.inStock && (
            <button
              type="button"
              onClick={onAdd}
              aria-label={t('common.quickAdd')}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition active:scale-90 md:hidden"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);
