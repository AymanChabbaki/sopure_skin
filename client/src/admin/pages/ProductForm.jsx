import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Save, Trash2, ExternalLink, Search as SearchIcon } from 'lucide-react';
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
  brandId: null,
  price: '',
  compareAtPrice: '',
  stock: 50,
  isActive: true,
  isFeatured: false,
  isNew: true,
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
    if (data) setForm({ ...EMPTY, ...data, compareAtPrice: data.compareAtPrice ?? '', sku: data.sku ?? '' });
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
      images: form.images.map(({ url, thumbUrl, key, alt }) => ({ url, thumbUrl, key, alt })),
    });
  };

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
            <ImageUploader images={form.images} onChange={set('images')} />
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
              <Field label="Stock">
                <input type="number" min="0" value={form.stock} onChange={(e) => set('stock')(e.target.value)} className="input" />
              </Field>
              <Field label="SKU">
                <input value={form.sku} onChange={(e) => set('sku')(e.target.value)} className="input" />
              </Field>
            </div>
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
