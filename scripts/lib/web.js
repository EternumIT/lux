/*
 * Servidor web de desarrollo (servidor embebido de PHP) y compilacion de estilos.
 *
 * Los datos de conexion a la base se le pasan al proceso de PHP como variables
 * de entorno. api/config.php ya las lee, asi que no hace falta tocar ningun
 */
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { log, exito, aviso, detalle } = require("./consola");
const { puertoAbierto, esperarPuerto } = require("./basedatos");

const ES_WINDOWS = process.platform === "win32";
const EXE = ES_WINDOWS ? ".exe" : "";

/** Localiza el interprete de PHP: primero la configuracion, despues el PATH. */
function resolverPhp(cfg) {
  const explicita = cfg.php.ruta;
  if (explicita) {
    const p = path.isAbsolute(explicita) ? explicita : path.join(cfg.raiz, explicita);
    if (!fs.existsSync(p)) {
      throw new Error(
        'En la configuracion pusiste php.ruta = "' + explicita + '", pero ese archivo no existe.'
      );
    }
    return p;
  }

  const r = spawnSync(ES_WINDOWS ? "where" : "which", ["php"], { encoding: "utf8" });
  if (r.status === 0) {
    const primera = String(r.stdout).split(/\r?\n/).find((l) => l.trim());
    if (primera) return primera.trim();
  }


  throw new Error(
    "No se encontro PHP en este equipo.\n\n" +
    "  Opciones:\n" +
    "    1. Instalar PHP 8:  https://windows.php.net/download/\n" +
    "       (o con winget:  winget install PHP.PHP)\n" +
    "    2. Indicar la ruta en eternum.config.json:\n" +
    '         "php": { "ruta": "C:/php/php.exe" }'
  );
}

/**
 * Comprueba que PHP tenga el driver PDO de MySQL.
 *
 * Sin esta extension todo arranca sin quejarse (base y servidor incluidos) y el
 * fallo recien aparece en el navegador como un error de conexion, que despista
 * bastante. Por eso conviene detectarlo aca y decir como arreglarlo.
 */
function comprobarDriverMysql(php) {
  const r = spawnSync(php, ["-m"], { encoding: "utf8" });
  const modulos = String(r.stdout || "").toLowerCase();
  if (modulos.includes("pdo_mysql")) return;

  // Ubicacion del php.ini que hay que editar.
  const ini = spawnSync(php, ["--ini"], { encoding: "utf8" });
  const linea = String(ini.stdout || "")
    .split(/\r?\n/)
    .find((l) => /Loaded Configuration File/i.test(l)) || "";
  const ruta = linea.split(":").slice(1).join(":").trim();

  throw new Error(
    "PHP no tiene activada la extension pdo_mysql.\n\n" +
    "  Sin ella la API no puede conectarse a la base y el sitio muestra\n" +
    '  "No se pudo conectar con la base de datos".\n\n' +
    "  Como arreglarlo:\n" +
    (ruta && ruta !== "(none)"
      ? "    1. Abri este archivo:  " + ruta + "\n"
      : "    1. Abri tu php.ini (su ruta sale con:  php --ini)\n") +
    "    2. Busca la linea:     ;extension=pdo_mysql\n" +
    "    3. Quitale el ; del principio y guarda.\n" +
    "    4. Volve a ejecutar:   npm run main\n\n" +
    "  Para comprobarlo:  php -m | findstr pdo_mysql"
  );
}

