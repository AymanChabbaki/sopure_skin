import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, TicketPercent, X } from 'lucide-react';
import { useCart, useCartSubtotal } from '../../store/cart.js';
import { api } from '../../lib/api.js';
import { promoDiscount } from '../../lib/promo.js';
import { formatPrice } from '../../lib/format.js';

/** What the code gives, in the customer's words ("−10%", "−50 DH", "Livraison offerte"). */
export function promoLabel(t, promo) {
  if (promo.type === 'percent') return `−${promo.value}%`;
  if (promo.type === 'fixed') return `−${formatPrice(promo.value)}`;
  return t('promo.freeShipping');
}

/**
 * Promo code field (cart and checkout). The code is checked by /api/promo and kept with the cart;
 * the order route checks it again and computes the real discount.
 */
export function PromoCode() {
  const { t } = useTranslation();
  const promo = useCart((s) => s.promo);
  const setPromo = useCart((s) => s.setPromo);
  const subtotal = useCartSubtotal();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { below } = promoDiscount(promo, subtotal, 0);

  const apply = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      setPromo(await api('/promo', { method: 'POST', body: { code: code.trim(), subtotal } }));
      setCode('');
      setOpen(false);
    } catch (err) {
      const reason = err.body?.details?.promo;
      setError(t(`promo.errors.${['expired', 'usedUp'].includes(reason) ? reason : 'invalid'}`));
    } finally {
      setLoading(false);
    }
  };

  if (promo) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <TicketPercent className="size-4 shrink-0 text-emerald-700" />
          <span className="font-mono text-sm font-semibold text-emerald-800">{promo.code}</span>
          <span className="text-sm text-emerald-700">{promoLabel(t, promo)}</span>
          <button type="button" onClick={() => setPromo(null)} className="ms-auto grid size-7 place-items-center rounded-full text-emerald-800 hover:bg-emerald-100" aria-label={t('promo.remove')}>
            <X className="size-4" />
          </button>
        </div>
        {below > 0 && <p className="mt-1.5 text-xs text-amber-700">{t('promo.below', { amount: formatPrice(below) })}</p>}
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
          <TicketPercent className="size-4" /> {t('promo.question')}
        </button>
      ) : (
        <AnimatePresence>
          <motion.form initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} onSubmit={apply} className="flex gap-2">
            <label className="sr-only" htmlFor="promo-code">{t('promo.label')}</label>
            <input
              id="promo-code"
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder={t('promo.placeholder')}
              autoComplete="off"
              autoCapitalize="characters"
              className="input min-w-0 flex-1 py-2.5 font-mono uppercase placeholder:font-sans placeholder:normal-case"
            />
            <button type="submit" disabled={loading || !code.trim()} className="btn-outline shrink-0 px-4 py-2.5 disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : t('promo.apply')}
            </button>
          </motion.form>
        </AnimatePresence>
      )}
      {error && <p className="mt-1.5 text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
