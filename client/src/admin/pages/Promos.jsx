import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, TicketPercent, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, ConfirmDialog, Field, Modal, PageTitle, Switch, adminApi, money, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const TYPES = {
  percent: 'Pourcentage (%)',
  fixed: 'Montant fixe (DH)',
  shipping: 'Livraison offerte',
};
const EMPTY = { code: '', type: 'percent', value: 10, minSubtotal: 0, maxUses: '', startsAt: '', endsAt: '', isActive: true };

const describe = (p) => (p.type === 'percent' ? `−${p.value}%` : p.type === 'fixed' ? `−${money(p.value)}` : 'Livraison offerte');
const shortDate = (v) => new Date(v).toLocaleDateString('fr-MA', { dateStyle: 'medium', timeZone: 'Africa/Casablanca' });
const day = (v) => (v ? new Date(v).toLocaleDateString('fr-CA', { timeZone: 'Africa/Casablanca' }) : ''); // YYYY-MM-DD for <input type="date">

/** Status shown on each code: what a customer would get if they typed it now. */
function status(p) {
  const now = new Date();
  if (!p.isActive) return ['Désactivé', 'bg-zinc-100 text-zinc-600'];
  if (p.startsAt && new Date(p.startsAt) > now) return ['Programmé', 'bg-sky-50 text-sky-700'];
  if (p.endsAt && new Date(p.endsAt) < now) return ['Expiré', 'bg-rose-50 text-rose-700'];
  if (p.maxUses != null && p.uses >= p.maxUses) return ['Épuisé', 'bg-amber-50 text-amber-700'];
  return ['Actif', 'bg-emerald-50 text-emerald-700'];
}

function EditModal({ promo, onClose }) {
  const [form, setForm] = useState(() =>
    promo ? { ...promo, maxUses: promo.maxUses ?? '', startsAt: day(promo.startsAt), endsAt: day(promo.endsAt) } : EMPTY,
  );
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const input = (k) => (e) => set(k)(e.target.value);
  const save = useAdminMutation(
    (body) => adminApi(promo ? `/promos/${promo.id}` : '/promos', { method: promo ? 'PUT' : 'POST', body }),
    { onSuccess: onClose },
  );
  const submit = (e) => {
    e.preventDefault();
    save.mutate({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      minSubtotal: Number(form.minSubtotal) || 0,
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      isActive: form.isActive,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={promo ? `Modifier ${promo.code}` : 'Nouveau code promo'}
      size="max-w-lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="promo-form" className="btn-primary py-2.5" disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
        </>
      }
    >
      <form id="promo-form" onSubmit={submit} className="space-y-5">
        <Field label="Code" hint="Ce que la cliente tape au panier. Lettres et chiffres, sans espace (ex. BLACKFRIDAY).">
          <input className="input font-mono uppercase" required minLength={2} maxLength={40} pattern="[A-Za-z0-9_\-]+" value={form.code} onChange={input('code')} placeholder="BLACKFRIDAY" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type de réduction">
            <select className="input" value={form.type} onChange={input('type')}>
              {Object.entries(TYPES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          {form.type !== 'shipping' && (
            <Field label={form.type === 'percent' ? 'Réduction (%)' : 'Réduction (DH)'}>
              <input className="input" type="number" required min={1} max={form.type === 'percent' ? 100 : undefined} step="1" value={form.value} onChange={input('value')} />
            </Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Achat minimum (DH)" hint="0 = sans minimum. Calculé sur les produits, hors livraison.">
            <input className="input" type="number" min={0} step="1" value={form.minSubtotal} onChange={input('minSubtotal')} />
          </Field>
          <Field label="Nombre d’utilisations max" hint="Vide = illimité">
            <input className="input" type="number" min={1} step="1" value={form.maxUses} onChange={input('maxUses')} placeholder="Illimité" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valable à partir du" hint="Vide = tout de suite">
            <input className="input" type="date" value={form.startsAt} onChange={input('startsAt')} />
          </Field>
          <Field label="Jusqu’au (inclus)" hint="Vide = sans fin">
            <input className="input" type="date" value={form.endsAt} min={form.startsAt || undefined} onChange={input('endsAt')} />
          </Field>
        </div>
        <Switch checked={form.isActive} onChange={set('isActive')} label="Actif" description="Désactivez pour arrêter le code sans le supprimer" />
      </form>
    </Modal>
  );
}

export default function PromosPage() {
  const { data: promos = [], isLoading } = useAdminQuery(['promos'], '/promos');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const toggle = useAdminMutation(({ id, isActive }) => adminApi(`/promos/${id}`, { method: 'PATCH', body: { isActive } }), { success: null });
  const remove = useAdminMutation((id) => adminApi(`/promos/${id}`, { method: 'DELETE' }), { success: 'Code supprimé', onSuccess: () => setDeleting(null) });

  return (
    <>
      <PageTitle
        title="Codes promo"
        subtitle="Les clientes saisissent le code au panier ou à la commande. La réduction est recalculée par le serveur."
        actions={
          <button type="button" className="btn-primary py-2.5" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nouveau code
          </button>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
        </div>
      ) : !promos.length ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <TicketPercent className="size-10 text-brand-300" />
          <p className="text-muted">Aucun code promo pour l’instant.</p>
          <button type="button" className="btn-primary py-2.5" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Créer un code
          </button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promos.map((p) => {
            const [label, cls] = status(p);
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    title="Copier le code"
                    onClick={() => navigator.clipboard?.writeText(p.code).then(() => toast.success('Code copié'))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono text-sm font-semibold text-brand-800"
                  >
                    {p.code} <Copy className="size-3.5 opacity-60" />
                  </button>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', cls)}>{label}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-ink">{describe(p)}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {p.minSubtotal > 0 && <li>Dès {money(p.minSubtotal)} d’achat</li>}
                  <li>
                    Utilisé {p.uses}{p.maxUses != null ? ` / ${p.maxUses}` : ''} fois
                    {p.totalDiscount > 0 && ` · ${money(p.totalDiscount)} offerts`}
                  </li>
                  {(p.startsAt || p.endsAt) && (
                    <li>
                      {p.startsAt ? `Du ${shortDate(p.startsAt)}` : 'Dès maintenant'}
                      {p.endsAt ? ` au ${shortDate(p.endsAt)}` : ', sans fin'}
                    </li>
                  )}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <Switch checked={p.isActive} onChange={(isActive) => toggle.mutate({ id: p.id, isActive })} label={p.isActive ? 'Actif' : 'Désactivé'} />
                  <div className="flex gap-1">
                    <button type="button" className="icon-btn size-9" aria-label="Modifier" onClick={() => setEditing(p)}>
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" className="icon-btn size-9 hover:text-rose-600" aria-label="Supprimer" onClick={() => setDeleting(p)}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <EditModal promo={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        message={`Supprimer le code ${deleting?.code} ? Les commandes déjà passées gardent leur réduction. Pour l’arrêter sans le perdre, désactivez-le plutôt.`}
      />
    </>
  );
}
