import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/format.js';

/** Side panel that slides in from the inline-end (right in LTR, left in RTL). */
export function Drawer({ open, onClose, title, children, footer, side = 'end', className }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === 'rtl';
  const fromRight = (side === 'end') !== rtl;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'absolute inset-y-0 flex w-full max-w-md flex-col bg-white shadow-2xl',
              fromRight ? 'right-0' : 'left-0',
              className,
            )}
            initial={{ x: fromRight ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: fromRight ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl">{title}</h2>
              <button type="button" onClick={onClose} className="icon-btn" aria-label={t('nav.close')}>
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <footer className="border-t border-line p-5">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
