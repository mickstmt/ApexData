'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // `theme` vale 'system' mientras el usuario no elige, así que comparar con
  // 'dark' daba falso y el primer clic ponía 'dark'… que era justo lo que ya
  // se veía si el sistema estaba en oscuro: clic sin efecto visible, y solo
  // el segundo funcionaba. `resolvedTheme` es el tema que se está viendo.
  const { resolvedTheme, setTheme } = useTheme();

  // Documented next-themes hydration guard: the theme is only known on the
  // client, so the first client render must match the server's placeholder.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-11 w-11 rounded-md border border-input bg-background md:h-9 md:w-9" />
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="relative flex h-11 w-11 items-center justify-center rounded-md border border-input bg-background transition-colors hover:border-primary hover:bg-accent md:h-9 md:w-9"
      aria-label={resolvedTheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Sun className="absolute inset-2 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute inset-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">
        {resolvedTheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      </span>
    </motion.button>
  );
}
