import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, Star, EyeOff, Loader2 } from 'lucide-react';
import { Card, ConfirmDialog, Field, I18nInput, ImageUploader, Modal, PageTitle, Switch, adminApi, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const CONFIG = {
  categories: {
    title: 'Catégories',
    subtitle: 'Types de soins et routines par type de peau',
    empty: { kind: 'type', name: { fr: '', en: '', ar: '' }, description: {}, imageUrl: '', position: 0, isVisible: true, slug: '' },
    folder: 'categories',
  },
  brands: {
    title: 'Marques',
    subtitle: 'Les marques coréennes de votre catalogue',
    empty: { name: '', description: {}, logoUrl: '', isFeatured: false, position: 0, slug: '' },
    folder: 'brands',
  },
};

function EditModal({ kind, item, onClose }) {
  const cfg = CONFIG[kind];
  const [form, setForm] = useState({ ...cfg.empty, ...item });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const imageKey = kind === 'brands' ? 'logoUrl' : 'imageUrl';
  const save = useAdminMutation(
    (body) => adminApi(item?.id ? `/${kind}/${item.id}` : `/${kind}`, { method: item?.id ? 'PUT' : 'POST', body }),
    { onSuccess: onClose },
  );

  const submit = (e) => {
    e.preventDefault();
    const { id, productCount, ...body } = form; // eslint-disable-line no-unused-vars
    save.mutate({ ...body, slug: body.slug || undefined, position: Number(body.position) || 0, [imageKey]: body[imageKey] || null });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item?.id ? 'Modifier' : 'Ajouter'}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="tax-form" className="btn-primary py-2.5" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
        </>
      }
    >
      <form id="tax-form" onSubmit={submit} className="space-y-5">
        {kind === 'categories' ? (
          <>
            <Field label="Type">
              <div className="flex gap-2">
                {[
                  ['type', 'Type de soin'],
                  ['routine', 'Routine (type de peau)'],
                ].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => set('kind')(k)} className={cn('flex-1 rounded-2xl border px-4 py-2.5 text-sm transition', form.kind === k ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line')}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <I18nInput label="Nom" value={form.name} onChange={set('name')} required />
          </>
        ) : (
          <Field label="Nom de la marque">
            <input required value={form.name} onChange={(e) => set('name')(e.target.value)} className="input" />
          </Field>
        )}
        <I18nInput label="Description (SEO)" value={form.description} onChange={set('description')} multiline rows={3} />
        <Field label={kind === 'brands' ? 'Logo' : 'Image'} hint={kind === 'categories' ? "Sans image, la photo d'un produit de la catégorie est utilisée." : undefined}>
          <ImageUploader
            folder={CONFIG[kind].folder}
            multiple={false}
            images={form[imageKey] ? [{ url: form[imageKey], thumbUrl: form[imageKey] }] : []}
            onChange={(imgs) => set(imageKey)(imgs[0]?.thumbUrl || imgs[0]?.url || '')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="URL (slug)" hint="Auto si vide">
            <input value={form.slug} onChange={(e) => set('slug')(e.target.value)} className="input" />
          </Field>
          <Field label="Ordre d'affichage">
            <input type="number" value={form.position} onChange={(e) => set('position')(e.target.value)} className="input" />
          </Field>
        </div>
        {kind === 'categories' ? (
          <Switch checked={form.isVisible} onChange={set('isVisible')} label="Visible sur la boutique" />
        ) : (
          <Switch checked={form.isFeatured} onChange={set('isFeatured')} label="Marque mise en avant" description="Affichée en grand sur la page Marques" />
        )}
      </form>
    </Modal>
  );
}

export default function Taxonomy({ kind }) {
  const cfg = CONFIG[kind];
  const { data = [], isLoading } = useAdminQuery([kind], `/${kind}`);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const remove = useAdminMutation((id) => adminApi(`/${kind}/${id}`, { method: 'DELETE' }), { success: 'Supprimé', onSuccess: () => setDeleting(null) });

  const groups = kind === 'categories' ? [['type', 'Types de soin'], ['routine', 'Routines']] : [[null, null]];

  return (
    <>
      <PageTitle
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
          <button type="button" onClick={() => setEditing({})} className="btn-primary py-2.5">
            <Plus className="size-4" /> Ajouter
          </button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-3xl" />
      ) : (
        groups.map(([group, label]) => (
          <section key={group ?? 'all'} className="mb-8">
            {label && <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{label}</h2>}
            <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data
                .filter((x) => !group || x.kind === group)
                .map((item) => {
                  const img = item.imageUrl || item.logoUrl;
                  const name = typeof item.name === 'string' ? item.name : item.name.fr;
                  return (
                    <Card key={item.id} className="flex items-center gap-4 p-4 transition hover:shadow-soft">
                      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sand text-lg font-semibold text-brand-700">
                        {img ? <img src={img} alt="" className="size-full object-cover" /> : name[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{name}</span>
                          {item.isFeatured && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                          {item.isVisible === false && <EyeOff className="size-3.5 shrink-0 text-muted" />}
                        </span>
                        <span className="text-xs text-muted">
                          {item.productCount} produit(s) · /{item.slug}
                        </span>
                      </span>
                      <button type="button" onClick={() => setEditing(item)} className="icon-btn size-9" aria-label="Modifier">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => setDeleting(item)} className="icon-btn size-9 text-muted hover:text-rose-600" aria-label="Supprimer">
                        <Trash2 className="size-4" />
                      </button>
                    </Card>
                  );
                })}
            </motion.div>
          </section>
        ))
      )}
      {editing && <EditModal kind={kind} item={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        message="Les produits liés ne sont pas supprimés, ils sont simplement détachés."
      />
    </>
  );
}
