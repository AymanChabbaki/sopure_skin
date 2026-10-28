import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, Loader2, BookOpen, ExternalLink, X } from 'lucide-react';
import { Card, ConfirmDialog, Field, I18nInput, ImageUploader, Modal, PageTitle, SearchInput, Switch, adminApi, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const EMPTY = { title: {}, excerpt: {}, body: {}, coverUrl: '', productIds: [], isPublished: false, slug: '' };

const BODY_HELP = 'Une ligne vide sépare les paragraphes. « ## Titre » crée un intertitre, « ### » un sous-titre, et des lignes commençant par « - » forment une liste.';

/** Search the catalog and attach products to the guide (shown under the article, in this order). */
function ProductPicker({ selected, onChange }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useAdminQuery(['products', 'picker', q], '/products', { q, limit: 8 }, { enabled: q.length > 1 });
  const ids = new Set(selected.map((p) => p.id));
  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 ps-3 pe-1 text-sm text-brand-800">
              <span className="max-w-60 truncate">{p.name}</span>
              <button type="button" onClick={() => onChange(selected.filter((x) => x.id !== p.id))} className="icon-btn size-6" aria-label="Retirer">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Rechercher un produit à ajouter…" />
      {q.length > 1 && (
        <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
          {isFetching && !data ? (
            <li className="p-3 text-sm text-muted">Recherche…</li>
          ) : data?.rows.length ? (
            data.rows.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={ids.has(p.id)}
                  onClick={() => onChange([...selected, { id: p.id, name: p.name }])}
                  className="flex w-full items-center gap-3 p-2.5 text-start text-sm hover:bg-zinc-50 disabled:opacity-40"
                >
                  <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-cover" />}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {!ids.has(p.id) && <Plus className="size-4 text-muted" />}
                </button>
              </li>
            ))
          ) : (
            <li className="p-3 text-sm text-muted">Aucun produit trouvé</li>
          )}
        </ul>
      )}
    </div>
  );
}

function EditModal({ item, onClose }) {
  // Full article (with linked product names) when editing an existing one
  const { data: full, isLoading } = useAdminQuery(['articles', item.id], `/articles/${item.id}`, undefined, {
    enabled: Boolean(item.id),
    refetchInterval: false, // the form is being edited
    refetchOnWindowFocus: false,
  });
  if (item.id && (isLoading || !full)) {
    return (
      <Modal open onClose={onClose} title="Modifier le guide" size="max-w-4xl">
        <Skeleton className="h-96 rounded-2xl" />
      </Modal>
    );
  }
  return <EditForm item={full || EMPTY} onClose={onClose} />;
}

function EditForm({ item, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...item, coverUrl: item.coverUrl || '' });
  const [products, setProducts] = useState(() => item.productIds.map((id) => item.products?.find((p) => p.id === id)).filter(Boolean));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const save = useAdminMutation(
    (body) => adminApi(item.id ? `/articles/${item.id}` : '/articles', { method: item.id ? 'PUT' : 'POST', body }),
    { success: 'Guide enregistré', onSuccess: onClose },
  );

  const submit = (e) => {
    e.preventDefault();
    save.mutate({
      slug: form.slug || undefined,
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      coverUrl: form.coverUrl || null,
      productIds: products.map((p) => p.id),
      isPublished: form.isPublished,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="max-w-4xl"
      title={item.id ? 'Modifier le guide' : 'Nouveau guide'}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="article-form" className="btn-primary py-2.5" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
        </>
      }
    >
      <form id="article-form" onSubmit={submit} className="space-y-5">
        <I18nInput label="Titre" value={form.title} onChange={set('title')} required placeholder="Ex : Routine coréenne pour peau grasse : le guide complet" />
        <I18nInput label="Résumé" value={form.excerpt} onChange={set('excerpt')} multiline rows={2} placeholder="1 à 2 phrases, affichées sur Google sous le titre." />
        <div>
          <I18nInput label="Contenu" value={form.body} onChange={set('body')} multiline rows={16} />
          <p className="mt-1 text-xs text-muted">{BODY_HELP}</p>
        </div>
        <Field label="Image de couverture" hint="Format paysage conseillé (1600 × 900).">
          <ImageUploader
            folder="articles"
            nameHint={form.title.fr}
            multiple={false}
            images={form.coverUrl ? [{ url: form.coverUrl, thumbUrl: form.coverUrl }] : []}
            onChange={(imgs) => set('coverUrl')(imgs[0]?.url || '')}
          />
        </Field>
        <Field label="Produits recommandés" hint="Affichés sous l'article, dans cet ordre. Les liens vers vos produits aident Google à les classer.">
          <ProductPicker selected={products} onChange={setProducts} />
        </Field>
        <Field label="URL (slug)" hint="Auto si vide, à partir du titre français">
          <input value={form.slug} onChange={(e) => set('slug')(e.target.value)} className="input" />
        </Field>
        <Switch checked={form.isPublished} onChange={set('isPublished')} label="Publié" description="Visible sur la boutique et envoyé à Google" />
      </form>
    </Modal>
  );
}

export default function Articles() {
  const { data = [], isLoading } = useAdminQuery(['articles'], '/articles');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const remove = useAdminMutation((id) => adminApi(`/articles/${id}`, { method: 'DELETE' }), { success: 'Supprimé', onSuccess: () => setDeleting(null) });

  return (
    <>
      <PageTitle
        title="Conseils & guides"
        subtitle="Articles qui répondent aux recherches de vos clientes et renvoient vers vos produits"
        actions={
          <button type="button" onClick={() => setEditing({})} className="btn-primary py-2.5">
            <Plus className="size-4" /> Nouveau guide
          </button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-3xl" />
      ) : data.length === 0 ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <BookOpen className="size-10 text-brand-300" strokeWidth={1.5} />
          <p className="mt-4 max-w-md text-sm text-muted">
            Écrivez des guides sur ce que vos clientes cherchent sur Google (« routine coréenne peau grasse », « meilleur sérum anti-taches »…) et ajoutez-y vos produits.
          </p>
        </Card>
      ) : (
        <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id} className="flex items-center gap-4 p-4 transition hover:shadow-soft">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sand text-brand-400">
                {a.coverUrl ? <img src={a.coverUrl} alt="" className="size-full object-cover" /> : <BookOpen className="size-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{a.title.fr}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className={cn('rounded-full px-2 py-0.5 font-medium', a.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>
                    {a.isPublished ? 'Publié' : 'Brouillon'}
                  </span>
                  {a.productIds.length} produit(s)
                </span>
              </span>
              {a.isPublished && (
                <a href={`/fr/guides/${a.slug}`} target="_blank" rel="noreferrer" className="icon-btn size-9 text-muted" aria-label="Voir sur la boutique">
                  <ExternalLink className="size-4" />
                </a>
              )}
              <button type="button" onClick={() => setEditing(a)} className="icon-btn size-9" aria-label="Modifier">
                <Pencil className="size-4" />
              </button>
              <button type="button" onClick={() => setDeleting(a)} className="icon-btn size-9 text-muted hover:text-rose-600" aria-label="Supprimer">
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </motion.div>
      )}
      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        message={`Supprimer définitivement le guide « ${deleting?.title.fr} » ?`}
      />
    </>
  );
}