/** Compila los estilos de Tailwind una vez, antes de arrancar. */
function compilarEstilos(cfg) {
  if (!cfg.tailwind.compilarAlIniciar) return;

  const salida = path.join(cfg.raiz, "assets", "css", "app.css");
  // Se invoca el entrypoint de Node en vez del .cmd para no depender del shell.
  const cli = path.join(cfg.raiz, "node_modules", "@tailwindcss", "cli", "dist", "index.mjs");

  if (!fs.existsSync(cli)) {
    if (fs.existsSync(salida)) {
      // Sin node_modules pero con el CSS ya compilado: se puede seguir igual.
      aviso("Tailwind no esta instalado (falta 'npm install'); se usa el app.css ya compilado");
      return;
    }
    throw new Error(
      "Falta compilar los estilos y Tailwind no esta instalado.\n" +
      "  Ejecuta primero:  npm install"
    );
  }

  log("Compilando estilos ...");
  const r = spawnSync(process.execPath, [
    cli,
    "-i", path.join(cfg.raiz, "assets", "css", "input.css"),
    "-o", salida,
    "--minify"
  ], { encoding: "utf8", cwd: cfg.raiz });

  if (r.status !== 0) {
    throw new Error("Fallo la compilacion de Tailwind:\n  " + String(r.stderr || r.stdout || "").trim());
  }
  exito("estilos compilados");
}

/** Arranca el servidor de PHP sirviendo la raiz del proyecto. */
async function iniciarWeb(cfg, conn) {
  const php = resolverPhp(cfg);
  detalle("PHP: " + php);
  comprobarDriverMysql(php);

  const { host, puerto } = cfg.servidor;

  if (await puertoAbierto(host, puerto)) {
    throw new Error(
      "El puerto " + puerto + " ya esta ocupado por otro programa.\n\n" +
      "  Opciones:\n" +
      "    1. Cerrar el programa que lo este usando.\n" +
      "    2. Cambiar el puerto en eternum.config.json:\n" +
      '         "servidor": { "puerto": 8090 }'
    );
  }

  log("Levantando el servidor web en el puerto " + puerto + " ...");

  // El enrutador sirve los archivos estaticos con Cache-Control: no-store, para
  // que el navegador no mezcle codigo viejo con nuevo mientras se trabaja.
  const router = path.join(__dirname, "..", "router.php");

  const proceso = spawn(php, ["-S", host + ":" + puerto, "-t", cfg.raiz, router], {
    cwd: cfg.raiz,
    stdio: ["ignore", "pipe", "pipe"],
    env: Object.assign({}, process.env, {
      ETERNUM_DB_DRIVER: "mysql",
      ETERNUM_DB_HOST: conn.host,
      ETERNUM_DB_PORT: String(conn.puerto),
      ETERNUM_DB_NAME: conn.nombre,
      ETERNUM_DB_USER: conn.usuario,
      ETERNUM_DB_PASS: conn.password,
      // Entorno de desarrollo: la API puede devolver el detalle de los errores.
      ETERNUM_DEBUG: "1"
    })
  });

  let murio = false;
  proceso.on("exit", () => { murio = true; });

  // El servidor embebido escribe una linea por cada peticion. Se descarta solo
  // ese ruido rutinario y se muestra TODO lo demas: errores de PHP y cualquier
  // cosa que el codigo mande con error_log(), que es donde queda el detalle real
  // de los fallos de conexion a la base.
  const RUIDO = [
    /\b(?:Accepted|Closing)\s*$/,   // apertura y cierre de cada conexion
    /\[(?:2\d\d|3\d\d)\]:/          // peticiones que salieron bien
  ];

  const filtrar = (buf) => {
    for (const cruda of buf.toString().split(/\r?\n/)) {
      const linea = cruda.trim();
      if (!linea) continue;
      if (RUIDO.some((r) => r.test(linea))) continue;
      // Se quita la marca de tiempo del servidor embebido, que no aporta nada.
      console.log("  " + linea.replace(/^\[[^\]]+\]\s*/, ""));
    }
  };
  proceso.stdout.on("data", filtrar);
  proceso.stderr.on("data", filtrar);

  if (!(await esperarPuerto(host, puerto, 20, () => murio))) {
    throw new Error("El servidor de PHP no llego a levantar.");
  }
  exito("servidor web escuchando en http://" + host + ":" + puerto);

  return { proceso, detener: async () => { if (!murio) proceso.kill(); } };
}

/** Abre la pagina en el navegador por defecto del sistema. */
function abrirNavegador(url) {
  try {
    if (ES_WINDOWS) {
      spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    // Si no se puede abrir, no es grave: la URL ya se muestra en pantalla.
  }
}

module.exports = { iniciarWeb, compilarEstilos, abrirNavegador, resolverPhp };
