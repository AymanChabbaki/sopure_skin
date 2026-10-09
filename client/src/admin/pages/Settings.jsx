import { useEffect, useState } from 'react';
import { motion, Reorder } from 'motion/react';
import { MessageCircleHeart, Truck, Megaphone, Image as ImageIcon, Phone, Search, Plus, Trash2, GripVertical, Loader2, Save, Cloud, HardDrive } from 'lucide-react';
import { Card, EDITING, Field, I18nInput, ImageUploader, PageTitle, adminApi, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const TABS = [
  ['shipping', 'Livraison', Truck],
  ['announcements', 'Barre d’annonces', Megaphone],
  ['hero', 'Bannière d’accueil', ImageIcon],
  ['testimonials', 'Témoignages', MessageCircleHeart],
  ['contact', 'Contact & réseaux', Phone],
  ['seo', 'SEO', Search],
];

function SaveButton({ mutation, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={mutation.isPending} className="btn-primary py-2.5">
      {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
    </button>
  );
}

function ShippingTab({ value, save }) {
  const [v, setV] = useState(value);
  const num = (k) => (e) => setV({ ...v, [k]: Number(e.target.value) });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Casablanca (DH)">
          <input type="number" min="0" value={v.casablancaFee} onChange={num('casablancaFee')} className="input" />
        </Field>
        <Field label="Autres villes (DH)">
          <input type="number" min="0" value={v.otherFee} onChange={num('otherFee')} className="input" />
        </Field>
        <Field label="Gratuite pour plus de… (produits)" hint={`Gratuite à partir de ${v.freeAboveItems + 1} produits dans le panier`}>
          <input type="number" min="0" value={v.freeAboveItems} onChange={num('freeAboveItems')} className="input" />
        </Field>
      </div>
      <Field label="Noms reconnus comme Casablanca" hint="Séparés par des virgules (pour la saisie « Autre ville »).">
        <input
          value={v.casablancaAliases.join(', ')}
          onChange={(e) => setV({ ...v, casablancaAliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className="input"
        />
      </Field>
      <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
        Exemple : 3 produits à Rabat = <strong>{v.otherFee} DH</strong> · 2 produits à Casablanca = <strong>{v.casablancaFee} DH</strong> · {v.freeAboveItems + 1} produits partout ={' '}
        <strong>gratuit</strong>. Paiement : à la livraison uniquement.
      </div>
      <div className="flex justify-end">
        <SaveButton mutation={save} onClick={() => save.mutate(['shipping', v])} />
      </div>
    </div>
  );
}

function AnnouncementsTab({ value, save }) {
  const [items, setItems] = useState(() => value.map((v, i) => ({ ...v, _id: `${i}-${Date.now()}` })));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Messages défilant dans la barre animée en haut du site. Glissez pour réordonner.</p>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-brand-700 py-2.5 text-[13px] text-white">
        <div className="flex w-max animate-marquee gap-12 px-6" style={{ '--marquee-duration': '25s' }}>
          {[...items, ...items].map((m, i) => (
            <span key={i} className="whitespace-nowrap">
              {m.fr}
            </span>
          ))}
        </div>
      </div>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-3">
        {items.map((item, i) => (
          <Reorder.Item key={item._id} value={item} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
            <GripVertical className="mt-8 size-5 shrink-0 cursor-grab text-muted active:cursor-grabbing" />
            <div className="flex-1">
              <I18nInput label={`Message ${i + 1}`} value={item} onChange={(v) => setItems(items.map((x) => (x._id === item._id ? { ...x, ...v } : x)))} />
            </div>
            <button type="button" onClick={() => setItems(items.filter((x) => x._id !== item._id))} className="icon-btn mt-6 size-9 text-muted hover:text-rose-600" aria-label="Supprimer">
              <Trash2 className="size-4" />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="flex justify-between">
        <button type="button" onClick={() => setItems([...items, { fr: '', en: '', ar: '', _id: String(Date.now()) }])} className="btn-outline py-2.5">
          <Plus className="size-4" /> Ajouter un message
        </button>
        <SaveButton mutation={save} onClick={() => save.mutate(['announcements', items.map(({ _id, ...m }) => m).filter((m) => m.fr?.trim())])} />
      </div>
    </div>
  );
}

const FOCUS = [
  ['20% center', 'Gauche'],
  ['35% center', 'Centre-gauche'],
  ['center', 'Centre'],
  ['65% center', 'Centre-droit'],
  ['78% center', 'Droite'],
];

function HeroSlide({ slide, index, onChange, onRemove }) {
  const set = (k) => (v) => onChange({ ...slide, [k]: v });
  return (
    <div className="space-y-5 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-3">
        <GripVertical className="size-5 cursor-grab text-muted active:cursor-grabbing" />
        <h3 className="flex-1 font-semibold">Slide {index + 1}</h3>
        <button type="button" onClick={onRemove} className="icon-btn size-9 text-muted hover:text-rose-600" aria-label="Supprimer la slide">
          <Trash2 className="size-4" />
        </button>
      </div>
      <Field label="Image" hint="Format large conseillé (1920 × 820). Laissez un espace vide du côté du texte.">
        <ImageUploader
          folder="banners"
          multiple={false}
          images={slide.image ? [{ url: slide.image, thumbUrl: slide.imageSm || slide.image }] : []}
          onChange={(imgs) => onChange({ ...slide, image: imgs[0]?.url || '', imageSm: imgs[0]?.thumbUrl || '' })}
        />
      </Field>
      {slide.image && (
        <div className="relative aspect-[1916/821] overflow-hidden rounded-2xl">
          <img src={slide.image} alt="" className="size-full object-cover" />
          <div className={cn('absolute inset-y-0 flex w-1/2 items-center p-6', slide.side === 'right' ? 'right-0' : 'left-0')}>
            <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-medium backdrop-blur">{slide.title?.fr || 'Titre'}</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Position du texte (ordinateur)">
          <div className="flex gap-2">
            {[
              ['left', 'À gauche'],
              ['right', 'À droite'],
            ].map(([k, l]) => (
              <button key={k} type="button" onClick={() => set('side')(k)} className={cn('flex-1 rounded-2xl border px-4 py-2.5 text-sm transition', (slide.side || 'left') === k ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line')}>
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cadrage sur mobile" hint="Partie de l'image gardée visible sur téléphone">
          <select value={slide.focus || 'center'} onChange={(e) => set('focus')(e.target.value)} className="input">
            {FOCUS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <I18nInput label="Sur-titre" value={slide.eyebrow || {}} onChange={set('eyebrow')} />
      <I18nInput label="Titre" value={slide.title || {}} onChange={set('title')} />
      <I18nInput label="Sous-titre" value={slide.subtitle || {}} onChange={set('subtitle')} multiline rows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <I18nInput label="Texte du bouton" value={slide.cta || {}} onChange={set('cta')} />
        <Field label="Lien du bouton" hint="Ex : /shop, /category/serums, /shop?onSale=true">
          <input value={slide.link || ''} onChange={(e) => set('link')(e.target.value)} className="input" />
        </Field>
      </div>
    </div>
  );
}

function HeroTab({ value, save }) {
  const [slides, setSlides] = useState(() => value.map((s, i) => ({ ...s, _id: `${i}-${Date.now()}` })));
  const update = (id, next) => setSlides((all) => all.map((s) => (s._id === id ? next : s)));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Le carrousel de la page d'accueil défile automatiquement. Glissez les slides pour changer leur ordre.</p>
      <Reorder.Group axis="y" values={slides} onReorder={setSlides} className="space-y-4">
        {slides.map((slide, i) => (
          <Reorder.Item key={slide._id} value={slide}>
            <HeroSlide slide={slide} index={i} onChange={(next) => update(slide._id, next)} onRemove={() => setSlides(slides.filter((s) => s._id !== slide._id))} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setSlides([...slides, { _id: String(Date.now()), side: 'left', focus: 'center', link: '/shop', title: {}, eyebrow: {}, subtitle: {}, cta: {} }])}
          className="btn-outline py-2.5"
        >
          <Plus className="size-4" /> Ajouter une slide
        </button>
        <SaveButton mutation={save} onClick={() => save.mutate(['hero', slides.filter((s) => s.image).map(({ _id, ...s }) => s)])} />
      </div>
    </div>
  );
}

function TestimonialsTab({ value, save }) {
  const [items, setItems] = useState(value || []);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Captures WhatsApp de vos clientes affichées sur la page d'accueil. Glissez pour réordonner, les 8 premières sont visibles directement.</p>
      <ImageUploader folder="testimonials" images={items} onChange={setItems} />
      <div className="flex justify-end">
        <SaveButton mutation={save} onClick={() => save.mutate(['testimonials', items.map(({ url, thumbUrl, key, source }) => ({ url, thumbUrl, key, source }))])} />
      </div>
    </div>
  );
}

function ContactTab({ value, save }) {
  const [c, setC] = useState(value);
  const field = (k, label, hint) => (
    <Field label={label} hint={hint}>
      <input value={c[k] || ''} onChange={(e) => setC({ ...c, [k]: e.target.value })} className="input" />
    </Field>
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field('phone', 'Téléphone')}
        {field('whatsapp', 'WhatsApp', 'Format international sans + ni espaces : 2126XXXXXXXX')}
        {field('email', 'E-mail')}
        {field('city', 'Ville')}
        {field('instagram', 'Instagram (URL)')}
        {field('facebook', 'Facebook (URL)')}
        {field('tiktok', 'TikTok (URL)')}
      </div>
      <div className="flex justify-end">
        <SaveButton mutation={save} onClick={() => save.mutate(['contact', c])} />
      </div>
    </div>
  );
}

function SeoTab({ value, save }) {
  const [s, setS] = useState(value);
  return (
    <div className="space-y-5">
      <I18nInput label="Titre du site (page d’accueil)" value={s.title} onChange={(v) => setS({ ...s, title: v })} />
      <I18nInput label="Méta description" value={s.description} onChange={(v) => setS({ ...s, description: v })} multiline rows={3} />
      <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-muted">
        Générés automatiquement : <code>/sitemap.xml</code> (3 langues + hreflang), <code>/robots.txt</code>, <code>/llms.txt</code> (catalogue lisible par les IA), données
        structurées Product / Organization / FAQ / Breadcrumb.
      </div>
      <div className="flex justify-end">
        <SaveButton mutation={save} onClick={() => save.mutate(['seo', s])} />
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('shipping');
  const { data, isLoading } = useAdminQuery(['settings'], '/settings', undefined, EDITING);
  const save = useAdminMutation(([key, value]) => adminApi(`/settings/${key}`, { method: 'PUT', body: value }), { success: 'Paramètres enregistrés' });
  const [mounted, setMounted] = useState(0);
  useEffect(() => setMounted((m) => m + 1), [data]);

  const panels = { shipping: ShippingTab, announcements: AnnouncementsTab, hero: HeroTab, testimonials: TestimonialsTab, contact: ContactTab, seo: SeoTab };
  const Panel = panels[tab];

  return (
    <>
      <PageTitle
        title="Paramètres"
        subtitle="Tout ce qui s'affiche sur la boutique"
        actions={
          data && (
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium', data.storageDriver === 'r2' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              {data.storageDriver === 'r2' ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
              Stockage images : {data.storageDriver === 'r2' ? 'Cloudflare R2' : 'local (dev)'}
            </span>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={cn('relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition', tab === key ? 'text-brand-800' : 'text-muted hover:text-ink')}>
              {tab === key && <motion.span layoutId="settings-tab" className="absolute inset-0 rounded-2xl bg-white shadow-sm ring-1 ring-line" />}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>
        <Card className="p-5 sm:p-6">{isLoading ? <Skeleton className="h-64" /> : <Panel key={`${tab}-${mounted}`} value={data[tab]} save={save} />}</Card>
      </div>
    </>
  );
}
