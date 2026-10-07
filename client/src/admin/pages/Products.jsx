import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Star, Eye, EyeOff, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { Card, ConfirmDialog, PageTitle, Pagination, SearchInput, adminApi, useAdminMutation, useAdminQuery, money } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

function StockCell({ product }) {
  const [value, setValue] = useState(product.stock);
  const save = useAdminMutation((stock) => adminApi(`/products/${product.id}/stock`, { method: 'PATCH', body: { stock } }), { success: 'Stock mis à jour' });
  return (
    <input
      type="number"
      min="0"
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => Number(value) !== product.stock && save.mutate(Math.max(0, Number(value) || 0))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={cn(
        'w-20 rounded-xl border px-2.5 py-1.5 text-sm tabular-nums focus:border-brand-400 focus:outline-none',
        product.stock === 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : product.stock <= 5 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-line',
      )}
      aria-label="Stock"
    />
  );
}

export default function Products() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const brand = params.get('brand') || '';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading } = useAdminQuery(['products'], '/products', { q, status, brand, page, limit: 25 });
  const { data: brands = [] } = useAdminQuery(['brands'], '/brands');

  const set = (updates) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in updates)) next.delete('page');
    setParams(next);
    setSelected([]);
  };

  const bulk = useAdminMutation((action) => adminApi('/products/bulk', { method: 'PATCH', body: { ids: selected, action } }), {
    success: 'Action appliquée',
    onSuccess: () => {
      setSelected([]);
      setConfirm(false);
    },
  });
  const toggle = useAdminMutation(({ id, action }) => adminApi('/products/bulk', { method: 'PATCH', body: { ids: [id], action } }), { success: null });

  const rows = data?.rows ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <PageTitle
        title="Produits"
        subtitle={data ? `${data.total} produit(s)` : ' '}
        actions={
          <Link to="/admin/products/new" className="btn-primary py-2.5">
            <Plus className="size-4" /> Nouveau produit
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => set({ q: v })} placeholder="Nom, marque, SKU…" className="flex-1" />
          <select value={status} onChange={(e) => set({ status: e.target.value })} className="input w-auto py-2.5">
            <option value="">Tous les statuts</option>
            <option value="active">En ligne</option>
            <option value="inactive">Masqués</option>
            <option value="low_stock">Stock faible (≤ 5)</option>
          </select>
          <select value={brand} onChange={(e) => set({ brand: e.target.value })} className="input w-auto py-2.5">
            <option value="">Toutes les marques</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 bg-brand-50 px-4 py-3 text-sm">
                <span className="me-2 font-medium text-brand-900">{selected.length} sélectionné(s)</span>
                <button type="button" className="btn-ghost bg-white py-1.5" onClick={() => bulk.mutate('activate')}>
                  <Eye className="size-4" /> Publier
                </button>
                <button type="button" className="btn-ghost bg-white py-1.5" onClick={() => bulk.mutate('deactivate')}>
                  <EyeOff className="size-4" /> Masquer
                </button>
                <button type="button" className="btn-ghost bg-white py-1.5" onClick={() => bulk.mutate('feature')}>
                  <Star className="size-4" /> Mettre en avant
                </button>
                <button type="button" className="btn-ghost bg-white py-1.5 text-rose-600" onClick={() => setConfirm(true)}>
                  <Trash2 className="size-4" /> Supprimer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))} className="size-4 accent-brand-500" aria-label="Tout sélectionner" />
                </th>
                <th className="px-3 py-3 font-medium">Produit</th>
                <th className="px-3 py-3 font-medium">Prix</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Ventes</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading
                ? Array.from({ length: 10 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-10" />
                      </td>
                    </tr>
                  ))
                : rows.map((p) => (
                    <tr key={p.id} className={cn('transition hover:bg-zinc-50', selected.includes(p.id) && 'bg-brand-50/40')}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                          className="size-4 accent-brand-500"
                          aria-label={`Sélectionner ${p.name}`}
                        />
                      </td>
                      <td className="cursor-pointer px-3 py-3" onClick={() => navigate(`/admin/products/${p.id}`)}>
                        <div className="flex items-center gap-3">
                          <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-cover" loading="lazy" />}</span>
                          <span className="min-w-0">
                            <span className="line-clamp-1 font-medium text-ink">{p.name}</span>
                            <span className="text-xs text-muted">{p.brand || 'Sans marque'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-medium">{money(p.price)}</span>
                        {p.compareAtPrice > p.price && <s className="ms-1.5 text-xs text-muted">{money(p.compareAtPrice)}</s>}
                      </td>
                      <td className="px-3 py-3">
                        <StockCell key={p.stock} product={p} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">{p.salesCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggle.mutate({ id: p.id, action: p.isActive ? 'deactivate' : 'activate' })}
                            className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', p.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
                          >
                            {p.isActive ? 'En ligne' : 'Masqué'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle.mutate({ id: p.id, action: p.isFeatured ? 'unfeature' : 'feature' })}
                            aria-label="Mettre en avant"
                            className="icon-btn size-8"
                          >
                            <Star className={cn('size-4', p.isFeatured ? 'fill-amber-400 text-amber-400' : 'text-zinc-300')} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <a href={`/fr/product/${p.slug}`} target="_blank" rel="noreferrer" className="icon-btn size-8" aria-label="Voir">
                            <ExternalLink className="size-4" />
                          </a>
                          <Link to={`/admin/products/${p.id}`} className="icon-btn size-8" aria-label="Modifier">
                            <Pencil className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && !rows.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    Aucun produit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(p) => set({ page: String(p) })} />}
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => bulk.mutate('delete')}
        loading={bulk.isPending}
        message={`Supprimer définitivement ${selected.length} produit(s) et leurs images ? Les commandes passées restent intactes. Astuce : « Masquer » permet de retirer un produit sans le perdre.`}
      />
    </>
  );
}
