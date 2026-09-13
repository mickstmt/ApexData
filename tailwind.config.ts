import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

// Every colour resolves through the CSS variables declared in src/app/globals.css
// so the .dark class can swap themes. Hardcoding values here breaks dark mode.
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * `pc`: hay ancho de escritorio Y altura para usarlo.
       *
       * `md` mira solo el ancho, y un telefono tumbado mide 844x390: pasa de
       * sobra los 768 px y la app se cree un ordenador. El usuario lo vio al
       * salir de la pantalla completa con el telefono girado — «no entiendo que
       * version es esa»: la cabecera del sitio puesta y el mapa diminuto,
       * porque el reparto de escritorio le da 340 px a la torre y deja al
       * circuito sin sitio en 390 px de alto.
       *
       * No se toca `md` a proposito: en una tabla o una lista, mas ancho SI es
       * mejor aunque haya poca altura. El problema es de las pantallas que
       * reparten en vertical, y esas son las que usan `pc`.
       */
      screens: {
        pc: { raw: '(min-width: 768px) and (min-height: 500px)' },
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Superficie teñida por el equipo favorito. Se usa siempre con
        // opacidad baja (`bg-ambiente/10`): el color de marca crudo no es
        // legible como tinta, pero como velo sobre el fondo funciona.
        ambiente: 'hsl(var(--ambiente) / <alpha-value>)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Timing semantics, kept apart from the brand accent.
        fastest: 'hsl(var(--fastest))',
        'personal-best': 'hsl(var(--personal-best))',
        slower: 'hsl(var(--slower))',
        live: 'hsl(var(--live))',
        podium: {
          gold: 'hsl(var(--podium-gold))',
          silver: 'hsl(var(--podium-silver))',
          bronze: 'hsl(var(--podium-bronze))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
