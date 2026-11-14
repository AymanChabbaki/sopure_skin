import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, Loader2, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Card, ConfirmDialog, EDITING, I18nInput, Modal, PageTitle, Switch, adminApi, money, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

/** Every product (id → row), to show names and pictures of the products already in a pack. */
export function useAllProducts() {
  return useQuery({
    queryKey: ['admin', 'products', 'all'],
    queryFn: async () => {
      const all = [];
      for (let page = 1; ; page += 1) {
        const res = await adminApi('/products', { params: { limit: 100, page, sort: 'name' } });
        all.push(...res.rows);
        if (page >= res.pages) break;
      }
      return all;
    },
    staleTime: 60_000,
  });
}

const EMPTY = { name: { fr: '', en: '', ar: '' }, description: {}, isActive: true, productIds: [], categoryIds: [] };

/** Product picker: browse by category, search, tick products. */
function ProductPicker({ categories, selected, onToggle }) {
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const { data, isFetching } = useAdminQuery(['pack-picker'], '/products', { category: category || undefined, q: q.trim() || undefined, limit: 100, sort: 'name' }, EDITING);
  const rows = data?.rows ?? [];
  const types = categories.filter((c) => c.kind === 'type');

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input py-2.5 sm:w-56" aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {types.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name.fr}{c.productCount != null ? ` (${c.productCount})` : ''}
            </option>
          ))}
        </select>
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit ou une marque…" className="input py-2.5 ps-9" />
        </label>
      </div>
      <div className="relative max-h-[46vh] overflow-y-auto rounded-2xl border border-line p-2">
        {isFetching && <Loader2 className="absolute end-3 top-3 size-4 animate-spin text-brand-500" />}
        {rows.length === 0 && !isFetching && <p className="py-10 text-center text-sm text-muted">Aucun produit.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((p) => {
            const on = selected.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onToggle(p.id)}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-2 text-start transition', on ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-zinc-50')}
                >
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border-2', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300')}>
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-contain mix-blend-multiply" loading="lazy" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm">{p.name}</span>
                    <span className="text-xs text-muted">
                      {p.brand || '—'} · {money(p.price)}
                      {p.stock === 0 && <span className="text-rose-600"> · rupture</span>}
                      {!p.isActive && <span className="text-amber-700"> · masqué</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PackEditor({ pack, categories, products, onClose }) {
  const [form, setForm] = useState(() => (pack ? { ...EMPTY, ...pack } : EMPTY));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const routines = categories.filter((c) => c.kind === 'routine');
  const total = form.productIds.reduce((s, id) => s + (byId.get(id)?.price || 0), 0);

  // Functional updates: several quick clicks must all count
  const toggleProduct = (id) =>
    setForm((f) => ({ ...f, productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id] }));
  const move = (i, d) =>
    setForm((f) => {
      const next = [...f.productIds];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return { ...f, productIds: next };
    });

  const save = useAdminMutation((body) => adminApi(pack ? `/packs/${pack.id}` : '/packs', { method: pack ? 'PUT' : 'POST', body }), {
    success: pack ? 'Pack enregistré' : 'Pack créé',
    onSuccess: onClose,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={pack ? `Modifier « ${pack.name.fr} »` : 'Nouveau pack'}
      size="max-w-6xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-outline py-2.5">
            Annuler
          </button>
          <button type="button" disabled={save.isPending || !form.name.fr?.trim() || !form.productIds.length} onClick={() => save.mutate(form)} className="btn-primary py-2.5 disabled:opacity-50">
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <I18nInput label="Nom du pack" value={form.name} onChange={set('name')} required placeholder="ex : Pack éclat 5 étapes" />
          <I18nInput label="Description courte (optionnel)" value={form.description} onChange={set('description')} multiline rows={2} />
          <div>
            <p className="label">Produits — choisissez par catégorie</p>
            <ProductPicker categories={categories} selected={form.productIds} onToggle={toggleProduct} />
          </div>
        </div>

        <div className="space-y-5">
          <Switch checked={form.isActive} onChange={set('isActive')} label="Visible sur le site" description="Dans « Composer ma routine » et les pages routine" />
          <div>
            <p className="label">Routines où afficher ce pack</p>
            <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
              {routines.map((c) => {
                const on = form.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, categoryIds: f.categoryIds.includes(c.id) ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id] }))}
                    className={cn('rounded-full border px-3 py-1.5 text-xs transition', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:border-brand-300')}
                  >
                    {c.name.fr}
                  </button>
                );
              })}
            </div>
            {!form.categoryIds.length && <p className="mt-2 text-xs text-amber-700">Choisissez au moins une routine pour que le pack apparaisse.</p>}
          </div>
          <div className="rounded-2xl border border-line">
            <p className="flex items-center justify-between border-b border-line px-4 py-3 text-sm font-medium">
              Dans le pack ({form.productIds.length}) <span>{money(total)}</span>
            </p>
            {form.productIds.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">Cochez des produits à gauche.</p>
            ) : (
              <ol className="max-h-80 divide-y divide-line overflow-y-auto">
                <AnimatePresence initial={false}>
                  {form.productIds.map((id, i) => {
                    const p = byId.get(id);
                    return (
                      <motion.li key={id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2">
                        <span className="w-4 text-xs text-muted">{i + 1}</span>
                        <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-sand">{p?.image && <img src={p.image} alt="" className="size-full object-contain mix-blend-multiply" />}</span>
                        <span className="line-clamp-2 min-w-0 flex-1 text-xs">{p?.name || `#${id}`}</span>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn size-7 disabled:opacity-30" aria-label="Monter">
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === form.productIds.length - 1} className="icon-btn size-7 disabled:opacity-30" aria-label="Descendre">
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => toggleProduct(id)} className="icon-btn size-7 text-muted hover:text-rose-600" aria-label="Retirer">
                          <X className="size-3.5" />
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Packs() {
  const { data: packs = [], isLoading } = useAdminQuery(['packs'], '/packs');
  const { data: categories = [] } = useAdminQuery(['categories'], '/categories');
  const { data: products = [] } = useAllProducts();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const toggle = useAdminMutation((p) => adminApi(`/packs/${p.id}`, { method: 'PUT', body: { ...p, isActive: !p.isActive } }), { success: null });
  const remove = useAdminMutation((id) => adminApi(`/packs/${id}`, { method: 'DELETE' }), { success: 'Pack supprimé' });
  const reorder = useAdminMutation((ids) => adminApi('/packs/order', { method: 'PUT', body: { ids } }), { success: null });
  const move = (i, d) => {
    const ids = packs.map((p) => p.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <>
      <PageTitle
        title="Packs"
        subtitle="Des sélections de produits que les clientes ajoutent au panier en un clic, affichées dans « Composer ma routine »"
        actions={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary py-2.5">
            <Plus className="size-4" /> Nouveau pack
          </button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <PackagePlus className="size-10 text-brand-300" />
          <p className="text-muted">Aucun pack pour le moment.</p>
          <button type="button" onClick={() => setEditing('new')} className="btn-primary">
            Créer le premier pack
          </button>
        </Card>
      ) : (
        <motion.ul layout className="grid gap-4 lg:grid-cols-2">
          {packs.map((pack, i) => (
            <motion.li key={pack.id} layout>
              <Card className={cn('flex h-full flex-col gap-4 p-5', !pack.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{pack.name.fr}</h2>
                    <p className="text-sm text-muted">
                      {pack.productIds.length} produits · {money(pack.total)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn size-8 disabled:opacity-30" aria-label="Monter">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === packs.length - 1} className="icon-btn size-8 disabled:opacity-30" aria-label="Descendre">
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" onClick={() => setEditing(pack)} className="icon-btn size-8" aria-label="Modifier">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => setDeleting(pack)} className="icon-btn size-8 text-rose-600" aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {pack.productIds.slice(0, 8).map((id) => (
                    <span key={id} className="size-11 overflow-hidden rounded-xl border-2 border-white bg-sand" title={byId.get(id)?.name}>
                      {byId.get(id)?.image && <img src={byId.get(id).image} alt="" className="size-full object-contain mix-blend-multiply" />}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {pack.categoryIds.length ? (
                      pack.categoryIds.map((cid) => (
                        <span key={cid} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-800">
                          {catById.get(cid)?.name.fr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700">Aucune routine : pack non visible</span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Visible
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pack.isActive}
                      onClick={() => toggle.mutate(pack)}
                      className={cn('relative h-5 w-9 rounded-full transition', pack.isActive ? 'bg-brand-500' : 'bg-zinc-300')}
                    >
                      <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', pack.isActive ? 'start-[18px]' : 'start-0.5')} />
                    </button>
                  </label>
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {editing && <PackEditor pack={editing === 'new' ? null : editing} categories={categories} products={products} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove.mutate(deleting.id);
          setDeleting(null);
        }}
        title="Supprimer ce pack"
        message="Le pack disparaît du site. Les produits ne sont pas supprimés."
      />
    </>
  );
}
