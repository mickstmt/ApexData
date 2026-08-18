import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PageTransition } from '@/components/providers/PageTransition';
import { MotionProvider } from '@/components/providers/MotionProvider';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { ThemeColorSync } from '@/components/pwa/ThemeColorSync';
import { IosInstallHint } from '@/components/pwa/IosInstallHint';
import { APPLE_STARTUP_IMAGES } from '@/lib/apple-splash';

// Chakra Petch carries the motorsport character without the sci-fi cliché
// Orbitron brings; its real italics give headings the forward lean F1 uses.
const display = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Lap times are read digit by digit, so they get a true monospace.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
  // Sin `maximumScale` ni `userScalable: false`: bloquear el zoom incumple
  // WCAG 1.4.4 y no hacía falta, porque el zoom al enfocar un campo ya se
  // evita dando 16px a inputs y selects (`text-base md:text-sm`).
  // Required for env(safe-area-inset-*) to report anything at all.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MotionProvider>
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
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
