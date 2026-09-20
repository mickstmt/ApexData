import { describe, expect, it } from 'vitest';

import { evaluar, type Contexto, type ModoAngular } from '@/lib/calculadora/evaluar';
import { cambiarSigno, comoLiteral } from '@/lib/calculadora/edicion';
import { formatear, superindice } from '@/lib/calculadora/formato';

/**
 * Lo que tiene que cumplir una calculadora científica para llamarse así.
 *
 * Cada bloque de aquí es una promesa que se le hace a quien la usa, y casi
 * todas son cosas que una calculadora de cuatro teclas hace MAL: la
 * precedencia, el signo delante de una potencia, el porcentaje sumado, el
 * factorial de un número con decimales. Son justo los sitios donde se nota si
 * hay un analizador de verdad debajo o una cadena de botones.
 */

const ctx = (modo: ModoAngular = 'DEG', ans = 0): Contexto => ({ modo, ans });

/** El valor, o el fallo de la prueba con el motivo delante. */
function valor(expresion: string, contexto: Contexto = ctx()): number {
  const r = evaluar(expresion, contexto);
  if (!r.ok) throw new Error(`«${expresion}» no se pudo calcular: ${r.error}`);
  return r.valor;
}

/** El motivo por el que no se pudo calcular. */
function motivo(expresion: string, contexto: Contexto = ctx()): string {
  const r = evaluar(expresion, contexto);
  if (r.ok) throw new Error(`«${expresion}» debería fallar y dio ${r.valor}`);
  return r.error;
}

describe('la jerarquía de operaciones', () => {
  it('multiplica antes de sumar', () => {
    // La prueba que separa una científica de una de supermercado: la segunda
    // contesta 20 porque va sumando según se teclea.
    expect(valor('2+3×4')).toBe(14);
  });

  it('respeta los paréntesis por encima de todo', () => {
    expect(valor('(2+3)×4')).toBe(20);
  });

  it('eleva antes de cambiar el signo', () => {
    // −2² es −(2²). Quien quiera 4 escribe (−2)², y así lo hace cualquier
    // científica de sobremesa.
    expect(valor('−2²')).toBe(-4);
    expect(valor('(−2)²')).toBe(4);
  });

  it('encadena potencias por la derecha', () => {
    expect(valor('2^3^2')).toBe(512);
  });

  it('admite un exponente negativo sin paréntesis', () => {
    expect(valor('2^-3')).toBe(0.125);
  });

  it('deja el factorial por encima de la potencia', () => {
    expect(valor('2^3!')).toBe(64);
  });
});

describe('la multiplicación implícita', () => {
  it('entiende un número pegado a una constante', () => {
    expect(valor('2π')).toBeCloseTo(Math.PI * 2, 12);
  });

  it('entiende un número pegado a un paréntesis', () => {
    expect(valor('3(4+5)')).toBe(27);
  });

  it('entiende un número pegado a una función', () => {
    expect(valor('2sin(30)')).toBe(1);
  });

  it('no se traga la multiplicación siguiente dentro de la función', () => {
    // `√9×2` son 3×2 y no √18, porque sin paréntesis la función se queda solo
    // con la potencia que lleva detrás.
    expect(valor('√9×2')).toBe(6);
  });
});

describe('los ángulos', () => {
  it('trabaja en grados por defecto', () => {
    expect(valor('sin(30)')).toBe(0.5);
    expect(valor('cos(60)')).toBe(0.5);
  });

  it('da cero exacto donde la trigonometría vale cero', () => {
    // Sin el redondeo de `ajustar`, esto daría 1,22·10⁻¹⁶ y en la pantalla
    // parecería una avería.
    expect(valor('sin(180)')).toBe(0);
    expect(valor('cos(90)')).toBe(0);
    expect(valor('sin(π)', ctx('RAD'))).toBe(0);
  });

  it('cambia de unidad sin cambiar la expresión', () => {
    expect(valor('sin(90)', ctx('RAD'))).toBeCloseTo(0.8939966636, 9);
    expect(valor('sin(100)', ctx('GRAD'))).toBe(1);
  });

  it('avisa de que la tangente de 90° no existe', () => {
    expect(motivo('tan(90)')).toMatch(/tangente/i);
    expect(motivo('tan(270)')).toMatch(/tangente/i);
  });

  it('devuelve el arco en la misma unidad en que se pregunta', () => {
    expect(valor('sin⁻¹(0.5)')).toBeCloseTo(30, 10);
    expect(valor('sin⁻¹(0.5)', ctx('RAD'))).toBeCloseTo(Math.PI / 6, 12);
  });
});

