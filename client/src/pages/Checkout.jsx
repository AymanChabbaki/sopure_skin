import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Loader2, ShieldCheck, User, MapPin, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useCart, useCartCount, useCartSubtotal } from '../store/cart.js';
import { computeShipping, shippingZone, useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { api } from '../lib/api.js';
import { CITIES } from '../lib/cities.js';
import { cn, formatPrice } from '../lib/format.js';
import { track } from '../lib/pixel.js';
import { promoDiscount } from '../lib/promo.js';
import { PromoCode } from '../components/cart/PromoCode.jsx';

const OTHER = '__other__';
const PHONE_RE = /^(\+212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}$/;

function Field({ label, error, hint, children, className }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 text-xs text-red-600" role="alert">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const promo = useCart((s) => s.promo);
  const setPromo = useCart((s) => s.setPromo);
  const count = useCartCount();
  const subtotal = useCartSubtotal();

  // Meta Pixel: checkout started (once per visit of the page)
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !items.length) return;
    checkoutTracked.current = true;
    track('InitiateCheckout', { content_ids: [...new Set(items.map((i) => String(i.id)))], content_type: 'product', num_items: count, value: subtotal });
  }, [items, count, subtotal]);
  const { data: settings } = useSettings();
  // Set before the cart is cleared so the empty-cart guard does not redirect to /cart
  const placed = useRef(false);

  const schema = useMemo(
    () =>
      z
        .object({
          customerName: z.string().trim().min(2, t('checkout.errors.name')),
          phone: z.string().trim().regex(PHONE_RE, t('checkout.errors.phone')),
          email: z.union([z.literal(''), z.email(t('checkout.errors.email'))]),
          citySelect: z.string().min(1, t('checkout.errors.city')),
          cityOther: z.string().optional(),
          address: z.string().trim().min(5, t('checkout.errors.address')),
          notes: z.string().max(500).optional(),
          paymentMethod: z.enum(['cod', 'bank_transfer']),
        })
        .refine((v) => v.citySelect !== OTHER || (v.cityOther?.trim().length ?? 0) >= 2, {
          path: ['cityOther'],
          message: t('checkout.errors.city'),
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', phone: '', email: '', citySelect: '', cityOther: '', address: '', notes: '', paymentMethod: 'cod' },
  });

  const cityGroups = useMemo(() => {
    const sh = settings?.shipping;
    if (!sh?.zones) return [{ key: 'all', label: t('checkout.city'), fee: '', cities: CITIES }];
    const groups = [
      ...sh.zones.map((z) => ({ key: z.id, label: z.label?.[i18n.language] || z.label?.fr || z.id, fee: z.fee, cities: [] })),
      { key: 'other', label: t('shippingPage.other'), fee: sh.otherFee, cities: [] },
    ];
    for (const city of CITIES) groups.find((g) => g.key === (shippingZone(sh, city[0])?.id ?? 'other')).cities.push(city);
    return groups.filter((g) => g.cities.length);
  }, [settings, i18n.language, t]);

  const citySelect = useWatch({ control, name: 'citySelect' });
  const cityOther = useWatch({ control, name: 'cityOther' });
  const city = citySelect === OTHER ? cityOther : citySelect;
  const shipping = computeShipping(settings?.shipping, city, count);
  const { discount, below } = promoDiscount(promo, subtotal, shipping);
  const total = subtotal + (shipping ?? 0) - discount;

  const order = useMutation({
    mutationFn: (values) =>
      api('/orders', {
        method: 'POST',
        body: {
          customerName: values.customerName,
          phone: values.phone,
          email: values.email,
          city: values.citySelect === OTHER ? values.cityOther.trim() : values.citySelect,
          address: values.address,
          notes: values.notes,
          paymentMethod: values.paymentMethod,
          locale: i18n.language,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity, size: i.size || undefined })),
          // A code below its minimum is not sent: the order goes through at the normal price
          promoCode: promo && !below ? promo.code : undefined,
        },
      }),
    onSuccess: (result) => {
      placed.current = true;
      clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate(lp('/order/success'), { state: result, replace: true });
    },
    onError: (err) => {
      // The code stopped being valid since it was applied (expired, used up…): drop it so the next try goes through
      const reason = err.body?.details?.promo;
      if (reason) {
        setPromo(null);
        return toast.error(t(`promo.errors.${['expired', 'usedUp'].includes(reason) ? reason : 'invalid'}`), { description: t('promo.removed') });
      }
      toast.error(err.body?.error || t('common.error'));
    },
  });

  if (!items.length && !placed.current) return <Navigate to={lp('/cart')} replace />;

  return (
    <>
      <div className="container-x py-10 lg:py-14">
        <h1 className="font-display text-4xl sm:text-5xl">{t('checkout.title')}</h1>

        <form onSubmit={handleSubmit((v) => order.mutate(v))} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="min-w-0 space-y-8">
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-lg font-medium">
                <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <User className="size-4" />
                </span>
                {t('checkout.contact')}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('checkout.fullName')} error={errors.customerName?.message} className="sm:col-span-2">
                  <input {...register('customerName')} autoComplete="name" className={cn('input', errors.customerName && 'border-red-300')} />
                </Field>
                <Field label={t('checkout.phone')} error={errors.phone?.message}>
                  <input {...register('phone')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="06 12 34 56 78" className={cn('input', errors.phone && 'border-red-300')} />
                </Field>
                <Field label={t('checkout.email')} error={errors.email?.message} hint={t('checkout.emailHint')}>
                  <input {...register('email')} type="email" autoComplete="email" dir="ltr" className="input" />
                </Field>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6 sm:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-lg font-medium">
                <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <MapPin className="size-4" />
                </span>
                {t('checkout.delivery')}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('checkout.city')} error={errors.citySelect?.message}>
                  <select {...register('citySelect')} className={cn('input cursor-pointer', errors.citySelect && 'border-red-300')}>
                    <option value="">{t('checkout.cityPlaceholder')}</option>
                    {/* Grouped by delivery zone with its fee, so the price is known before choosing */}
                    {cityGroups.map((g) => (
                      <optgroup key={g.key} label={`${g.label} · ${g.fee} ${t('common.currency')}`}>
                        {g.cities.map(([fr, ar]) => (
                          <option key={fr} value={fr}>
                            {i18n.language === 'ar' ? ar : fr}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value={OTHER}>{t('checkout.otherCity')}</option>
                  </select>
                </Field>
                <AnimatePresence>
                  {citySelect === OTHER && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Field label={t('checkout.otherCity')} error={errors.cityOther?.message}>
                        <input {...register('cityOther')} autoComplete="address-level2" className="input" />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Field label={t('checkout.address')} error={errors.address?.message} className="sm:col-span-2">
                  <textarea {...register('address')} rows={3} autoComplete="street-address" placeholder={t('checkout.addressPlaceholder')} className={cn('input resize-none', errors.address && 'border-red-300')} />
                </Field>
                <Field label={t('checkout.notes')} className="sm:col-span-2">
                  <input {...register('notes')} className="input" />
                </Field>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="card p-6 sm:p-8">
              <fieldset className="space-y-3">
                <legend className="mb-5 flex items-center gap-2 text-lg font-medium"><Banknote className="size-5" />{t('checkout.payment')}</legend>
                {[['cod', 'cod'], ['bank_transfer', 'transfer']].map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 has-checked:border-brand-500 has-checked:bg-brand-50">
                    <input type="radio" value={value} {...register('paymentMethod')} className="mt-1 accent-brand-600" />
                    <span>
                      <span className="block font-medium">{t(`checkout.${label}`)}</span>
                      <span className="mt-1 block text-sm text-muted">{t(`checkout.${label}Text`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </motion.section>
          </div>

          <aside className="h-fit lg:sticky lg:top-28">
            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-2xl">{t('checkout.summary')}</h2>
              <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto pe-1">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center gap-3">
                    <span className="relative size-16 shrink-0 rounded-xl bg-sand">
                      {item.image && <img src={item.image} alt="" className="size-full rounded-xl object-contain p-1 mix-blend-multiply" />}
                      <span className="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] text-white">{item.quantity}</span>
                    </span>
                    <span className="flex-1 text-sm">
                      <span className="line-clamp-2">{item.name}</span>
                      {item.size && <span className="text-xs text-muted">{item.size}</span>}
                    </span>
                    <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-line pt-4">
                <PromoCode />
              </div>
              <dl className="mt-4 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">{t('cart.subtotal')}</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t('cart.shipping')}</dt>
                  <dd>
                    <AnimatePresence mode="wait">
                      <motion.span key={String(shipping)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-block">
                        {shipping === null ? (
                          <span className="text-xs text-muted">{t('checkout.cityPlaceholder')}</span>
                        ) : shipping === 0 ? (
                          <span className="font-medium text-emerald-700">{t('common.free')}</span>
                        ) : (
                          formatPrice(shipping)
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted">
                      {t('promo.discount')} <span className="font-mono text-xs">({promo.code})</span>
                    </dt>
                    <dd className="font-medium text-emerald-700">−{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-4 text-base">
                  <dt className="font-medium">{t('cart.total')}</dt>
                  <dd className="text-xl font-semibold text-brand-700">{formatPrice(total)}</dd>
                </div>
              </dl>
              <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={order.isPending} className="btn-primary mt-6 w-full py-4 text-base">
                {order.isPending ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
                {order.isPending ? t('checkout.placing') : t('checkout.placeOrder')}
              </motion.button>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted">
                <ShieldCheck className="size-4 shrink-0 text-brand-600" /> {t('checkout.secure')}
              </p>
            </div>
            <Link to={lp('/cart')} className="mt-4 block text-center text-sm text-muted hover:text-ink">
              {t('cart.viewCart')}
            </Link>
          </aside>
        </form>
      </div>
    </>
  );
}
