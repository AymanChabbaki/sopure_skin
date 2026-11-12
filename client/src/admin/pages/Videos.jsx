import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Clapperboard, ExternalLink, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, ConfirmDialog, I18nInput, Modal, PageTitle, adminApi, uploadFiles, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';
import { useAllProducts } from './Packs.jsx';

const MAX_MB = 50; // same limit as the server (routes/admin/packs.js)
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** Cover image: a frame taken ~1 s into the video, drawn in the browser. */
function capturePoster(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (blob) => {
      URL.revokeObjectURL(url);
      resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: blob.type }) : null);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(done, 'image/jpeg', 0.85);
    };
    video.onerror = () => done(null);
  });
}

/** Upload with progress (fetch cannot report upload progress). */
function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/videos/upload?name=${encodeURIComponent(file.name.replace(/\.\w+$/, ''))}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || `Erreur ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue'));
    xhr.send(file);
  });
}

function VideoEditor({ video, products, onClose }) {
  const [title, setTitle] = useState(video.title || {});
  const [productId, setProductId] = useState(video.productId || '');
  const save = useAdminMutation((body) => adminApi(`/videos/${video.id}`, { method: 'PUT', body }), { success: 'Vidéo enregistrée', onSuccess: onClose });
  return (
    <Modal
      open
      onClose={onClose}
      title="Modifier la vidéo"
      footer={
        <button type="button" onClick={() => save.mutate({ title, productId: productId ? Number(productId) : null })} disabled={save.isPending} className="btn-primary py-2.5">
          {save.isPending && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </button>
      }
    >
      <div className="space-y-5">
        <video src={video.url} poster={video.posterUrl || undefined} controls className="mx-auto max-h-72 rounded-2xl bg-black" />
        <I18nInput label="Titre (optionnel)" value={title} onChange={setTitle} placeholder="ex : Ma routine du soir en 3 étapes" />
        <label className="block">
          <span className="label">Produit lié (bouton « Voir le produit »)</span>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
            <option value="">Aucun</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}

export default function Videos() {
  const { data: videos = [], isLoading } = useAdminQuery(['videos'], '/videos');
  const { data: products = [] } = useAllProducts();
  const [uploads, setUploads] = useState([]); // [{ name, progress, error }]
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const create = useAdminMutation((body) => adminApi('/videos', { method: 'POST', body }), { success: null });
  const update = useAdminMutation(({ id, ...body }) => adminApi(`/videos/${id}`, { method: 'PUT', body }), { success: null });
  const remove = useAdminMutation((id) => adminApi(`/videos/${id}`, { method: 'DELETE' }), { success: 'Vidéo supprimée' });
  const reorder = useAdminMutation((ids) => adminApi('/videos/order', { method: 'PUT', body: { ids } }), { success: null });
  const move = (i, d) => {
    const ids = videos.map((v) => v.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorder.mutate(ids);
  };

  const handleFiles = async (files) => {
    for (const file of [...(files || [])]) {
      const name = file.name;
      if (!TYPES.includes(file.type)) {
        toast.error(`${name} : format non pris en charge (MP4 conseillé)`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${name} : ${Math.round(file.size / 1048576)} Mo, maximum ${MAX_MB} Mo. Compressez la vidéo (ex. 720p).`);
        continue;
      }
      const setProgress = (patch) => setUploads((list) => list.map((u) => (u.name === name ? { ...u, ...patch } : u)));
      setUploads((list) => [...list, { name, progress: 0 }]);
      try {
        const posterFile = await capturePoster(file);
        const [poster] = posterFile ? await uploadFiles([posterFile], 'videos', name.replace(/\.\w+$/, '')) : [];
        const stored = await uploadVideo(file, (progress) => setProgress({ progress }));
        await create.mutateAsync({
          title: {},
          url: stored.url,
          key: stored.key,
          posterUrl: poster?.url || null,
          posterKey: poster?.key || null,
          isActive: true,
        });
        toast.success(`${name} ajoutée`);
        setUploads((list) => list.filter((u) => u.name !== name));
      } catch (err) {
        setProgress({ error: err.message });
      }
    }
  };

  return (
    <>
      <PageTitle
        title="Vidéos"
        subtitle="Affichées dans la section vidéo de la page d’accueil, dans cet ordre"
        actions={
          <>
            <a href="/fr" target="_blank" rel="noreferrer" className="btn-outline py-2.5">
              <ExternalLink className="size-4" /> Voir l’accueil
            </a>
            <button type="button" onClick={() => input.current?.click()} className="btn-primary py-2.5">
              <Upload className="size-4" /> Ajouter des vidéos
            </button>
          </>
        }
      />
      <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'mb-6 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-6 py-8 text-sm transition',
          over ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-300',
        )}
      >
        <Clapperboard className="size-7 text-brand-500" />
        <span className="font-medium text-ink">Glissez vos vidéos ici, ou cliquez</span>
        <span className="text-xs text-muted">MP4 recommandé (format vertical 9:16, 720p) · {MAX_MB} Mo max par vidéo · l’image de couverture est créée automatiquement</span>
      </button>

      {uploads.length > 0 && (
        <Card className="mb-6 space-y-3 p-4">
          {uploads.map((u) => (
            <div key={u.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate">{u.name}</span>
                <span className={u.error ? 'text-rose-600' : 'text-muted'}>{u.error || `${u.progress} %`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <motion.div className={cn('h-full rounded-full', u.error ? 'bg-rose-500' : 'bg-brand-500')} animate={{ width: `${u.error ? 100 : u.progress}%` }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-3xl" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="p-12 text-center text-muted">Aucune vidéo. La section vidéo n’apparaît sur l’accueil qu’à partir d’une vidéo visible.</Card>
      ) : (
        <motion.ul layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {videos.map((v, i) => (
            <motion.li key={v.id} layout className={cn('group relative overflow-hidden rounded-3xl border-4 bg-ink', v.isActive ? 'border-brand-500' : 'border-zinc-300 opacity-60')}>
              <video
                src={v.url}
                poster={v.posterUrl || undefined}
                muted
                loop
                playsInline
                preload="metadata"
                onMouseEnter={(e) => e.currentTarget.play().catch(() => null)}
                onMouseLeave={(e) => e.currentTarget.pause()}
                className="aspect-[9/16] w-full object-cover"
              />
              <span className="absolute start-2 top-2 grid size-7 place-items-center rounded-full bg-white text-xs font-bold text-ink shadow">{i + 1}</span>
              {(v.title?.fr || v.productName) && (
                <span className="absolute inset-x-2 top-11 line-clamp-2 rounded-xl bg-ink/60 px-2 py-1 text-[11px] text-white backdrop-blur">{v.title?.fr || v.productName}</span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-2xl bg-white/95 p-1 shadow-soft">
                <div className="flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="icon-btn size-8 disabled:opacity-30" aria-label="Avancer">
                    <ArrowLeft className="size-4 rtl:-scale-x-100" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === videos.length - 1} className="icon-btn size-8 disabled:opacity-30" aria-label="Reculer">
                    <ArrowRight className="size-4 rtl:-scale-x-100" />
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={v.isActive}
                    title={v.isActive ? 'Visible (cliquer pour masquer)' : 'Masquée'}
                    onClick={() => update.mutate({ id: v.id, isActive: !v.isActive })}
                    className={cn('relative mx-1 h-5 w-9 rounded-full transition', v.isActive ? 'bg-brand-500' : 'bg-zinc-300')}
                  >
                    <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', v.isActive ? 'start-[18px]' : 'start-0.5')} />
                  </button>
                  <button type="button" onClick={() => setEditing(v)} className="icon-btn size-8" aria-label="Modifier">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => setDeleting(v)} className="icon-btn size-8 text-rose-600" aria-label="Supprimer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {editing && <VideoEditor video={editing} products={products} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove.mutate(deleting.id);
          setDeleting(null);
        }}
        title="Supprimer cette vidéo"
        message="La vidéo est retirée de l’accueil et supprimée du stockage."
      />
    </>
  );
}
