import { ViewTransition, type ReactNode } from 'react';

/**
 * La transición direccional entre pantallas.
 *
 * ## Qué problema resuelve
 *
 * Lo nuevo entra desde la derecha porque está **más adentro**; al volver, sale
 * hacia la derecha. Es la convención de iOS y la de casi cualquier app: la
 * dirección dice si bajas un nivel o subes, y eso el usuario lo lee sin
 * pensarlo. Antes no había ninguna señal — ir y volver se veían igual.
 *
 * Y sustituye a algo peor. La transición anterior desmontaba la página vieja
 * **antes** de montar la nueva (`AnimatePresence mode="wait"`), así que entre
 * medias no había ninguna página: entre 300 y 1130 ms de pantalla vacía según
 * la ruta, medido. Durante ese hueco ni siquiera podía aparecer el esqueleto de
 * carga, porque no había página que lo contuviera.
 *
 * ## Por qué esto y no una animación escrita a mano
 *
 * Porque el navegador ya sabe hacerlo. La API de transiciones de vista toma una
 * foto de lo que había y la anima contra lo nuevo, así que no hay dos páginas
 * en el DOM peleándose por el sitio — que es el motivo por el que la versión
 * anterior necesitaba ese `mode="wait"` para empezar.
 *
 * Y donde no esté soportada, no pasa nada: la navegación funciona igual, sin
 * animar. Eso importa aquí más que en otros sitios, porque esta app se usa en
 * iPhone, en Android y en escritorio, y ninguna de las tres puede quedarse rota
 * por una animación.
 *
 * ## Va en cada página, no en el layout
 *
 * Un layout persiste entre navegaciones, así que sus animaciones de entrada y
 * salida no llegan a dispararse nunca. Por eso este envoltorio se pone dentro
 * de cada `page.tsx` de las que participan.
 *
 * ## Qué NO desliza
 *
 * `default: 'none'` deja sin animación todo lo que no lleve un tipo declarado:
 *
 * - **El retroceso del sistema.** Al deslizar desde el borde, iOS ya trae su
 *   propia animación; superponer la nuestra parecía una recarga y se arregló en
 *   agosto. Aquí se respeta esa decisión.
 * - **El cambio de pestaña.** Inicio, Calendario, Clasificación y Pilotos son
 *   hermanas, no una dentro de otra: deslizar entre ellas afirmaría una
 *   jerarquía que no existe.
 */
export function Transicion({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
