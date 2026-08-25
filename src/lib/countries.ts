/**
 * Country lookups shared by the app and the image pipeline.
 *
 * Jolpica reports people and teams by demonym ("Dutch") and circuits by
 * country name ("Netherlands"), so both need mapping to ISO 3166-1 alpha-2 —
 * which is also how the flag files are named.
 */

/** Demonym (driver/constructor nationality) → ISO alpha-2. */
export const NATIONALITY_TO_ISO: Record<string, string> = {
  American: 'us',
  Argentine: 'ar',
  Argentinian: 'ar',
  Australian: 'au',
  Austrian: 'at',
  Belgian: 'be',
  Brazilian: 'br',
  British: 'gb',
  Canadian: 'ca',
  Chilean: 'cl',
  Chinese: 'cn',
  Colombian: 'co',
  Czech: 'cz',
  Danish: 'dk',
  Dutch: 'nl',
  Finnish: 'fi',
  French: 'fr',
  German: 'de',
  Hungarian: 'hu',
  Indian: 'in',
  Indonesian: 'id',
  Irish: 'ie',
  Italian: 'it',
  Japanese: 'jp',
  Liechtensteiner: 'li',
  Malaysian: 'my',
  Mexican: 'mx',
  Monegasque: 'mc',
  'New Zealander': 'nz',
  Polish: 'pl',
  Portuguese: 'pt',
  Rhodesian: 'zw',
  Russian: 'ru',
  'South African': 'za',
  Spanish: 'es',
  Swedish: 'se',
  Swiss: 'ch',
  Thai: 'th',
  Uruguayan: 'uy',
  Venezuelan: 've',
};

/** Country name (circuit location) → ISO alpha-2. */
export const COUNTRY_TO_ISO: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Azerbaijan: 'az',
  Bahrain: 'bh',
  Belgium: 'be',
  Brazil: 'br',
  Canada: 'ca',
  China: 'cn',
  France: 'fr',
  Germany: 'de',
  Hungary: 'hu',
  India: 'in',
  Italy: 'it',
  Japan: 'jp',
  Korea: 'kr',
  Malaysia: 'my',
  Mexico: 'mx',
  Monaco: 'mc',
  Morocco: 'ma',
  Netherlands: 'nl',
  Portugal: 'pt',
  Qatar: 'qa',
  Russia: 'ru',
  'Saudi Arabia': 'sa',
  Singapore: 'sg',
  'South Africa': 'za',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Turkey: 'tr',
  UAE: 'ae',
  'United Arab Emirates': 'ae',
  UK: 'gb',
  'United Kingdom': 'gb',
  USA: 'us',
  'United States': 'us',
};

/**
 * El gentilicio en español, en masculino singular.
 *
 * La base guarda la nacionalidad como la manda Jolpica —«British», «Dutch»— y
 * hasta ahora se pintaba tal cual, en inglés, dentro de una app en español.
 *
 * Están las 28 nacionalidades que hay en la base. Una que no esté se devuelve
 * como llegó: es preferible una palabra en inglés a un hueco.
 */
const GENTILICIOS: Record<string, string> = {
  American: 'Estadounidense',
  Argentine: 'Argentino',
  Australian: 'Australiano',
  Austrian: 'Austriaco',
  Belgian: 'Belga',
  Brazilian: 'Brasileño',
  British: 'Británico',
  Canadian: 'Canadiense',
  Chinese: 'Chino',
  Colombian: 'Colombiano',
  Czech: 'Checo',
  Danish: 'Danés',
  Dutch: 'Neerlandés',
  Finnish: 'Finlandés',
  French: 'Francés',
  German: 'Alemán',
  Hungarian: 'Húngaro',
  Indian: 'Indio',
  Indonesian: 'Indonesio',
  Irish: 'Irlandés',
  Italian: 'Italiano',
  Japanese: 'Japonés',
  Malaysian: 'Malasio',
  Mexican: 'Mexicano',
  Monegasque: 'Monegasco',
  'New Zealander': 'Neozelandés',
  Polish: 'Polaco',
  Portuguese: 'Portugués',
  Russian: 'Ruso',
  Spanish: 'Español',
  Swedish: 'Sueco',
  Swiss: 'Suizo',
  Thai: 'Tailandés',
  Venezuelan: 'Venezolano',
};

export function gentilicio(nacionalidad: string | null | undefined): string {
  if (!nacionalidad) return '';
  return GENTILICIOS[nacionalidad] ?? nacionalidad;
}
