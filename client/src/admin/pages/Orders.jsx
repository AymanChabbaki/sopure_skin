import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Download, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { Card, PageTitle, Pagination, SearchInput, StatusBadge, ORDER_STATUSES, useAdminQuery, money, dateTime } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

/** "06 12.." -> "212612.." for wa.me links */
export const waNumber = (phone) => phone.replace(/\D/g, '').replace(/^0/, '212');

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading } = useAdminQuery(['orders'], '/orders', { status, q, page, limit: 20 });

  const set = (updates) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in updates)) next.delete('page');
    setParams(next);
  };

  const counts = data?.statusCounts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [['', 'Toutes', all], ...Object.entries(ORDER_STATUSES).map(([k, v]) => [k, v.label, counts[k] || 0])];

  return (
    <>
      <PageTitle
        title="Commandes"
        subtitle="Paiement à la livraison · confirmez chaque commande par téléphone"
        actions={
          <a href="/api/admin/orders/export.csv" className="btn-outline py-2.5">
            <Download className="size-4" /> Exporter CSV
          </a>
        }
      />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => set({ status: key })}
            className={cn('relative shrink-0 rounded-full px-4 py-2 text-sm transition', status === key ? 'text-white' : 'text-muted hover:bg-white hover:text-ink')}
          >
            {status === key && <motion.span layoutId="order-tab" className="absolute inset-0 rounded-full bg-ink" />}
            <span className="relative">
              {label} <span className="opacity-60">({count})</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <SearchInput value={q} onChange={(v) => set({ q: v })} placeholder="N° de commande, nom, téléphone…" className="max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Commande</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Ville</th>
                <th className="px-3 py-3 font-medium">Articles</th>
                <th className="px-3 py-3 font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 text-right font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-3">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))
                : data.rows.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)} className="cursor-pointer transition hover:bg-brand-50/40">
                      <td className="px-5 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="font-medium text-ink" onClick={(e) => e.stopPropagation()}>
                          {o.number}
                        </Link>
                        <p className="text-xs text-muted">{dateTime(o.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        {o.customerName}
                        <p className="text-xs text-muted">{o.phone}</p>
                      </td>
                      <td className="px-3 py-3">{o.city}</td>
                      <td className="px-3 py-3">{o.itemsCount}</td>
                      <td className="px-3 py-3 font-medium whitespace-nowrap">
                        {money(o.total)}
                        {Number(o.shippingFee) === 0 && <p className="text-[11px] font-normal text-emerald-700">Livraison offerte</p>}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${o.phone}`} className="icon-btn size-8" aria-label="Appeler">
                            <Phone className="size-4" />
                          </a>
                          <a href={`https://wa.me/${waNumber(o.phone)}`} target="_blank" rel="noreferrer" className="icon-btn size-8 text-[#25D366]" aria-label="WhatsApp">
                            <FaWhatsapp className="size-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!isLoading && !data.rows.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted">
                    Aucune commande trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(p) => set({ page: String(p) })} />}
      </Card>
    </>
  );
}
