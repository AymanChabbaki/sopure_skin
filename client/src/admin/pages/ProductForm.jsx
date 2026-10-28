import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Save, Trash2, ExternalLink, Search as SearchIcon, Plus, Ruler, CalendarClock, X } from 'lucide-react';
import { Card, ConfirmDialog, EDITING, Field, I18nInput, ImageUploader, Switch, adminApi, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const EMPTY = {
  name: { fr: '', en: '', ar: '' },
  shortDescription: {},
  description: {},
  howToUse: {},
  ingredients: {},
  metaTitle: {},
  metaDescription: {},
  slug: '',
  sku: '',
  gtin: '',
  brandId: null,
  price: '',
  compareAtPrice: '',
  stock: 50,
  isActive: true,
  isFeatured: false,
  isNew: true,
  isBestSeller: false,
  hasSizes: false,
  inGoogleFeed: true,
  sizes: [],
  expiresAt: '',
  categoryIds: [],
  images: [],
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState(false);
  const { data, isLoading } = useAdminQuery(['product', id], `/products/${id}`, undefined, { enabled: !isNew, ...EDITING });
  const { data: categories = [] } = useAdminQuery(['categories'], '/categories');
  const { data: brands = [] } = useAdminQuery(['brands'], '/brands');

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data, compareAtPrice: data.compareAtPrice ?? '', sku: data.sku ?? '', gtin: data.gtin ?? '' });
  }, [data]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = useAdminMutation(
    (body) => adminApi(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body }),
    { success: isNew ? 'Produit créé' : 'Produit enregistré', onSuccess: (res) => isNew && navigate(`/admin/products/${res.id}`, { replace: true }) },
  );
  const remove = useAdminMutation(() => adminApi(`/products/${id}`, { method: 'DELETE' }), {
    success: 'Produit supprimé',
    onSuccess: () => navigate('/admin/products'),
  });

  const submit = (e) => {
    e.preventDefault();
    save.mutate({
      ...form,
      slug: form.slug || undefined,
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      stock: Number(form.stock) || 0,
      sizes: form.sizes
        .filter((z) => z.label.trim())
        .map((z) => ({ label: z.label.trim(), price: z.price === '' || z.price === null ? null : Number(z.price), stock: Number(z.stock) || 0, enabled: z.enabled })),
      expiresAt: form.expiresAt || null,
      images: form.images.map(({ url, thumbUrl, key, alt }) => ({ url, thumbUrl, key, alt })),
    });
  };

  const setSize = (i, patch) => set('sizes')(form.sizes.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const sizesTotal = form.sizes.filter((z) => z.enabled).reduce((sum, z) => sum + (Number(z.stock) || 0), 0);
  const daysLeft = form.expiresAt ? Math.ceil((new Date(form.expiresAt) - new Date(new Date().toDateString())) / 86400000) : null;

  if (!isNew && isLoading) return <Skeleton className="h-[600px] rounded-3xl" />;

  const toggleCategory = (cid) =>
    set('categoryIds')(form.categoryIds.includes(cid) ? form.categoryIds.filter((x) => x !== cid) : [...form.categoryIds, cid]);
  const discount = form.compareAtPrice && Number(form.compareAtPrice) > Number(form.price) ? Math.round((1 - form.price / form.compareAtPrice) * 100) : 0;
  const seoTitle = form.metaTitle.fr || form.name.fr;
  const seoDesc = form.metaDescription.fr || form.shortDescription.fr || form.description.fr || '';

  return (
    <form onSubmit={submit}>
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-line bg-zinc-50/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/admin/products" className="icon-btn shrink-0" aria-label="Retour">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-lg font-semibold sm:text-xl">{isNew ? 'Nouveau produit' : form.name.fr || 'Produit'}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          {!isNew && (
            <>
              <a href={`/fr/product/${data?.slug}`} target="_blank" rel="noreferrer" className="btn-outline hidden px-4 py-2.5 sm:inline-flex">
                <ExternalLink className="size-4" /> Voir
              </a>
              <button type="button" onClick={() => setConfirm(true)} className="btn-outline px-3 py-2.5 text-rose-600" aria-label="Supprimer">
                <Trash2 className="size-4" />
              </button>
            </>
          )}
          <button type="submit" disabled={save.isPending} className="btn-primary py-2.5">
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-5 p-5 sm:p-6">
            <I18nInput label="Nom du produit" value={form.name} onChange={set('name')} required />
            <I18nInput label="Description courte" value={form.shortDescription} onChange={set('shortDescription')} multiline rows={2} />
            <I18nInput label="Description" value={form.description} onChange={set('description')} multiline rows={8} />
            <div className="grid gap-5 sm:grid-cols-2">
              <I18nInput label="Utilisation" value={form.howToUse} onChange={set('howToUse')} multiline rows={4} />
              <I18nInput label="Ingrédients" value={form.ingredients} onChange={set('ingredients')} multiline rows={4} />
            </div>
            <p className="text-xs text-muted">Astuce : séparez les paragraphes par une ligne vide. Une pastille orange indique une langue non traduite (le français est alors affiché).</p>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Images</h2>
            <ImageUploader images={form.images} onChange={set('images')} nameHint={form.name.fr} />
            <p className="mt-2 text-xs text-muted">Glissez les vignettes pour réordonner. La première image est l'image principale.</p>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <SearchIcon className="size-4 text-muted" /> Référencement (SEO)
            </h2>
            <div className="rounded-2xl border border-line p-4">
              <p className="truncate text-xs text-emerald-700">sopureskin.com › fr › product › {form.slug || 'auto'}</p>
              <p className="mt-1 truncate text-lg text-[#1a0dab]">{seoTitle || 'Titre du produit'} | So Pure Skin</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{seoDesc.slice(0, 160) || 'Description affichée dans Google…'}</p>
            </div>
            <I18nInput label="Titre SEO (optionnel)" value={form.metaTitle} onChange={set('metaTitle')} />
            <I18nInput label="Méta description (optionnel, 160 caractères)" value={form.metaDescription} onChange={set('metaDescription')} multiline rows={2} />
            <Field label="URL (slug)" hint="Laissez vide pour la générer depuis le nom.">
              <input value={form.slug} onChange={(e) => set('slug')(e.target.value)} className="input" placeholder="ex : anua-heartleaf-77-toner" />
            </Field>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="font-semibold">Publication</h2>
            <Switch checked={form.isActive} onChange={set('isActive')} label="En ligne" description="Visible sur la boutique" />
            <Switch checked={form.isFeatured} onChange={set('isFeatured')} label="Mis en avant" description="Affiché dans la page d'accueil" />
            <Switch checked={form.isNew} onChange={set('isNew')} label="Nouveauté" description="Badge « Nouveau »" />
            <Switch checked={form.isBestSeller} onChange={set('isBestSeller')} label="Best-seller" description="Badge « Best-seller » et lien « Best-sellers » du menu" />
            <Switch
              checked={form.inGoogleFeed}
              onChange={set('inGoogleFeed')}
              label="Google Shopping"
              description="Envoyé à Google Merchant Center. Désactivez pour un médicament sur ordonnance."
            />
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="font-semibold">Prix & stock</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix (DH)">
                <input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => set('price')(e.target.value)} className="input" />
              </Field>
              <Field label="Prix barré (DH)">
                <input type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => set('compareAtPrice')(e.target.value)} className="input" />
              </Field>
            </div>
            {discount > 0 && <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800">Réduction affichée : -{discount}%</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock" hint={form.hasSizes ? 'Somme des tailles' : undefined}>
                <input
                  type="number"
                  min="0"
                  value={form.hasSizes ? sizesTotal : form.stock}
                  onChange={(e) => set('stock')(e.target.value)}
                  disabled={form.hasSizes}
                  className="input disabled:bg-zinc-50 disabled:text-muted"
                />
              </Field>
              <Field label="SKU">
                <input value={form.sku} onChange={(e) => set('sku')(e.target.value)} className="input" />
              </Field>
              <Field className="col-span-2" label="Code-barres (EAN / GTIN)" hint="Les chiffres sous le code-barres de la boîte. Google s'en sert pour afficher le produit dans Shopping.">
                <input value={form.gtin} onChange={(e) => set('gtin')(e.target.value)} inputMode="numeric" placeholder="8809…" className="input" />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Ruler className="size-4 text-muted" /> Tailles
            </h2>
            <Switch
              checked={form.hasSizes}
              onChange={(on) => {
                set('hasSizes')(on);
                if (on && !form.sizes.length) set('sizes')([{ label: '', price: '', stock: Number(form.stock) || 0, enabled: true }]);
              }}
              label="Ce produit a plusieurs tailles"
              description="La cliente choisit la taille avant d'ajouter au panier"
            />
            {form.hasSizes && (
              <div className="space-y-2">
                {form.sizes.map((z, i) => (
                  <div key={i} className={cn('space-y-2 rounded-2xl border border-line p-3 transition', !z.enabled && 'bg-zinc-50 opacity-60')}>
                    <div className="flex items-center gap-2">
                      <input value={z.label} onChange={(e) => setSize(i, { label: e.target.value })} placeholder="Taille, ex : 50 ml" className="input min-w-0 flex-1 px-3 py-2" required aria-label="Taille" />
                      <button
                        type="button"
                        role="switch"
                        aria-checked={z.enabled}
                        onClick={() => setSize(i, { enabled: !z.enabled })}
                        title={z.enabled ? 'Disponible (cliquer pour masquer)' : 'Masquée (cliquer pour activer)'}
                        className={cn('relative h-5 w-9 shrink-0 rounded-full transition', z.enabled ? 'bg-brand-500' : 'bg-zinc-300')}
                      >
                        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', z.enabled ? 'start-[18px]' : 'start-0.5')} />
                      </button>
                      <button type="button" onClick={() => set('sizes')(form.sizes.filter((_, j) => j !== i))} className="icon-btn size-8 shrink-0 text-muted hover:text-rose-600" aria-label="Supprimer la taille">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-muted">
                        Prix (DH)
                        <input type="number" min="0" step="0.01" value={z.price ?? ''} onChange={(e) => setSize(i, { price: e.target.value })} placeholder={String(form.price || '')} className="input mt-1 px-3 py-2 text-sm text-ink" />
                      </label>
                      <label className="text-[11px] text-muted">
                        Stock
                        <input type="number" min="0" value={z.stock} onChange={(e) => setSize(i, { stock: e.target.value })} className="input mt-1 px-3 py-2 text-sm text-ink" />
                      </label>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => set('sizes')([...form.sizes, { label: '', price: '', stock: 0, enabled: true }])} className="btn-outline w-full py-2 text-sm">
                  <Plus className="size-4" /> Ajouter une taille
                </button>
                <p className="text-xs text-muted">Prix vide = prix du produit. Une taille désactivée est masquée sur le site ; à 0 en stock elle s'affiche barrée.</p>
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarClock className="size-4 text-muted" /> Date d'expiration
            </h2>
            <Field label="Expire le" hint="Lot actuellement en stock. Suivi dans Statistiques.">
              <input type="date" value={form.expiresAt || ''} onChange={(e) => set('expiresAt')(e.target.value)} className="input" />
            </Field>
            {daysLeft !== null && (
              <p
                className={cn(
                  'rounded-xl px-3 py-2 text-xs',
                  daysLeft < 0 ? 'bg-rose-50 text-rose-700' : daysLeft <= 90 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800',
                )}
              >
                {daysLeft < 0 ? `Expiré depuis ${-daysLeft} jour(s)` : daysLeft === 0 ? "Expire aujourd'hui" : `Expire dans ${daysLeft} jour(s)`}
              </p>
            )}
          </Card>

          <Card className="space-y-4 p-5 sm:p-6">
            <h2 className="font-semibold">Organisation</h2>
            <Field label="Marque">
              <select value={form.brandId ?? ''} onChange={(e) => set('brandId')(e.target.value ? Number(e.target.value) : null)} className="input">
                <option value="">Sans marque</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            {[
              ['type', 'Catégories'],
              ['routine', 'Routines (type de peau)'],
            ].map(([kind, label]) => (
              <Field key={kind} label={label}>
                <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                  {categories
                    .filter((c) => c.kind === kind)
                    .map((c) => {
                      const on = form.categoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          className={cn('rounded-full border px-3 py-1.5 text-xs transition', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:border-brand-300')}
                        >
                          {c.name.fr}
                        </button>
                      );
                    })}
                </div>
              </Field>
            ))}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} message="Supprimer définitivement ce produit et ses images ?" />
    </form>
  );
}
