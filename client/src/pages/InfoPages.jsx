import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Plus, Phone, Mail, MapPin, Clock, Truck, HandCoins, Gift, Timer, BadgeCheck, MessagesSquare, Sparkles, ArrowRight, ScrollText, RotateCcw, ShieldCheck } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { ProductGrid } from '../components/product/ProductGrid.jsx';
import { PageHeader } from '../components/ui/Primitives.jsx';
import { Reveal, staggerContainer, staggerItem } from '../components/ui/Reveal.jsx';
import { LogoMark } from '../components/ui/Logo.jsx';
import { BrandLogo } from '../components/ui/BrandLogo.jsx';
import { Seo } from '../components/ui/Seo.jsx';
import { useBrands, useProducts, useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { useWishlist } from '../store/wishlist.js';
import { cn } from '../lib/format.js';
import { POLICIES_UPDATED, POLICY_SECTIONS } from '../lib/policies.js';

export function Wishlist() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const ids = useWishlist((s) => s.ids);
  const { data, isLoading } = useProducts({ ids: ids.join(','), limit: 100 }, { enabled: ids.length > 0 });

  return (
    <>
      <PageHeader title={t('wishlist.title')} />
      <div className="container-x pb-24">
        {ids.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-500">
              <Heart className="size-8" />
            </span>
            <p className="mt-5 text-muted">{t('wishlist.empty')}</p>
            <Link to={lp('/shop')} className="btn-dark mt-6">
              {t('common.continueShopping')}
            </Link>
          </div>
        ) : (
          <ProductGrid products={data?.rows ?? []} loading={isLoading} skeletons={Math.min(ids.length, 8)} />
        )}
      </div>
    </>
  );
}