describe('el porcentaje, que no es una división entre cien', () => {
  it('suma el porcentaje del número de la izquierda', () => {
    // Esta es la regla que toda calculadora aplica y ninguna explica.
    expect(valor('200+10%')).toBe(220);
    expect(valor('200−10%')).toBe(180);
  });

  it('en un producto sí es una división entre cien', () => {
    expect(valor('200×10%')).toBe(20);
  });

  it('solo es un número cuando va suelto', () => {
    expect(valor('50%')).toBe(0.5);
  });
});

describe('las funciones', () => {
  it('hace raíces, logaritmos y valores absolutos', () => {
    expect(valor('√(144)')).toBe(12);
    expect(valor('∛(27)')).toBe(3);
    expect(valor('ln(e)')).toBe(1);
    expect(valor('log(1000)')).toBe(3);
    expect(valor('log₂(1024)')).toBe(10);
    expect(valor('abs(−7)')).toBe(7);
  });

  it('hace la raíz de índice cualquiera, incluida la impar de un negativo', () => {
    expect(valor('3ʸ√8')).toBeCloseTo(2, 12);
    expect(valor('3ʸ√(−8)')).toBeCloseTo(-2, 12);
    expect(motivo('2ʸ√(−4)')).toMatch(/raíz par/i);
  });

  it('hace el inverso y los cuadrados con los postfijos de la tecla', () => {
    expect(valor('5⁻¹')).toBe(0.2);
    expect(valor('4²')).toBe(16);
    expect(valor('3³')).toBe(27);
  });

  it('hace las hiperbólicas', () => {
    expect(valor('sinh(1)')).toBeCloseTo(Math.sinh(1), 12);
    expect(valor('tanh⁻¹(0.5)')).toBeCloseTo(Math.atanh(0.5), 12);
  });

  it('hace el resto de la división', () => {
    expect(valor('10 mod 3')).toBe(1);
    expect(valor('(−10) mod 3')).toBe(-1);
  });
});

describe('el factorial', () => {
  it('es el producto de los enteros hasta n', () => {
    expect(valor('5!')).toBe(120);
    expect(valor('0!')).toBe(1);
  });

  it('no existe para los decimales ni para los negativos', () => {
    expect(motivo('2.5!')).toMatch(/enteros/i);
    expect(motivo('(−1)!')).toMatch(/enteros/i);
  });

  it('avisa antes de desbordar en vez de devolver infinito', () => {
    expect(motivo('171!')).toMatch(/grande/i);
  });
});

describe('lo que no se puede calcular', () => {
  it('lo dice con palabras, no con NaN', () => {
    expect(motivo('1÷0')).toMatch(/dividir entre cero/i);
    expect(motivo('ln(0)')).toMatch(/logaritmo/i);
    expect(motivo('√(−4)')).toMatch(/raíz cuadrada/i);
    expect(motivo('sin⁻¹(2)')).toMatch(/arcoseno/i);
    expect(motivo('2+')).toMatch(/falta un número/i);
  });

  it('nunca lanza, pase lo que pase', () => {
    for (const basura of ['((((', ')))', '×÷', 'sin', '..', '2^^3', '', '   ']) {
      expect(() => evaluar(basura, ctx())).not.toThrow();
    }
  });
});

describe('las comodidades de una calculadora de verdad', () => {
  it('cierra sola los paréntesis que falten', () => {
    expect(valor('√(9')).toBe(3);
    expect(valor('2×(3+4')).toBe(14);
  });

  it('recuerda el último resultado en Ans', () => {
    expect(valor('Ans+1', ctx('DEG', 41))).toBe(42);
  });

  it('entiende la notación de la tecla EXP', () => {
    expect(valor('2E5')).toBe(200000);
    expect(valor('1.5E-3')).toBe(0.0015);
    // La `e` minúscula sigue siendo el número de Euler, que es justo lo que
    // obliga a que el exponente vaya en mayúscula.
    expect(valor('e')).toBeCloseTo(Math.E, 12);
  });

  it('da números al azar dentro del intervalo pedido', () => {
    const r = evaluar('rand×6', { modo: 'DEG', ans: 0, aleatorio: () => 0.5 });
    expect(r).toEqual({ ok: true, valor: 3 });
  });
});

