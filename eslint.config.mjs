import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    // `.tmp/` es el cajón de guiones y capturas de cada sesión de trabajo: está
    // fuera de git y no tiene por qué cumplir las reglas del proyecto.
    ignores: ['.next/**', 'node_modules/**', 'python-service/**', 'src/generated/**', '.tmp/**'],
  },
  ...coreWebVitals,
  ...typescriptConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default eslintConfig;
