import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, ArrowRight, Check, Loader2 } from 'lucide-react';
import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'sonner';
import { LogoMark } from '../ui/Logo.jsx';
import { useCategories, useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { api } from '../../lib/api.js';
import { SLOGAN } from '../../lib/brand.js';

export function NewsletterForm({ dark = false }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    setState('loading');
    try {
      await api('/newsletter', { method: 'POST', body: { email, locale: i18n.language } });
      setState('done');
      setEmail('');
      toast.success(t('home.newsletterSuccess'));
    } catch {
      setState('idle');
      toast.error(t('common.error'));
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <label className="sr-only" htmlFor={`nl-${dark}`}>
        {t('home.newsletterPlaceholder')}
      </label>
      <input
        id={`nl-${dark}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('home.newsletterPlaceholder')}
        className={dark ? 'input border-white/15 bg-white/10 text-white placeholder:text-white/50 focus:ring-white/10' : 'input'}
      />
      <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={state === 'loading'} className="btn-primary shrink-0 px-5" aria-label={t('home.newsletterCta')}>
        {state === 'loading' ? <Loader2 className="size-4 animate-spin" /> : state === 'done' ? <Check className="size-4" /> : <ArrowRight className="size-4 rtl:-scale-x-100" />}
        <span className="hidden sm:inline">{t('home.newsletterCta')}</span>
      </motion.button>
    </form>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const c = settings?.contact;

  const socials = c
    ? [
        [c.instagram, FaInstagram, 'Instagram'],
        [c.facebook, FaFacebookF, 'Facebook'],
        [c.tiktok, FaTiktok, 'TikTok'],
        [c.whatsapp && `https://wa.me/${c.whatsapp}`, FaWhatsapp, 'WhatsApp'],
      ].filter(([href]) => href)
    : [];

  return (
    <footer className="bg-brand-950 pb-24 text-white/70 md:pb-0" style={{ '--logo-bg': 'var(--color-brand-950)' }}>
      <div className="container-x grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <LogoMark className="size-24 text-white" />
          <p className="mt-6 font-serif text-2xl leading-snug text-white italic" dir="ltr">{SLOGAN.full}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{t('footer.about')}</p>
          <div className="mt-6 flex gap-2">
            {socials.map(([href, Icon, label]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-brand-400 hover:bg-brand-500 hover:text-white">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
          <div>
            <h3 className="mb-4 text-sm font-medium text-white">{t('footer.shop')}</h3>
            <ul className="space-y-2.5 text-sm">
              {categories.filter((x) => x.kind === 'type').slice(0, 7).map((x) => (
                <li key={x.id}>
                  <Link to={lp(`/category/${x.slug}`)} className="transition hover:text-brand-300">
                    {x.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-medium text-white">{t('footer.help')}</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ['/shipping', t('nav.shipping')],
                ['/faq', t('nav.faq')],
                ['/contact', t('nav.contact')],
                ['/about', t('nav.about')],
                ['/brands', t('nav.brands')],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={lp(to)} className="transition hover:text-brand-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {c && (
            <address className="col-span-2 space-y-3 text-sm not-italic sm:col-span-1">
              <h3 className="mb-4 text-sm font-medium text-white">{t('nav.contact')}</h3>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-brand-300" dir="ltr">
                <Phone className="size-4 shrink-0" /> {c.phone}
              </a>
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 break-all hover:text-brand-300">
                <Mail className="size-4 shrink-0" /> {c.email}
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" /> {t('footer.madeIn')}
              </p>
            </address>
          )}
        </div>

        <div className="lg:col-span-3">
          <h3 className="font-display text-2xl text-white">{t('home.newsletterTitle')}</h3>
          <p className="mt-2 mb-5 text-sm">{t('home.newsletterText')}</p>
          <NewsletterForm dark />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} So Pure Skin. {t('footer.rights')}
          </p>
          <p>{t('hero.trust2')} · {t('hero.trust3')}</p>
        </div>
      </div>
    </footer>
  );
}
