import type { Metadata, Viewport } from 'next';
import { Orbitron, Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PageTransition } from '@/components/providers/PageTransition';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { ThemeColorSync } from '@/components/pwa/ThemeColorSync';
import { IosInstallHint } from '@/components/pwa/IosInstallHint';
import { APPLE_STARTUP_IMAGES } from '@/lib/apple-splash';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ApexData | Datos y telemetría de Fórmula 1',
  description: 'Calendario, resultados, clasificación y análisis de telemetría de Fórmula 1.',
  applicationName: 'ApexData',
  keywords: ['Formula 1', 'F1', 'motorsport', 'racing', 'data', 'statistics', 'telemetría'],
  authors: [{ name: 'ApexData' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    // Lets the app paint under the status bar, which is why the layout below
    // pads with the safe-area insets.
    statusBarStyle: 'black-translucent',
    title: 'ApexData',
    startupImage: [...APPLE_STARTUP_IMAGES],
  },
  openGraph: {
    title: 'ApexData | Datos y telemetría de Fórmula 1',
    description: 'Calendario, resultados, clasificación y análisis de telemetría de Fórmula 1.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  width: 'device-width',
  initialScale: 1,
  // Stops iOS from zooming in when a field is focused. Inputs are set at 16px
  // so nothing is unreadable as a result.
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to report anything at all.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${orbitron.variable} ${inter.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FavoritesProvider>
            <Header />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            {/* Clearance for the fixed tab bar, below the last element on the
                page so the footer stays reachable on phones. */}
            <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
              <Footer />
            </div>
            <MobileTabBar />
            <IosInstallHint />
            <PwaRegister />
            <ThemeColorSync />
          </FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
