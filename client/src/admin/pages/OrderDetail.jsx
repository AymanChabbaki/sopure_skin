import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Phone, MapPin, Mail, Printer, Trash2, Check, StickyNote } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { Card, ConfirmDialog, StatusBadge, ORDER_STATUSES, adminApi, patchCache, useAdminMutation, useAdminQuery, money, dateTime } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { waNumber } from './Orders.jsx';
import { cn } from '../../lib/format.js';

const FLOW = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useAdminQuery(['order', id], `/orders/${id}`);
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setNotes(order?.admin_notes || ''), [order?.admin_notes]);

  const update = useAdminMutation((body) => adminApi(`/orders/${id}`, { method: 'PATCH', body }), {
    success: 'Commande mise à jour',
    // The status stepper moves immediately
    optimistic: (qc, body) =>
      patchCache(qc, ['admin', 'order', id], (order) => ({
        ...order,
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminNotes !== undefined ? { admin_notes: body.adminNotes } : {}),
      })),
  });
  const remove = useAdminMutation(() => adminApi(`/orders/${id}`, { method: 'DELETE' }), {
    success: 'Commande supprimée',
    onSuccess: () => navigate('/admin/orders'),
  });

  if (isLoading || !order) return <Skeleton className="h-96 rounded-3xl" />;

  const stepIndex = FLOW.indexOf(order.status);
  const off = ['cancelled', 'returned'].includes(order.status);
  const waText = encodeURIComponent(
    `Bonjour ${order.customer_name}, nous vous contactons de la part de So Pure Skin pour confirmer votre commande ${order.number} d'un montant de ${money(order.total)}. Merci !`,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/admin/orders" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Commandes
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="btn-outline py-2.5">
            <Printer className="size-4" /> Imprimer
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-outline py-2.5 text-rose-600 hover:border-rose-300 hover:text-rose-700">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{order.number}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">{dateTime(order.created_at)}</span>
      </div>

      <Card className="mb-6 p-5 sm:p-6 print:hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <ol className="flex flex-1 items-center">
            {FLOW.map((s, i) => {
              const done = !off && i <= stepIndex;
              return (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <button
                    type="button"
                    onClick={() => update.mutate({ status: s })}
                    className="group flex flex-col items-center gap-1.5"
                    title={`Passer à « ${ORDER_STATUSES[s].label} »`}
                  >
                    <motion.span
                      animate={{ scale: done ? 1 : 0.9 }}
                      className={cn('grid size-9 place-items-center rounded-full border-2 transition', done ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-muted group-hover:border-brand-300')}
                    >
                      {done ? <Check className="size-4" /> : i + 1}
                    </motion.span>
                    <span className={cn('text-xs', done ? 'font-medium text-ink' : 'text-muted')}>{ORDER_STATUSES[s].label}</span>
                  </button>
                  {i < FLOW.length - 1 && (
                    <span className="mx-2 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                      <motion.span className="block h-full bg-brand-500" initial={false} animate={{ width: !off && i < stepIndex ? '100%' : '0%' }} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex gap-2">
            <button type="button" onClick={() => update.mutate({ status: 'cancelled' })} disabled={order.status === 'cancelled'} className="btn-outline py-2 text-sm">
              Annuler
            </button>
            <button type="button" onClick={() => update.mutate({ status: 'returned' })} disabled={order.status === 'returned'} className="btn-outline py-2 text-sm">
              Retour
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">Le stock est automatiquement réintégré lorsqu'une commande est annulée ou retournée.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <h2 className="border-b border-line p-5 font-semibold sm:px-6">Articles ({order.items_count})</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-5 sm:px-6">
                <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-sand">{item.image_url && <img src={item.image_url} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  {item.product_id ? (
                    <Link to={`/admin/products/${item.product_id}`} className="line-clamp-2 text-sm font-medium hover:text-brand-700">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                  <span className="text-xs text-muted">
                    {money(item.unit_price)} × {item.quantity}
                  </span>
                </span>
                <span className="font-medium">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line bg-zinc-50/60 p-5 text-sm sm:px-6">
            <div className="flex justify-between">
              <dt className="text-muted">Sous-total</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Livraison</dt>
              <dd>{Number(order.shipping_fee) === 0 ? <span className="text-emerald-700">Offerte</span> : money(order.shipping_fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Total à encaisser</dt>
              <dd className="text-brand-700">{money(order.total)}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Client</h2>
            <p className="font-medium">{order.customer_name}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-ink/80">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-muted" /> {order.phone}
              </li>
              {order.email && (
                <li className="flex items-center gap-2 break-all">
                  <Mail className="size-4 shrink-0 text-muted" /> {order.email}
                </li>
              )}
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  <strong className="font-medium">{order.city}</strong>
                  <br />
                  {order.address}
                </span>
              </li>
            </ul>
            {order.notes && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">« {order.notes} »</p>}
            <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
              <a href={`tel:${order.phone}`} className="btn-outline py-2.5 text-sm">
                <Phone className="size-4" /> Appeler
              </a>
              <a href={`https://wa.me/${waNumber(order.phone)}?text=${waText}`} target="_blank" rel="noreferrer" className="btn bg-[#25D366] py-2.5 text-sm text-white">
                <FaWhatsapp className="size-4" /> WhatsApp
              </a>
            </div>
            <p className="mt-3 text-xs text-muted">Langue du client : {order.locale.toUpperCase()}</p>
          </Card>

          <Card className="p-5 sm:p-6 print:hidden">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <StickyNote className="size-4 text-muted" /> Notes internes
            </h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="input resize-none" placeholder="Ex : client rappelé, livraison prévue samedi…" />
            <button type="button" onClick={() => update.mutate({ adminNotes: notes })} disabled={notes === (order.admin_notes || '')} className="btn-dark mt-3 w-full py-2.5">
              Enregistrer la note
            </button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        message={`Supprimer définitivement la commande ${order.number} ? Cette action est irréversible. (Pour remettre le stock, annulez-la plutôt.)`}
      />
    </>
  );
}