export function Brands() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data = [] } = useBrands();
  const groups = data.reduce((acc, b) => {
    const letter = /[a-z]/i.test(b.name[0]) ? b.name[0].toUpperCase() : '#';
    (acc[letter] ||= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title={t('brandsPage.title')} subtitle={t('brandsPage.subtitle')} />
      <div className="container-x pb-24">
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {[...data]
            .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.productCount - a.productCount)
            .map((b) => (
              <motion.li key={b.id} variants={staggerItem}>
                <Link
                  to={lp(`/brand/${b.slug}`)}
                  className="group flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-white p-6 text-center transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft"
                >
                  <span className="flex h-16 items-center">
                    <BrandLogo brand={b} area={4200} maxHeight={64} className="opacity-80 group-hover:scale-105 group-hover:opacity-100" />
                  </span>
                  <span className="text-xs text-muted transition group-hover:text-brand-700">{t('common.products', { count: b.productCount })}</span>
                </Link>
              </motion.li>
            ))}
        </motion.ul>

        <div className="mt-16 columns-2 gap-10 sm:columns-3 lg:columns-4">
          {Object.keys(groups)
            .sort()
            .map((letter) => (
              <div key={letter} className="mb-8 break-inside-avoid">
                <p className="mb-3 font-display text-3xl text-brand-500">{letter}</p>
                <ul className="space-y-2">
                  {groups[letter].map((b) => (
                    <li key={b.id}>
                      <Link to={lp(`/brand/${b.slug}`)} className="text-sm text-ink/80 hover:text-brand-600">
                        {b.name} <span className="text-muted">({b.productCount})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export function About() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const values = t('about.values', { returnObjects: true });
  const icons = [BadgeCheck, Sparkles, MessagesSquare];
  return (
    <>
      <PageHeader title={t('about.title')} subtitle={t('about.lead')} />
      <div className="container-x grid items-center gap-12 pb-16 lg:grid-cols-2">
        <Reveal className="space-y-5 text-lg leading-relaxed text-ink/80">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <Link to={lp('/shop')} className="btn-primary mt-4">
            {t('common.discover')} <ArrowRight className="size-4 rtl:-scale-x-100" />
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="grid place-items-center rounded-[2.5rem] bg-gradient-to-br from-brand-50 to-sand p-16">
          <LogoMark className="w-56 max-w-full" />
        </Reveal>
      </div>
      <div className="container-x pb-24">
        <motion.ul variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-6 md:grid-cols-3">
          {values.map((v, i) => {
            const Icon = icons[i];
            return (
              <motion.li key={v.title} variants={staggerItem} className="card p-8">
                <Icon className="size-7 text-brand-500" strokeWidth={1.5} />
                <h2 className="mt-5 font-display text-2xl">{v.title}</h2>
                <p className="mt-2 text-muted">{v.text}</p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </>
  );
}

export function Faq() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data } = useSettings();
  const s = data?.shipping;
  const items = t('faq.items', { returnObjects: true, casa: s?.casablancaFee ?? 20, other: s?.otherFee ?? 35, count: s?.freeAboveItems ?? 5 });
  const [open, setOpen] = useState(0);

  return (
    <>
      <Seo
        title={t('faq.title')}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <PageHeader title={t('faq.title')} />
      <div className="container-x max-w-3xl pb-24">
        {items.map((item, i) => (
          <div key={item.q} className="border-b border-line">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-6 py-6 text-start" aria-expanded={open === i}>
              <h2 className="text-lg font-medium">{item.q}</h2>
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Plus className="size-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="pb-6 leading-relaxed text-muted">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Not sure what to buy? Send them to the routine builder */}
        <Reveal className="relative mt-12 overflow-hidden rounded-[2rem] bg-brand-900 p-8 text-white sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-3xl leading-tight">{t('routinePage.faqTitle')}</h2>
              <p className="mt-2 max-w-md text-white/75">{t('routinePage.faqText')}</p>
            </div>
            <Link to={lp('/routine')} className="btn group shrink-0 bg-white px-7 py-3.5 text-brand-900 hover:bg-brand-50">
              <Sparkles className="size-4" /> {t('nav.routineBuilder')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}

export function Contact() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const c = data?.contact;
  const cards = c
    ? [
        [Phone, t('contact.phone'), c.phone, `tel:${c.phone.replace(/\s/g, '')}`],
        [FaWhatsapp, t('contact.whatsapp'), `+${c.whatsapp}`, `https://wa.me/${c.whatsapp}`],
        [Mail, t('contact.email'), c.email, `mailto:${c.email}`],
        [MapPin, t('contact.address'), c.city, null],
      ]
    : [];
  return (
    <>
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <div className="container-x pb-24">
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([Icon, label, value, href]) => {
            const Tag = href ? 'a' : 'div';
            return (
              <motion.li key={label} variants={staggerItem}>
                <Tag href={href || undefined} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="card flex h-full flex-col p-7 transition hover:-translate-y-1 hover:shadow-soft">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </span>
                  <span className="mt-5 text-sm text-muted">{label}</span>
                  <span className="mt-1 font-medium break-all" dir="ltr">
                    {value}
                  </span>
                </Tag>
              </motion.li>
            );
          })}
        </motion.ul>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Clock className="size-4" /> {t('contact.hours')}
        </p>
      </div>
    </>
  );
}

export function ShippingInfo() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const s = data?.shipping;
  const tiers = [
    [MapPin, t('shippingPage.casa'), `${s?.casablancaFee ?? 20} ${t('common.currency')}`, false],
    [Truck, t('shippingPage.other'), `${s?.otherFee ?? 35} ${t('common.currency')}`, false],
    [Gift, t('shippingPage.free', { count: s?.freeAboveItems ?? 5 }), t('common.free'), true],
  ];
  return (
    <>
      <PageHeader title={t('shippingPage.title')} />
      <div className="container-x pb-24">
        <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-3">
          {tiers.map(([Icon, label, price, highlight]) => (
            <motion.li key={label} variants={staggerItem} className={cn('rounded-3xl p-8', highlight ? 'bg-brand-500 text-white shadow-lift' : 'card')}>
              <Icon className={cn('size-7', highlight ? 'text-white' : 'text-brand-500')} strokeWidth={1.5} />
              <p className={cn('mt-6 text-sm', highlight ? 'text-white/80' : 'text-muted')}>{label}</p>
              <p className="mt-1 font-display text-5xl">{price}</p>
            </motion.li>
          ))}
        </motion.ul>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            [Timer, t('shippingPage.delays'), t('shippingPage.delaysText')],
            [HandCoins, t('shippingPage.payment'), t('shippingPage.paymentText')],
          ].map(([Icon, title, text]) => (
            <Reveal key={title} className="card flex gap-5 p-8">
              <Icon className="size-7 shrink-0 text-brand-500" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-medium">{title}</h2>
                <p className="mt-2 text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}

const POLICY_ICONS = { conditions: ScrollText, retours: RotateCcw, confidentialite: ShieldCheck };

export function Policies() {
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const { data } = useSettings();
  const lang = POLICY_SECTIONS[i18n.language] ? i18n.language : 'fr';
  const c = data?.contact;
  const sections = POLICY_SECTIONS[lang]({
    casa: data?.shipping?.casablancaFee ?? 20,
    other: data?.shipping?.otherFee ?? 35,
    free: data?.shipping?.freeAboveItems ?? 5,
    days: data?.returns?.days ?? 7,
    email: c?.email || 'so.pure.skin1@gmail.com',
    phone: c?.phone || '+212 6 25 37 08 41',
    city: lang === 'ar' && /casa/i.test(c?.city || 'Casablanca') ? 'الدار البيضاء' : c?.city || 'Casablanca',
  });
  const updated = new Date(POLICIES_UPDATED).toLocaleDateString(`${lang}-MA`, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader eyebrow={t('policiesPage.eyebrow')} title={t('policiesPage.title')} subtitle={t('policiesPage.subtitle')} />
      <div className="container-x grid gap-10 pb-24 lg:grid-cols-[260px_1fr]">
        {/* Table of contents */}
        <nav aria-label={t('policiesPage.toc')} className="h-fit lg:sticky lg:top-28">
          <p className="eyebrow mb-3">{t('policiesPage.toc')}</p>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {sections.map((sec) => {
              const Icon = POLICY_ICONS[sec.id];
              return (
                <li key={sec.id} className="shrink-0">
                  <a href={`#${sec.id}`} className="flex items-center gap-2.5 rounded-2xl border border-line px-4 py-3 text-sm transition hover:border-brand-300 hover:bg-brand-50 lg:border-transparent">
                    <Icon className="size-4 text-brand-500" /> {sec.title}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 hidden text-xs text-muted lg:block">{t('policiesPage.updated', { date: updated })}</p>
        </nav>

        <div className="min-w-0 space-y-8">
          {sections.map((sec) => {
            const Icon = POLICY_ICONS[sec.id];
            return (
              <Reveal key={sec.id}>
                <section id={sec.id} className="card scroll-mt-28 p-6 sm:p-10">
                  <h2 className="flex items-center gap-3 font-display text-3xl sm:text-4xl">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <Icon className="size-5" />
                    </span>
                    {sec.title}
                  </h2>
                  <dl className="mt-8 space-y-6">
                    {sec.blocks.map(([title, text]) => (
                      <div key={title} className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:gap-6">
                        <dt className="font-medium text-ink">{title}</dt>
                        <dd className="leading-relaxed text-ink/75">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </Reveal>
            );
          })}
          <div className="flex flex-col items-start gap-4 rounded-3xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="font-medium">{t('policiesPage.questions')}</p>
              <p className="mt-1 text-sm text-muted lg:hidden">{t('policiesPage.updated', { date: updated })}</p>
            </div>
            <Link to={lp('/contact')} className="btn-primary shrink-0">
              {t('nav.contact')} <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function NotFound() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="font-display text-[9rem] leading-none text-brand-100">
        404
      </motion.p>
      <h1 className="font-display text-4xl">{t('notFound.title')}</h1>
      <p className="mt-3 text-muted">{t('notFound.text')}</p>
      <Link to={lp('/')} className="btn-primary mt-8">
        {t('common.backHome')}
      </Link>
    </div>
  );
}
