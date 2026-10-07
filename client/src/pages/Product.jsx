import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import { Heart, ShoppingBag, Truck, HandCoins, BadgeCheck, Zap, Share2, Gift, PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { ProductCarousel } from '../components/product/ProductGrid.jsx';
import { Price, QuantityInput, SectionHeading, Skeleton } from '../components/ui/Primitives.jsx';
import { Seo } from '../components/ui/Seo.jsx';
import { Stars } from '../components/ui/Stars.jsx';
import { Reviews } from '../components/product/Reviews.jsx';
import { useProduct, useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { useCart } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';
import { cn, discountPercent, formatPrice } from '../lib/format.js';

function Gallery({ images, name }) {
  const { i18n } = useTranslation();
  const [emblaRef, embla] = useEmblaCarousel({ direction: i18n.dir() });
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(null);

  const onSelect = useCallback((api) => setIndex(api.selectedScrollSnap()), []);
  useEffect(() => {
    if (!embla) return undefined;
    embla.on('select', onSelect);
    return () => embla.off('select', onSelect);
  }, [embla, onSelect]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto lg:max-h-[600px] lg:flex-col lg:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => embla?.scrollTo(i)}
              aria-label={`${name} ${i + 1}`}
              className={cn(
                'size-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-sand transition',
                i === index ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={img.thumbUrl} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1 overflow-hidden rounded-[2rem] bg-sand" ref={emblaRef}>
        <div className="flex">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="relative aspect-square min-w-0 shrink-0 basis-full cursor-zoom-in overflow-hidden"
              onMouseMove={onMove}
              onMouseLeave={() => setZoom(null)}
            >
              <img
                src={img.url}
                alt={img.alt || name}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="size-full object-contain mix-blend-multiply transition-transform duration-200"
                style={zoom && i === index ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden">
            {images.map((img, i) => (
              <span key={img.url} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-brand-500' : 'w-1.5 bg-ink/20')} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tabs({ product }) {
  const { t } = useTranslation();
  const tabs = [
    ['description', t('product.description'), product.description],
    ['howToUse', t('product.howToUse'), product.howToUse],
    ['ingredients', t('product.ingredients'), product.ingredients],
  ].filter(([, , content]) => content);
  const [active, setActive] = useState(tabs[0]?.[0]);
  if (!tabs.length) return null;
  const content = tabs.find(([k]) => k === active)?.[2] || '';

  return (
    <div className="mt-10">
      <div className="flex gap-6 border-b border-line" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key)}
            className={cn('relative pb-3 text-sm font-medium transition', active === key ? 'text-ink' : 'text-muted hover:text-ink')}
          >
            {label}
            {active === key && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="prose-sps pt-6 text-[15px] leading-relaxed text-ink/80"
        >
          {content.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useProduct(slug);
  const { data: settings } = useSettings();
  const add = useCart((s) => s.add);
  const close = useCart((s) => s.close);
  const [qty, setQty] = useState(1);
  const product = data?.product;
  const liked = useWishlist((s) => (product ? s.ids.includes(product.id) : false));
  const toggleWish = useWishlist((s) => s.toggle);

  useEffect(() => setQty(1), [slug]);

  if (isLoading) {
    return (
      <div className="container-x grid gap-10 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-[2rem]" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-x flex flex-col items-center py-24 text-center">
        <Seo title={t('notFound.title')} noindex />
        <PackageX className="size-14 text-brand-200" strokeWidth={1.25} />
        <p className="mt-4 text-muted">{error?.status === 404 ? t('product.notFound') : t('common.error')}</p>
        <Link to={lp('/shop')} className="btn-dark mt-6">
          {t('common.continueShopping')}
        </Link>
      </div>
    );
  }

  const discount = discountPercent(product.price, product.compareAtPrice);
  const s = settings?.shipping;
  const typeCategory = product.categories.find((c) => c.kind === 'type');

  const addToCart = () => {
    add(product, qty);
    toast.success(t('common.added'), { description: product.name });
  };
  const buyNow = () => {
    add(product, qty);
    close();
    navigate(lp('/checkout'));
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  const description = product.metaDescription || product.shortDescription || product.description.slice(0, 160);

  return (
    <>
      <Seo
        title={product.metaTitle || product.name}
        description={description}
        image={product.images[0]?.url}
        type="product"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description || description,
            image: product.images.map((i) => i.url),
            sku: product.sku || String(product.id),
            brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'MAD',
              price: product.price,
              availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: window.location.href,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t('nav.home'), item: `${window.location.origin}${lp('/')}` },
              { '@type': 'ListItem', position: 2, name: t('nav.shop'), item: `${window.location.origin}${lp('/shop')}` },
              { '@type': 'ListItem', position: 3, name: product.name },
            ],
          },
        ]}
      />

      <div className="container-x py-6 lg:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 truncate text-xs text-muted">
          <Link to={lp('/')} className="hover:text-brand-600">
            {t('nav.home')}
          </Link>
          <span className="mx-2">/</span>
          {typeCategory ? (
            <Link to={lp(`/category/${typeCategory.slug}`)} className="hover:text-brand-600">
              {typeCategory.name}
            </Link>
          ) : (
            <Link to={lp('/shop')} className="hover:text-brand-600">
              {t('nav.shop')}
            </Link>
          )}
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <Gallery images={product.images} name={product.name} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="min-w-0">
            {product.brand && (
              <Link to={lp(`/brand/${product.brand.slug}`)} className="eyebrow hover:text-brand-800">
                {product.brand.name}
              </Link>
            )}
            <h1 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">{product.name}</h1>
            {product.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-brand-700">
                <Stars value={product.rating} size={16} />
                <span className="font-medium text-ink">{Number(product.rating).toFixed(1)}</span>
                <span className="underline-offset-4 hover:underline">({t('reviews.count', { count: product.ratingCount })})</span>
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Price price={product.price} compareAt={product.compareAtPrice} size="lg" />
              {discount > 0 && (
                <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                  {t('product.save', { amount: product.compareAtPrice - product.price })}
                </span>
              )}
            </div>

            <p className={cn('mt-3 flex items-center gap-2 text-sm', product.inStock ? 'text-emerald-700' : 'text-red-600')}>
              <span className={cn('size-2 rounded-full', product.inStock ? 'animate-pulse bg-emerald-500' : 'bg-red-500')} />
              {!product.inStock ? t('common.outOfStock') : product.stock <= 5 ? t('common.lowStock', { count: product.stock }) : t('common.inStock')}
            </p>

            {product.shortDescription && <p className="mt-6 leading-relaxed text-ink/75">{product.shortDescription}</p>}

            {product.inStock && (
              <div className="mt-8 space-y-3">
                <div className="flex gap-3">
                  <QuantityInput value={qty} onChange={setQty} max={Math.min(product.stock, 50)} />
                  <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={addToCart} className="btn-primary flex-1 py-4">
                    <ShoppingBag className="size-4" /> {t('common.addToCart')}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    type="button"
                    onClick={() => toggleWish(product.id)}
                    className="icon-btn size-[52px] shrink-0 border border-line"
                    aria-pressed={liked}
                    aria-label={liked ? t('common.removeFromWishlist') : t('common.addToWishlist')}
                  >
                    <Heart className={cn('size-5', liked && 'fill-brand-500 text-brand-500')} />
                  </motion.button>
                </div>
                <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={buyNow} className="btn-dark w-full py-4">
                  <Zap className="size-4" /> {t('product.buyNow')} · {formatPrice(product.price * qty)}
                </motion.button>
              </div>
            )}

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [Truck, t('product.deliveryInfo', { casa: s?.casablancaFee ?? 20, other: s?.otherFee ?? 35 })],
                [Gift, t('product.freeInfo', { count: s?.freeAboveItems ?? 5 })],
                [HandCoins, t('product.codInfo')],
                [BadgeCheck, t('product.authenticInfo')],
              ].map(([Icon, text]) => (
                <li key={text} className="flex items-center gap-3 rounded-2xl bg-brand-50/70 p-3.5 text-[13px] text-brand-950">
                  <Icon className="size-5 shrink-0 text-brand-600" strokeWidth={1.75} />
                  {text}
                </li>
              ))}
            </ul>

            <button type="button" onClick={share} className="mt-6 inline-flex items-center gap-2 text-sm text-muted hover:text-brand-700">
              <Share2 className="size-4" /> {t('product.share')}
            </button>

            <Tabs product={product} />
          </motion.div>
        </div>

        <Reviews slug={product.slug} />

        {data.related.length > 0 && (
          <section className="pt-20 pb-10">
            <SectionHeading title={t('product.related')} />
            <ProductCarousel products={data.related} />
          </section>
        )}
      </div>

      {/* Sticky mobile purchase bar */}
      {product.inStock && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{product.name}</p>
            <Price price={product.price} compareAt={product.compareAtPrice} size="sm" />
          </div>
          <button type="button" onClick={addToCart} className="btn-primary px-5 py-3">
            <ShoppingBag className="size-4" /> {t('common.addToCart')}
          </button>
        </div>
      )}
    </>
  );
}
