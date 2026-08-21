/*
 * "npm run doctor" — revisa el entorno y dice exactamente que falta.
 *
 * No arranca nada: solo comprueba y reporta. Sirve cuando "npm run main" falla
 * o cuando el sitio muestra el error de conexion a la base de datos.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/** Tablas que tiene el esquema completo. */
const TABLAS_ESPERADAS = 9;

const { cargar, conexion } = require("./lib/config");
const {
  puertoAbierto,
  resolverBinMariadb,
  resolverCliente
} = require("./lib/basedatos");
const { resolverPhp } = require("./lib/web");
const { titulo, exito, error, aviso, detalle, gris, negrita, verde, rojo } = require("./lib/consola");

let problemas = 0;

function ok(titulo, dato) {
  exito(titulo + (dato ? gris("  " + dato) : ""));
}

function mal(titulo, comoArreglar) {
  problemas++;
  error(titulo);
  for (const linea of comoArreglar) detalle(linea);
}

function revisarNode() {
  const version = Number(process.versions.node.split(".")[0]);
  if (version >= 18) {
    ok("Node.js " + process.versions.node);
  } else {
    mal("Node.js " + process.versions.node + " es muy viejo (hace falta 18 o mas)", [
      "winget install OpenJS.NodeJS"
    ]);
  }
}

function revisarPhp(cfg) {
  let php;
  try {
    php = resolverPhp(cfg);
  } catch (e) {
    mal("No se encontro PHP", [
      "winget install PHP.PHP",
      'o indicalo en eternum.config.json:  "php": { "ruta": "C:/php/php.exe" }'
    ]);
    return null;
  }

  const r = spawnSync(php, ["-v"], { encoding: "utf8" });
  const version = String(r.stdout || "").split(/\r?\n/)[0] || "";
  ok("PHP encontrado", php);
  if (version) detalle(version);

  // Sin el driver de MySQL para PDO la API no puede hablar con la base.
  const mods = spawnSync(php, ["-m"], { encoding: "utf8" });
  const lista = String(mods.stdout || "").toLowerCase();
  if (lista.includes("pdo_mysql")) {
    ok("extension pdo_mysql activa");
  } else {
    mal("PHP no tiene la extension pdo_mysql", [
      "Sin ella la API no puede conectarse a MariaDB/MySQL.",
      "Abri tu php.ini y descomenta la linea:   extension=pdo_mysql",
      "(el php.ini en uso aparece en la salida de:  php --ini)"
    ]);
  }
  return php;
}

function revisarMariadb(cfg) {
  let binDir;
  try {
    binDir = resolverBinMariadb(cfg);
  } catch (e) {
    // El propio resolver ya explica las alternativas.
    mal(e.message.split("\n")[0], e.message.split("\n").slice(1).filter((l) => l.trim()));
    return;
  }
  ok("MariaDB encontrado", binDir);

  const carpetaDatos = path.isAbsolute(cfg.mariadb.carpetaDatos)
    ? cfg.mariadb.carpetaDatos
    : path.join(cfg.raiz, cfg.mariadb.carpetaDatos);

  if (fs.existsSync(path.join(carpetaDatos, "mysql"))) {
    ok("carpeta de datos inicializada", carpetaDatos);
  } else {
    aviso("la carpeta de datos todavia no existe; se creara en el primer 'npm run main'");
    detalle(carpetaDatos);
  }
}

async function revisarPuertos(cfg, conn) {
  const web = await puertoAbierto(cfg.servidor.host, cfg.servidor.puerto);
  if (web) {
    aviso("el puerto web " + cfg.servidor.puerto + " esta ocupado");
    detalle("Si no es tu propio 'npm run main', cambia servidor.puerto o cerra ese programa.");
  } else {
    ok("puerto web " + cfg.servidor.puerto + " libre");
  }

  const bd = await puertoAbierto(conn.host, conn.puerto);
  if (bd) {
    ok("hay una base escuchando en " + conn.host + ":" + conn.puerto);
  } else {
    detalle("todavia no hay base en " + conn.host + ":" + conn.puerto + " (la levanta 'npm run main')");
  }
  return bd;
}

