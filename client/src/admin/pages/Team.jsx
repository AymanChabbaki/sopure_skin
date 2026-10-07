import { useState } from 'react';
import { Plus, Trash2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Card, ConfirmDialog, Field, Modal, PageTitle, adminApi, useAdminMutation, useAdminQuery, dateTime } from '../ui.jsx';

export default function Team({ me }) {
  const { data = [] } = useAdminQuery(['team'], '/team');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const create = useAdminMutation((body) => adminApi('/team', { method: 'POST', body }), { success: 'Membre ajouté', onSuccess: () => setAdding(false) });
  const remove = useAdminMutation((id) => adminApi(`/team/${id}`, { method: 'DELETE' }), { success: 'Membre retiré', onSuccess: () => setDeleting(null) });
  const password = useAdminMutation((body) => adminApi('/team/me/password', { method: 'PUT', body }), { success: 'Mot de passe modifié' });
  const isOwner = me.role === 'owner';

  const submitNew = (e) => {
    e.preventDefault();
    create.mutate(Object.fromEntries(new FormData(e.currentTarget)));
  };
  const submitPassword = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    password.mutate(Object.fromEntries(new FormData(form)), { onSuccess: () => form.reset() });
  };

  return (
    <>
      <PageTitle
        title="Équipe"
        subtitle="Accès à l'administration"
        actions={
          isOwner && (
            <button type="button" onClick={() => setAdding(true)} className="btn-primary py-2.5">
              <Plus className="size-4" /> Ajouter un membre
            </button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="divide-y divide-line lg:col-span-2">
          {data.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-full bg-brand-500 font-semibold text-white">{a.name[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {a.name} {a.role === 'owner' && <ShieldCheck className="size-4 text-brand-600" />}
                  {a.id === me.id && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-muted">Vous</span>}
                </span>
                <span className="block truncate text-sm text-muted">
                  {a.email} · depuis le {dateTime(a.createdAt)}
                </span>
              </span>
              {isOwner && a.id !== me.id && (
                <button type="button" onClick={() => setDeleting(a)} className="icon-btn size-9 text-muted hover:text-rose-600" aria-label="Retirer">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-muted" /> Mon mot de passe
          </h2>
          <form onSubmit={submitPassword} className="space-y-4">
            <Field label="Mot de passe actuel">
              <input name="currentPassword" type="password" required autoComplete="current-password" className="input" />
            </Field>
            <Field label="Nouveau mot de passe" hint="8 caractères minimum">
              <input name="newPassword" type="password" minLength={8} required autoComplete="new-password" className="input" />
            </Field>
            <button type="submit" disabled={password.isPending} className="btn-dark w-full py-2.5">
              {password.isPending && <Loader2 className="size-4 animate-spin" />} Modifier
            </button>
          </form>
        </Card>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Nouveau membre"
        size="max-w-md"
        footer={
          <button type="submit" form="team-form" disabled={create.isPending} className="btn-primary py-2.5">
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Ajouter
          </button>
        }
      >
        <form id="team-form" onSubmit={submitNew} className="space-y-4">
          <Field label="Nom">
            <input name="name" required className="input" />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" required className="input" />
          </Field>
          <Field label="Mot de passe provisoire" hint="8 caractères minimum">
            <input name="password" type="text" minLength={8} required className="input" />
          </Field>
          <Field label="Rôle">
            <select name="role" className="input">
              <option value="admin">Administrateur (gestion boutique)</option>
              <option value="owner">Propriétaire (gère aussi l'équipe)</option>
            </select>
          </Field>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting.id)} loading={remove.isPending} message={`Retirer l'accès de ${deleting?.name} ?`} confirmLabel="Retirer" />
    </>
  );
}
