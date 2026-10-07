import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Check, EyeOff, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, ConfirmDialog, PageTitle, Pagination, adminApi, useAdminMutation, useAdminQuery, dateTime } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { cn } from '../../lib/format.js';

const TABS = [
  ['pending', 'À modérer'],
  ['approved', 'Publiés'],
  ['sample', 'Exemples'],
  ['all', 'Tous'],
];

export default function Reviews() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'pending';
  const page = Number(params.get('page')) || 1;
  const [confirmSamples, setConfirmSamples] = useState(false);
  const { data, isLoading } = useAdminQuery(['reviews'], '/reviews', { status, page });

  const approve = useAdminMutation(({ id, isApproved }) => adminApi(`/reviews/${id}`, { method: 'PATCH', body: { isApproved } }), { success: 'Avis mis à jour' });
  const remove = useAdminMutation((id) => adminApi(`/reviews/${id}`, { method: 'DELETE' }), { success: 'Avis supprimé' });
  const removeSamples = useAdminMutation(() => adminApi('/reviews/samples', { method: 'DELETE' }), {
    success: 'Avis d’exemple supprimés',
    onSuccess: () => setConfirmSamples(false),
  });
  const counts = data?.counts || {};

  return (
    <>
      <PageTitle title="Avis clients" subtitle="Les avis envoyés par les clientes sont publiés après votre validation." />

      {counts.sample > 0 && (
        <Card className="mb-6 flex flex-col gap-4 border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <AlertTriangle className="size-6 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">
            <strong>{counts.sample} avis d’exemple</strong> générés automatiquement sont affichés sur la boutique. Supprimez-les avant le lancement : présenter des avis inventés comme réels
            trompe les clientes. Ils ne sont jamais envoyés à Google.
          </p>
          <button type="button" onClick={() => setConfirmSamples(true)} className="btn shrink-0 bg-amber-600 py-2.5 text-white hover:bg-amber-700">
            <Sparkles className="size-4" /> Supprimer les exemples
          </button>
        </Card>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams({ status: key })}
            className={cn('relative shrink-0 rounded-full px-4 py-2 text-sm transition', status === key ? 'text-white' : 'text-muted hover:bg-white hover:text-ink')}
          >
            {status === key && <motion.span layoutId="reviews-tab" className="absolute inset-0 rounded-full bg-ink" />}
            <span className="relative">
              {label} <span className="opacity-60">({counts[key] ?? 0})</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="divide-y divide-line">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="m-4 h-20" />)
          : data.rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Stars value={r.rating} />
                    <span className="font-medium">{r.author}</span>
                    {r.city && <span className="text-muted">· {r.city}</span>}
                    <span className="text-xs text-muted">· {dateTime(r.createdAt)}</span>
                    {r.isSample && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Exemple</span>}
                    {!r.isApproved && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">En attente</span>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/85" dir="auto">
                    {r.body}
                  </p>
                  <Link to={`/admin/products/${r.productId}`} className="mt-2 inline-block text-xs text-brand-700 hover:underline">
                    {r.productName}
                  </Link>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.isApproved ? (
                    <button type="button" onClick={() => approve.mutate({ id: r.id, isApproved: false })} className="btn-outline py-2 text-sm">
                      <EyeOff className="size-4" /> Masquer
                    </button>
                  ) : (
                    <button type="button" onClick={() => approve.mutate({ id: r.id, isApproved: true })} className="btn-primary py-2 text-sm">
                      <Check className="size-4" /> Publier
                    </button>
                  )}
                  <button type="button" onClick={() => remove.mutate(r.id)} className="icon-btn size-10 text-muted hover:text-rose-600" aria-label="Supprimer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
        {!isLoading && !data.rows.length && <p className="p-10 text-center text-muted">Aucun avis ici.</p>}
      </Card>
      {data && <Pagination page={data.page} pages={data.pages} total={counts[status] ?? 0} onChange={(p) => setParams({ status, page: String(p) })} />}

      <ConfirmDialog
        open={confirmSamples}
        onClose={() => setConfirmSamples(false)}
        onConfirm={() => removeSamples.mutate()}
        loading={removeSamples.isPending}
        title="Supprimer les avis d’exemple"
        confirmLabel="Supprimer"
        message={`Les ${counts.sample} avis générés automatiquement seront supprimés. Les avis envoyés par de vraies clientes ne sont pas touchés.`}
      />
    </>
  );
}
