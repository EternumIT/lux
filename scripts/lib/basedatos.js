/*
 * Arranque y preparacion de la base de datos.
 *
 * En modo "mariadb" el script levanta su propio servidor MariaDB sobre una
 * carpeta de datos dentro del proyecto (database/datos), asi cada integrante
 * tiene su instancia sin instalar XAMPP ni tocar servicios de Windows.
 *
 * En modo "xampp" no se administra nada: se asume que el panel de XAMPP ya
 * tiene MySQL corriendo y solo se comprueba la conexion.
 */
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { log, aviso, exito, detalle } = require("./consola");

const ES_WINDOWS = process.platform === "win32";
const EXE = ES_WINDOWS ? ".exe" : "";

/* ------------------------------------------------------------------ *
 * Localizacion de binarios
 * ------------------------------------------------------------------ */

/** Devuelve el primer nombre que exista dentro de una carpeta bin. */
function buscarEnCarpeta(carpeta, nombres) {
  if (!carpeta || !fs.existsSync(carpeta)) return null;
  for (const nombre of nombres) {
    const p = path.join(carpeta, nombre + EXE);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Busca un ejecutable en el PATH del sistema. */
function buscarEnPath(nombres) {
  for (const nombre of nombres) {
    const r = spawnSync(ES_WINDOWS ? "where" : "which", [nombre], { encoding: "utf8" });
    if (r.status === 0) {
      const primera = String(r.stdout).split(/\r?\n/).find((l) => l.trim());
      if (primera) return primera.trim();
    }
  }
  return null;
}

/** Carpetas donde suele quedar instalado MariaDB en Windows. */
function carpetasHabituales() {
  const candidatas = [];
  const bases = [
    process.env["ProgramFiles"],
    process.env["ProgramFiles(x86)"],
    "C:/",
    process.env["LOCALAPPDATA"] ? path.join(process.env["LOCALAPPDATA"], "Programs") : null
  ].filter(Boolean);

  for (const base of bases) {
    let entradas = [];
    try {
      entradas = fs.readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entradas) {
      if (e.isDirectory() && /^(mariadb|mysql)/i.test(e.name)) {
        candidatas.push(path.join(base, e.name, "bin"));
      }
    }
  }
  return candidatas;
}

/**
 * Resuelve la carpeta bin de MariaDB.
 * Prioridad: configuracion -> PATH -> instalaciones habituales.
 */
function resolverBinMariadb(cfg) {
  const explicita = cfg.mariadb.rutaBin;
  if (explicita) {
    const dir = path.isAbsolute(explicita) ? explicita : path.join(cfg.raiz, explicita);
    if (!buscarEnCarpeta(dir, ["mariadbd", "mysqld"])) {
      throw new Error(
        'En la configuracion pusiste mariadb.rutaBin = "' + explicita + '", pero ahi no hay\n' +
        "  un mariadbd" + EXE + " ni mysqld" + EXE + ". Revisa la ruta o dejala vacia para autodetectar."
      );
    }
    return dir;
  }

  const enPath = buscarEnPath(["mariadbd", "mysqld"]);
  if (enPath) return path.dirname(enPath);

  for (const dir of carpetasHabituales()) {
    if (buscarEnCarpeta(dir, ["mariadbd", "mysqld"])) return dir;
  }

  throw new Error(
    "No se encontro MariaDB en este equipo.\n\n" +
    "  Opciones:\n" +
    "    1. Instalar MariaDB:  https://mariadb.org/download/\n" +
    "       (o con winget:  winget install MariaDB.Server)\n" +
    "    2. Si ya lo tenes instalado en otra ruta, indicala en eternum.config.json:\n" +
    '         "mariadb": { "rutaBin": "C:/ruta/a/mariadb/bin" }\n' +
    "    3. Si preferis seguir con XAMPP, cambia el modo en eternum.config.json:\n" +
    '         "modo": "xampp"'
  );
}

/** Carpeta bin del MySQL que trae XAMPP. */
function resolverBinXampp(cfg) {
  const raiz = cfg.xampp.raiz;
  const dir = path.join(raiz, "mysql", "bin");
  if (!buscarEnCarpeta(dir, ["mysqld", "mariadbd"])) {
    throw new Error(
      'No se encontro XAMPP en "' + raiz + '".\n\n' +
      "  Opciones:\n" +
      "    1. Corregir la ruta en eternum.config.json:\n" +
      '         "xampp": { "raiz": "C:/ruta/a/xampp" }\n' +
      "    2. Usar MariaDB propio (no hace falta XAMPP):\n" +
      '         "modo": "mariadb"'
    );
  }
  return dir;
}

/** Cliente de linea de comandos, usado para crear la base e importar el schema. */
function resolverCliente(binDir) {
  const cliente = buscarEnCarpeta(binDir, ["mariadb", "mysql"]);
  if (!cliente) {
    throw new Error("No se encontro el cliente mariadb" + EXE + "/mysql" + EXE + " en " + binDir + ".");
  }
  return cliente;
}

/* ------------------------------------------------------------------ *
 * Conexion
 * ------------------------------------------------------------------ */

/** Comprueba si algo acepta conexiones TCP en ese puerto. */
function puertoAbierto(host, puerto, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const cerrar = (r) => { socket.destroy(); resolve(r); };
    socket.setTimeout(timeout);
    socket.once("connect", () => cerrar(true));
    socket.once("timeout", () => cerrar(false));
    socket.once("error", () => cerrar(false));
    socket.connect(puerto, host);
  });
}

