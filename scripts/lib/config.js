/*
 * Carga de la configuracion de arranque.
 *
 * Se leen dos archivos y se fusionan:
 *   1. eternum.config.json        -> valores del grupo, versionado
 *   2. eternum.config.local.json  -> ajustes personales, NO versionado
 *
 * El segundo pisa al primero campo por campo, asi que cada uno puede cambiar
 * solo lo que necesite (por ejemplo, el puerto o el modo) sin tocar el archivo
 * compartido ni generar conflictos en git.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");

const POR_DEFECTO = {
  modo: "mariadb",
  servidor: { puerto: 8080, host: "127.0.0.1", abrirNavegador: true },
  baseDatos: { nombre: "eternum", importarSiFalta: true },
  mariadb: {
    rutaBin: "",
    carpetaDatos: "database/datos",
    puerto: 3307,
    usuario: "root",
    password: ""
  },
  xampp: {
    raiz: "C:/xampp",
    puerto: 3306,
    usuario: "root",
    password: "",
    iniciarServicios: false
  },
  php: { ruta: "" },
  tailwind: { compilarAlIniciar: true }
};

const MODOS = ["mariadb", "xampp"];

/** Fusion recursiva: lo que venga en `encima` pisa a `base`. */
function fusionar(base, encima) {
  const salida = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const [clave, valor] of Object.entries(encima || {})) {
    if (clave.startsWith("$")) continue; // los "$comentario" son documentacion
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      salida[clave] = fusionar(base[clave] || {}, valor);
    } else if (valor !== undefined) {
      salida[clave] = valor;
    }
  }
  return salida;
}

function leerJson(archivo) {
  if (!fs.existsSync(archivo)) return null;
  try {
    return JSON.parse(fs.readFileSync(archivo, "utf8"));
  } catch (e) {
    throw new Error(
      `El archivo ${path.basename(archivo)} tiene un error de sintaxis JSON:\n  ${e.message}`
    );
  }
}

function cargar(sobreescrituras = {}) {
  const compartida = leerJson(path.join(RAIZ, "eternum.config.json"));
  const local = leerJson(path.join(RAIZ, "eternum.config.local.json"));

  let cfg = fusionar(POR_DEFECTO, compartida || {});
  cfg = fusionar(cfg, local || {});
  cfg = fusionar(cfg, sobreescrituras);

  validar(cfg);

  cfg.raiz = RAIZ;
  cfg.usaLocal = !!local;
  return cfg;
}

function validar(cfg) {
  if (!MODOS.includes(cfg.modo)) {
    throw new Error(
      `modo "${cfg.modo}" no es valido. Usa uno de: ${MODOS.join(", ")}.`
    );
  }
  const puerto = Number(cfg.servidor.puerto);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error(`servidor.puerto debe ser un numero entre 1 y 65535 (recibido: ${cfg.servidor.puerto}).`);
  }
  const puertoBd = Number(cfg[cfg.modo].puerto);
  if (!Number.isInteger(puertoBd) || puertoBd < 1 || puertoBd > 65535) {
    throw new Error(`${cfg.modo}.puerto debe ser un numero entre 1 y 65535 (recibido: ${cfg[cfg.modo].puerto}).`);
  }
  if (!cfg.baseDatos.nombre || !/^[A-Za-z0-9_]+$/.test(cfg.baseDatos.nombre)) {
    throw new Error(`baseDatos.nombre debe tener solo letras, numeros o guion bajo (recibido: "${cfg.baseDatos.nombre}").`);
  }
}

/** Datos de conexion efectivos segun el modo elegido. */
function conexion(cfg) {
  const seccion = cfg[cfg.modo];
  return {
    host: "127.0.0.1",
    puerto: Number(seccion.puerto),
    usuario: seccion.usuario,
    password: seccion.password || "",
    nombre: cfg.baseDatos.nombre
  };
}

module.exports = { cargar, conexion, RAIZ, MODOS };