describe('cómo se enseña el resultado', () => {
  it('esconde el ruido del coma flotante', () => {
    // 0,1 + 0,2 da 0,30000000000000004 en cualquier ordenador del mundo.
    expect(formatear(valor('0.1+0.2'))).toBe('0.3');
  });

  it('agrupa los millares con un espacio fino, no con un punto', () => {
    // El punto ya significa «coma decimal» en esta pantalla.
    expect(formatear(1234567)).toBe('1 234 567');
    expect(formatear(1234)).toBe('1234');
  });

  it('pasa a notación científica cuando el número deja de leerse', () => {
    expect(formatear(1e12)).toBe('1×10¹²');
    expect(formatear(-2.5e-11)).toBe('-2.5×10⁻¹¹');
  });

  it('no enseña el cero negativo, que existe pero no significa nada', () => {
    expect(formatear(-0)).toBe('0');
  });

  it('escribe los exponentes en superíndice', () => {
    expect(superindice(-13)).toBe('⁻¹³');
  });
});

describe('la tecla ±, que tiene más casos de los que parece', () => {
  it('niega el último número, no la expresión entera', () => {
    expect(cambiarSigno(['5'])).toEqual(['−', '5']);
    expect(cambiarSigno(['5', '×', '3'])).toEqual(['5', '×', '−', '3']);
  });

  it('se deshace al volver a pulsarla', () => {
    expect(cambiarSigno(cambiarSigno(['5', '×', '3']))).toEqual(['5', '×', '3']);
  });

  it('niega un resultado, que no tiene dígitos', () => {
    // El fallo que encontró la revisión: `Ans` no es un dígito, así que se
    // trataba como «no hay número» y quedaba `Ans−`, una expresión a medias.
    expect(cambiarSigno(['Ans'])).toEqual(['−', 'Ans']);
    expect(cambiarSigno(['−', 'Ans'])).toEqual(['Ans']);
  });

  it('niega también una constante suelta', () => {
    expect(cambiarSigno(['5', '+', 'π'])).toEqual(['5', '+', '−', 'π']);
  });

  it('dentro de un exponente usa el guion de la notación, no el tipográfico', () => {
    // `2E−5` no lo sabe leer el analizador; `2E-5` sí.
    expect(cambiarSigno(['2', 'E', '5'])).toEqual(['2', 'E', '-', '5']);
    expect(cambiarSigno(['2', 'E', '-', '5'])).toEqual(['2', 'E', '5']);
  });

  it('sobre una expresión vacía o colgando, pone el signo al final', () => {
    expect(cambiarSigno([])).toEqual(['−']);
    expect(cambiarSigno(['−'])).toEqual([]);
    expect(cambiarSigno(['5', '×'])).toEqual(['5', '×', '−']);
  });
});

describe('devolver un número a la expresión', () => {
  it('no deja que la e del exponente se confunda con la de Euler', () => {
    // `String(1e-7)` es «1e-7», que el analizador leería como 1 · e · (−7).
    const literal = comoLiteral(1e-7);
    expect(literal).not.toMatch(/[^E]e/);
    expect(valor(literal)).toBe(1e-7);
  });

  it('envuelve los negativos para que no se coman al operador de delante', () => {
    expect(valor(`2×${comoLiteral(-3)}`)).toBe(-6);
  });

  it('devuelve los enteros tal cual', () => {
    expect(comoLiteral(144)).toBe('144');
  });
});

describe('la precisión de la pantalla', () => {
  it('mantiene doce cifras significativas también en los números pequeños', () => {
    // El fallo que encontró la revisión: `toFixed(12)` cuenta DECIMALES, no
    // cifras, así que los ceros de delante se comían ocho de las doce y
    // 2⁻²⁷ salía como «0.000000007451».
    const texto = formatear(Math.pow(2, -27));
    expect(texto).toBe('0.00000000745058059692');

    // Cifras significativas: las de verdad empiezan en el primer dígito que no
    // es cero, y desde ahí cuentan todas, ceros interiores incluidos.
    const significativas = texto.replace(/^[0.]+/, '').length;
    expect(significativas).toBe(12);
  });

  it('por debajo de 10⁻⁹ ya pasa a notación científica', () => {
    expect(formatear(Math.pow(2, -31))).toBe('4.65661287×10⁻¹⁰');
  });
});
