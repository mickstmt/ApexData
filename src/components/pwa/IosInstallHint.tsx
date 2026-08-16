'use client';

import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';

const DISMISSED_KEY = 'apexdata:installHintDismissed';

/**
 * Explains how to install the app on iOS.
 *
 * Safari never fires `beforeinstallprompt`, so there is no way to offer a
 * button — the only route is the share sheet, which has to be described.
 * Shown once per device until dismissed, and never inside the installed app.
 */
export function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isIos) return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // Safari's own legacy flag, still the reliable signal on older iOS.
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (standalone) return;
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;

    // The checks above depend on browser APIs, so this can only run after
    // mount; the server has no way to know whether the app is installed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[55] flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-lg md:hidden">
      <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <p className="flex-1 text-sm leading-snug">
        Instala ApexData: toca <strong>Compartir</strong> y luego{' '}
        <strong>Añadir a pantalla de inicio</strong>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalación"
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