/** Espera hasta que el servidor acepte conexiones o se agote el tiempo. */
async function esperarPuerto(host, puerto, segundos, abortar) {
  const limite = Date.now() + segundos * 1000;
  while (Date.now() < limite) {
    if (await puertoAbierto(host, puerto)) return true;
    if (abortar && abortar()) return false;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Ejecucion de SQL mediante el cliente
 * ------------------------------------------------------------------ */

function argsConexion(conn) {
  const args = [
    "--protocol=TCP",
    "--host=" + conn.host,
    "--port=" + conn.puerto,
    "--user=" + conn.usuario
  ];
  if (conn.password) args.push("--password=" + conn.password);
  return args;
}

/** Ejecuta una sentencia y devuelve su salida en texto. */
function sql(cliente, conn, sentencia, opciones = {}) {
  const args = argsConexion(conn).concat(["--batch", "--skip-column-names", "-e", sentencia]);
  const r = spawnSync(cliente, args, { encoding: "utf8" });
  if (r.status !== 0 && !opciones.tolerarError) {
    const msg = String(r.stderr || r.stdout || "").trim();
    throw new Error("Fallo la consulta a la base de datos:\n  " + msg);
  }
  return {
    ok: r.status === 0,
    salida: String(r.stdout || "").trim(),
    error: String(r.stderr || "").trim()
  };
}

/** Importa un archivo .sql completo redirigiendo su contenido al cliente. */
function importarArchivo(cliente, conn, archivo, usarBase = false) {
  const contenido = fs.readFileSync(archivo);
  const args = argsConexion(conn);
  // schema.sql trae su propio "USE eternum"; los demas necesitan que se les
  // indique sobre que base trabajar.
  if (usarBase) args.push("--database=" + conn.nombre);

  const r = spawnSync(cliente, args, { input: contenido });
  if (r.status !== 0) {
    throw new Error(
      "No se pudo importar " + path.basename(archivo) + ":\n  " + String(r.stderr || "").trim()
    );
  }
}

/* ------------------------------------------------------------------ *
 * Preparacion del esquema
 * ------------------------------------------------------------------ */

/**
 * Se asegura de que exista la base con sus tablas.
 * Si falta la tabla `usuarios`, importa database/schema.sql.
 */
function prepararEsquema(cfg, cliente, conn) {
  const schema = path.join(cfg.raiz, "database", "schema.sql");
  if (!fs.existsSync(schema)) {
    throw new Error("No se encontro " + schema + ".");
  }

  const existe = sql(
    cliente, conn,
    "SELECT COUNT(*) FROM information_schema.tables " +
    "WHERE table_schema = '" + conn.nombre + "' AND table_name = 'usuarios';"
  );

  if (existe.salida === "1") {
    detalle('base "' + conn.nombre + '" lista');
    return false;
  }

  if (!cfg.baseDatos.importarSiFalta) {
    throw new Error(
      'La base "' + conn.nombre + '" no tiene tablas y baseDatos.importarSiFalta esta en false.\n' +
      "  Importa database/schema.sql a mano o pone esa opcion en true."
    );
  }

  log("Importando database/schema.sql ...");
  importarArchivo(cliente, conn, schema);
  exito('base "' + conn.nombre + '" creada con datos de ejemplo');
  return true;
}

/**
 * Aplica database/actualizaciones.sql, que trae los cambios de esquema
 * posteriores a la creacion inicial. Todas sus sentencias son idempotentes,
 * asi que se puede correr en cada arranque sin miedo: es lo que permite que
 * una base ya existente reciba las novedades sin perder los datos.
 */
function aplicarActualizaciones(cfg, cliente, conn) {
  const archivo = path.join(cfg.raiz, "database", "actualizaciones.sql");
  if (!fs.existsSync(archivo)) return;

  importarArchivo(cliente, conn, archivo, true);
  detalle("actualizaciones de esquema aplicadas");
}

/* ------------------------------------------------------------------ *
 * Modo MariaDB: instancia propia del proyecto
 * ------------------------------------------------------------------ */

/** Inicializa la carpeta de datos la primera vez. */
function inicializarDatos(binDir, carpetaDatos) {
  const instalador = buscarEnCarpeta(binDir, ["mariadb-install-db", "mysql_install_db"]);
  if (!instalador) {
    throw new Error(
      "No se encontro mariadb-install-db" + EXE + " ni mysql_install_db" + EXE + " en " + binDir + ".\n" +
      "  Sin esa herramienta no se puede crear la carpeta de datos."
    );
  }

  log("Primera ejecucion: inicializando la carpeta de datos de MariaDB ...");
  detalle(carpetaDatos);

  fs.mkdirSync(carpetaDatos, { recursive: true });
  const r = spawnSync(instalador, ["--datadir=" + carpetaDatos], { encoding: "utf8" });

  if (r.status !== 0) {
    // Si quedo a medias, se limpia para poder reintentar desde cero.
    try { fs.rmSync(carpetaDatos, { recursive: true, force: true }); } catch {}
    throw new Error(
      "No se pudo inicializar la carpeta de datos de MariaDB:\n  " +
      String(r.stderr || r.stdout || "").trim()
    );
  }
  exito("carpeta de datos creada");
}

/** Levanta el servidor MariaDB del proyecto. Devuelve como detenerlo. */
async function iniciarMariadb(cfg, conn) {
  const binDir = resolverBinMariadb(cfg);
  const servidor = buscarEnCarpeta(binDir, ["mariadbd", "mysqld"]);
  const cliente = resolverCliente(binDir);
  detalle("MariaDB: " + binDir);

  if (await puertoAbierto(conn.host, conn.puerto)) {
    aviso("ya hay algo escuchando en el puerto " + conn.puerto + "; se reutiliza esa instancia");
    return { cliente, detener: async () => {} };
  }

  const carpetaDatos = path.isAbsolute(cfg.mariadb.carpetaDatos)
    ? cfg.mariadb.carpetaDatos
    : path.join(cfg.raiz, cfg.mariadb.carpetaDatos);

  if (!fs.existsSync(path.join(carpetaDatos, "mysql"))) {
    inicializarDatos(binDir, carpetaDatos);
  }

  log("Levantando MariaDB en el puerto " + conn.puerto + " ...");

  const proceso = spawn(servidor, [
    "--datadir=" + carpetaDatos,
    "--port=" + conn.puerto,
    "--bind-address=127.0.0.1",
    "--console",
    "--skip-name-resolve"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let murio = false;
  let registro = "";
  const recolectar = (b) => {
    registro += b.toString();
    if (registro.length > 4000) registro = registro.slice(-4000);
  };
  proceso.stdout.on("data", recolectar);
  proceso.stderr.on("data", recolectar);
  proceso.on("exit", () => { murio = true; });

  const listo = await esperarPuerto(conn.host, conn.puerto, 45, () => murio);
  if (!listo) {
    const ultimas = registro.trim()
      ? "\n  Ultimas lineas del servidor:\n" +
        registro.trim().split(/\r?\n/).slice(-12).map((l) => "    " + l).join("\n")
      : "";
    throw new Error("MariaDB no llego a levantar." + ultimas);
  }
  exito("MariaDB escuchando en 127.0.0.1:" + conn.puerto);

  const detener = async () => {
    if (murio) return;
    const admin = buscarEnCarpeta(binDir, ["mariadb-admin", "mysqladmin"]);
    if (admin) {
      spawnSync(admin, argsConexion(conn).concat(["shutdown"]), { encoding: "utf8", timeout: 10000 });
    }
    if (!murio) proceso.kill();
  };

  return { cliente, detener };
}

/* ------------------------------------------------------------------ *
 * Modo XAMPP: solo se comprueba, no se administra
 * ------------------------------------------------------------------ */

async function usarXampp(cfg, conn) {
  const binDir = resolverBinXampp(cfg);
  const cliente = resolverCliente(binDir);
  detalle("XAMPP: " + cfg.xampp.raiz);

  if (!(await puertoAbierto(conn.host, conn.puerto))) {
    if (cfg.xampp.iniciarServicios) {
      const bat = path.join(cfg.xampp.raiz, "mysql_start.bat");
      if (!fs.existsSync(bat)) {
        throw new Error("Se pidio iniciar XAMPP pero no existe " + bat + ".");
      }
      log("Iniciando el MySQL de XAMPP ...");
      spawn("cmd.exe", ["/c", "start", "", "/min", bat], { detached: true, stdio: "ignore" }).unref();

      if (!(await esperarPuerto(conn.host, conn.puerto, 40))) {
        throw new Error("El MySQL de XAMPP no llego a levantar. Proba iniciarlo desde el panel.");
      }
    } else {
      throw new Error(
        "No hay nada escuchando en el puerto " + conn.puerto + ": el MySQL de XAMPP parece apagado.\n\n" +
        "  Opciones:\n" +
        "    1. Abrir el Panel de Control de XAMPP y darle Start a MySQL.\n" +
        "    2. Que el comando lo inicie solo, en eternum.config.json:\n" +
        '         "xampp": { "iniciarServicios": true }\n' +
        "    3. Usar MariaDB propio, sin XAMPP:\n" +
        '         "modo": "mariadb"'
      );
    }
  }

  exito("MySQL de XAMPP disponible en 127.0.0.1:" + conn.puerto);
  // No se apaga al salir: XAMPP lo administra la persona que lo abrio.
  return { cliente, detener: async () => {} };
}

/* ------------------------------------------------------------------ */

/** Deja la base lista para usar y devuelve como detenerla. */
async function preparar(cfg, conn) {
  const bd = cfg.modo === "xampp" ? await usarXampp(cfg, conn) : await iniciarMariadb(cfg, conn);

  try {
    sql(bd.cliente, conn,
      "CREATE DATABASE IF NOT EXISTS `" + conn.nombre + "` " +
      "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    prepararEsquema(cfg, bd.cliente, conn);
    aplicarActualizaciones(cfg, bd.cliente, conn);
  } catch (e) {
    await bd.detener();
    throw e;
  }

  return bd;
}

module.exports = {
  preparar,
  puertoAbierto,
  esperarPuerto,
  // Se exportan para que "npm run doctor" use exactamente la misma logica de
  // busqueda que el lanzador y no puedan dar respuestas distintas.
  resolverBinMariadb,
  resolverBinXampp,
  resolverCliente
};