/** Si la base esta arriba, comprueba credenciales y que el schema este importado. */
function revisarConexion(cfg, conn) {
  let cliente;
  try {
    const binDir = resolverBinMariadb(cfg);
    cliente = resolverCliente(binDir);
  } catch {
    aviso("no se encontro el cliente mariadb/mysql; no se pudo probar la conexion");
    return;
  }

  const args = [
    "--protocol=TCP",
    "--host=" + conn.host,
    "--port=" + conn.puerto,
    "--user=" + conn.usuario
  ];
  if (conn.password) args.push("--password=" + conn.password);

  const prueba = spawnSync(cliente, args.concat(["--batch", "--skip-column-names", "-e", "SELECT 1;"]), { encoding: "utf8" });
  if (prueba.status !== 0) {
    mal("la base rechaza la conexion", [
      String(prueba.stderr || "").trim().split(/\r?\n/)[0] || "sin detalle",
      "",
      "Revisa usuario y contrasena en eternum.config.json, seccion \"mariadb\"."
    ]);
    return;
  }
  ok("conexion aceptada como usuario \"" + conn.usuario + "\"");

  const tablas = spawnSync(cliente, args.concat([
    "--batch", "--skip-column-names", "-e",
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '" + conn.nombre + "';"
  ]), { encoding: "utf8" });

  const cantidad = Number(String(tablas.stdout || "0").trim()) || 0;
  if (cantidad >= TABLAS_ESPERADAS) {
    ok('base "' + conn.nombre + '" con ' + cantidad + " tablas");
  } else if (cantidad === 0) {
    aviso('la base "' + conn.nombre + '" esta vacia; "npm run main" importara database/schema.sql');
  } else {
    mal('la base "' + conn.nombre + '" tiene solo ' + cantidad + " tablas (deberian ser " + TABLAS_ESPERADAS + ")", [
      "Quedo a medio importar. Para rehacerla desde cero:",
      "  detene npm run main, borra database/datos/ y volve a arrancar"
    ]);
  }
}

function revisarEstilos(cfg) {
  const appCss = path.join(cfg.raiz, "assets", "css", "app.css");
  if (fs.existsSync(appCss)) {
    ok("estilos compilados", (fs.statSync(appCss).size / 1024).toFixed(0) + " KB");
  } else {
    mal("falta assets/css/app.css", ["Ejecuta:  npm run css"]);
  }

  if (!fs.existsSync(path.join(cfg.raiz, "node_modules"))) {
    aviso("no hay node_modules; ejecuta 'npm install' si vas a editar los estilos");
  }
}

async function main() {
  let cfg;
  try {
    cfg = cargar();
  } catch (e) {
    titulo("Diagnostico del entorno");
    error("La configuracion tiene un problema:");
    detalle(e.message);
    process.exit(1);
  }

  const conn = conexion(cfg);

  titulo("Diagnostico del entorno");
  console.log(gris("  base: ") + negrita("MariaDB del proyecto") + (cfg.usaLocal ? gris("   [con eternum.config.local.json]") : ""));
  console.log("");

  revisarNode();
  revisarPhp(cfg);
  revisarMariadb(cfg);
  revisarEstilos(cfg);
  console.log("");

  const bdArriba = await revisarPuertos(cfg, conn);
  if (bdArriba) revisarConexion(cfg, conn);

  console.log("");
  if (problemas === 0) {
    console.log(verde("Todo en orden.") + gris("  Arranca con:  npm run main"));
  } else {
    console.log(rojo(problemas + (problemas === 1 ? " problema encontrado." : " problemas encontrados.")) +
      gris("  Corregilos y volve a ejecutar:  npm run doctor"));
  }
  console.log("");
  process.exit(problemas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log("");
  error(e.message);
  process.exit(1);
});
