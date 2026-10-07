import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { SosoAvatar } from './SosoAvatar.jsx';
import { useSettings } from '../../hooks/useStore.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/format.js';

// The conversation UI is only downloaded when the customer opens it
const ChatPanel = lazy(() => import('./ChatPanel.jsx'));

/**
 * Floating launcher: Soso when the AI assistant is configured, WhatsApp otherwise.
 * Product pages have a sticky purchase bar on mobile, so the button sits higher there.
 */
export function Assistant() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: settings } = useSettings();
  const { data: status } = useQuery({ queryKey: ['chat-status'], queryFn: () => api('/chat/status'), staleTime: Infinity });
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const onProduct = pathname.includes('/product/');
  // WhatsApp on the inline-end side, Soso on the inline-start side: both stay visible
  const bottom = onProduct ? 'bottom-40' : 'bottom-20';
  const whatsappPosition = cn('fixed end-4 z-30 md:end-6 md:bottom-6', bottom);
  const sosoPosition = cn('fixed start-4 z-30 md:start-6 md:bottom-6', bottom);

  // Gentle hello bubble once per session
  useEffect(() => {
    if (!status?.enabled) return undefined;
    let seen = false;
    try {
      seen = sessionStorage.getItem('sps-chat-teaser') === '1';
    } catch {
      /* storage unavailable */
    }
    if (seen) return undefined;
    const show = setTimeout(() => setTeaser(true), 6000);
    const hide = setTimeout(() => setTeaser(false), 16000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [status?.enabled]);

  const dismissTeaser = () => {
    setTeaser(false);
    try {
      sessionStorage.setItem('sps-chat-teaser', '1');
    } catch {
      /* storage unavailable */
    }
  };

  const wa = settings?.contact?.whatsapp;
  const whatsapp = wa && (
      <motion.a
        href={`https://wa.me/${wa}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        className={cn(whatsappPosition, 'grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30')}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20" />
        <FaWhatsapp className="relative size-6" />
      </motion.a>
  );

  if (!status?.enabled) return whatsapp || null;

  return (
    <>
      {whatsapp}
      <AnimatePresence>
        {!open && (
          <motion.div className={cn(sosoPosition, 'flex flex-col items-start gap-3')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnimatePresence>
              {teaser && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="relative max-w-60 rounded-2xl rounded-es-md bg-white px-4 py-3 text-sm text-ink shadow-soft"
                >
                  <button type="button" onClick={dismissTeaser} className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-white text-muted shadow" aria-label={t('nav.close')}>
                    <X className="size-3" />
                  </button>
                  <button
                    type="button"
                    className="text-start"
                    onClick={() => {
                      dismissTeaser();
                      setOpen(true);
                    }}
                  >
                    {t('assistant.greeting').split('!')[0]} !
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={() => {
                dismissTeaser();
                setOpen(true);
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 18 }}
              whileHover={{ scale: 1.08, rotate: -4 }}
              whileTap={{ scale: 0.92 }}
              className="relative grid size-16 place-items-center rounded-full bg-white shadow-lift ring-4 ring-brand-100"
              aria-label={t('assistant.open')}
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-300 opacity-20" />
              <SosoAvatar size={54} />
              <span className="absolute end-0.5 top-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <Suspense fallback={null}>
            <ChatPanel onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
