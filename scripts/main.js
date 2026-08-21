/*
 * Punto de entrada de "npm run main".
 *
 * Deja todo el sistema andando con un solo comando:
 *   1. Compila los estilos de Tailwind.
 *   2. Levanta la base de datos del proyecto (MariaDB sobre database/datos).
 *   3. Crea la base e importa el schema si es la primera vez.
 *   4. Arranca el servidor web y abre el navegador.
 *
 * Con Ctrl+C se cierra todo de forma ordenada.
 *
 * Opciones desde la linea de comandos (pisan la configuracion):
 *   npm run main -- --puerto=8090
 *   npm run main -- --sin-navegador
 */
const { cargar, conexion } = require("./lib/config");
const { preparar } = require("./lib/basedatos");
const { iniciarWeb, compilarEstilos, abrirNavegador } = require("./lib/web");
const { log, exito, error, aviso, titulo, recuadro, gris, verde, negrita } = require("./lib/consola");

/** Traduce los argumentos de consola a sobreescrituras de configuracion. */
function leerArgumentos(argv) {
  const cfg = {};
  for (const arg of argv) {
    let m;
    if ((m = arg.match(/^--puerto=(\d+)$/))) {
      cfg.servidor = Object.assign({}, cfg.servidor, { puerto: Number(m[1]) });
    } else if (arg === "--sin-navegador") {
      cfg.servidor = Object.assign({}, cfg.servidor, { abrirNavegador: false });
    } else if (arg === "--ayuda" || arg === "-h" || arg === "--help") {
      cfg.ayuda = true;
    } else {
      throw new Error(
        'Opcion desconocida: "' + arg + '".\n' +
        "  Validas: --puerto=NNNN  --sin-navegador  --ayuda"
      );
    }
  }
  return cfg;
}

function mostrarAyuda() {
  console.log(`
${negrita("npm run main")} — levanta la base de datos y el sistema web

  Opciones (van despues de --):
    --puerto=8090      puerto del servidor web
    --sin-navegador    no abre el navegador al terminar
    --ayuda            muestra esta ayuda

  La configuracion permanente vive en ${negrita("eternum.config.json")}.
  Para ajustes personales, copiala a ${negrita("eternum.config.local.json")}
  (ese archivo no se sube al repositorio).
`);
}

async function main() {
  const sobreescrituras = leerArgumentos(process.argv.slice(2));
  if (sobreescrituras.ayuda) {
    mostrarAyuda();
    return;
  }
  delete sobreescrituras.ayuda;

  const cfg = cargar(sobreescrituras);
  const conn = conexion(cfg);

  titulo("SGRSI / Eternum");
  console.log(
    gris("  base: ") + negrita("MariaDB del proyecto") +
    gris("  (" + cfg.mariadb.carpetaDatos + ")") +
    (cfg.usaLocal ? gris("   [con eternum.config.local.json]") : "")
  );
  console.log("");

  // Estos se van completando para poder cerrarlos aunque falle un paso posterior.
  let bd = null;
  let web = null;
  let cerrando = false;

  const cerrarTodo = async (codigo) => {
    if (cerrando) return;
    cerrando = true;
    console.log("");
    log("Cerrando ...");
    if (web) await web.detener();
    if (bd) await bd.detener();
    exito("listo");
    process.exit(codigo);
  };

  for (const senal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(senal, () => { cerrarTodo(0); });
  }
  // En Windows Ctrl+C no siempre llega como SIGINT si no hay TTY.
  if (process.platform === "win32" && process.stdin.isTTY) {
    require("readline")
      .createInterface({ input: process.stdin, output: process.stdout })
      .on("SIGINT", () => { cerrarTodo(0); });
  }

  try {
    compilarEstilos(cfg);
    bd = await preparar(cfg, conn);
    web = await iniciarWeb(cfg, conn);
  } catch (e) {
    console.log("");
    error(e.message);
    console.log("");
    if (web) await web.detener();
    if (bd) await bd.detener();
    process.exit(1);
  }

  const url = "http://" + cfg.servidor.host + ":" + cfg.servidor.puerto + "/";

  recuadro([
    negrita("Sistema listo"),
    "",
    "Sitio:   " + verde(url),
    "Base:    " + conn.host + ":" + conn.puerto + "  ·  " + conn.nombre,
    "Usuario: 12345678  ·  admin123",
    "",
    gris("Ctrl+C para detener todo")
  ]);

  if (cfg.servidor.abrirNavegador) abrirNavegador(url);

  // Si el servidor web se cae solo, no tiene sentido seguir con la base arriba.
  web.proceso.on("exit", () => {
    if (cerrando) return;
    aviso("el servidor web se detuvo");
    cerrarTodo(1);
  });
}

main().catch((e) => {
  console.log("");
  error(e.message);
  process.exit(1);
});
