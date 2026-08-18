/* Salida por consola con colores, para que el arranque se lea de un vistazo. */

// Se desactivan los colores si la salida no es una terminal (por ejemplo, al
// redirigir a un archivo) o si se pide con NO_COLOR.
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (codigo, texto) => (COLOR ? "\u001b[" + codigo + "m" + texto + "\u001b[0m" : texto);

const gris = (t) => c("90", t);
const verde = (t) => c("32", t);
const amarillo = (t) => c("33", t);
const rojo = (t) => c("31", t);
const cyan = (t) => c("36", t);
const negrita = (t) => c("1", t);

const log = (msg) => console.log(cyan("›") + " " + msg);
const exito = (msg) => console.log(verde("✓") + " " + msg);
const aviso = (msg) => console.log(amarillo("!") + " " + msg);
const error = (msg) => console.error(rojo("✗") + " " + msg);
const detalle = (msg) => console.log(gris("  " + msg));

/** Encabezado del arranque. */
function titulo(texto) {
  console.log("\n" + negrita(texto));
}

/** Recuadro con la informacion util una vez que todo esta arriba. */
function recuadro(lineas) {
  const limpio = (t) => t.replace(/\u001b\[[0-9;]*m/g, "");
  const ancho = Math.max(...lineas.map((l) => limpio(l).length));
  const borde = "─".repeat(ancho + 2);
  console.log("\n" + gris("┌" + borde + "┐"));
  for (const l of lineas) {
    console.log(gris("│") + " " + l + " ".repeat(ancho - limpio(l).length) + " " + gris("│"));
  }
  console.log(gris("└" + borde + "┘") + "\n");
}

module.exports = { log, exito, aviso, error, detalle, titulo, recuadro, gris, verde, amarillo, rojo, cyan, negrita };
