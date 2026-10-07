import { Link, Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { Seo } from '../components/ui/Seo.jsx';
import { useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { formatPrice } from '../lib/format.js';

export default function OrderSuccess() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { state: order } = useLocation();
  const { data: settings } = useSettings();

  if (!order?.number) return <Navigate to={lp('/')} replace />;
  const wa = settings?.contact?.whatsapp;

  return (
    <div className="container-x flex flex-col items-center py-20 text-center">
      <Seo title={t('success.title')} noindex />
      <div className="relative">
        {Array.from({ length: 12 }, (_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute top-1/2 left-1/2 size-2 rounded-full bg-brand-400"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos((i / 12) * Math.PI * 2) * 90, y: Math.sin((i / 12) * Math.PI * 2) * 90, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="grid size-24 place-items-center rounded-full bg-brand-500 text-white shadow-lift"
        >
          <motion.span initial={{ pathLength: 0, scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: 0.25 }}>
            <Check className="size-11" strokeWidth={2.5} />
          </motion.span>
        </motion.div>
      </div>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 font-display text-4xl sm:text-5xl">
        {t('success.title')}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-4 max-w-lg text-muted">
        {t('success.text', { number: order.number })}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="card mt-8 w-full max-w-sm p-6">
        <p className="text-sm text-muted">{t('success.total')}</p>
        <p className="mt-1 text-3xl font-semibold text-brand-700">{formatPrice(order.total)}</p>
        <p className="mt-2 text-xs text-muted">
          {t('cart.subtotal')} {formatPrice(order.subtotal)} · {t('cart.shipping')} {order.shippingFee ? formatPrice(order.shippingFee) : t('common.free')}
        </p>
      </motion.div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Commande ${order.number}`)}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
            <FaWhatsapp className="size-4" /> {t('success.whatsapp')}
          </a>
        )}
        <Link to={lp('/shop')} className="btn-outline">
          {t('common.continueShopping')}
        </Link>
      </div>
    </div>
  );
}
