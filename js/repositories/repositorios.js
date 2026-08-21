/*
 * CAPA DE DATOS — un repositorio por recurso.
 *
 * Cada uno expone las operaciones de ese recurso con nombres del dominio, y
 * es el único que conoce su ruta en la API. Si mañana cambia una dirección o
 * el formato de un parámetro, se toca acá y en ningún otro lado.
 *
 * No hay reglas en este archivo: no decide quién puede hacer qué ni qué
 * estado sigue a cuál. Eso vive en js/services/.
 */
window.Eternum = window.Eternum || {};
Eternum.repositorios = Eternum.repositorios || {};

(function () {
  var api = Eternum.repositorios.api;
  var utils = Eternum.utils;
  var ejemplos = Eternum.repositorios.ejemplos;

  /* ------------------------------- SESIÓN ------------------------------- */
  Eternum.repositorios.auth = {
    login: function (cedula, password) {
      if (api.USA_EJEMPLOS) {
        return utils.mockDelay(null, 350).then(function () {
          var usuario = ejemplos.load("usuarios").find(function (u) {
            return u.cedula === String(cedula || "").trim();
          });
          if (!usuario || !password) {
            throw new Error("Cédula o contraseña incorrecta.");
          }
          utils.storageSet(api.CLAVE_SESION, usuario);
          return usuario;
        });
      }

      return api.crear("/auth/login", { cedula: cedula, password: password })
        .then(function (usuario) {
          utils.storageSet(api.CLAVE_SESION, usuario);
          return usuario;
        });
    },

    logout: function () {
      utils.storageRemove(api.CLAVE_SESION);
      if (api.USA_EJEMPLOS) return Promise.resolve();

      // Aunque falle, la sesión local ya se borró: no tiene sentido frenar la salida.
      return api.crear("/auth/logout").catch(function () {});
    },

    /** Lectura rápida desde el navegador, para pintar sin esperar. */
    guardada: function () {
      return utils.storageGet(api.CLAVE_SESION, null);
    },

    /**
     * Le pregunta al servidor quién está autenticado.
     * Es la fuente de verdad: lo guardado en el navegador se puede editar a
     * mano, la sesión del servidor no.
     */
    verificar: function () {
      if (api.USA_EJEMPLOS) return Promise.resolve(utils.storageGet(api.CLAVE_SESION, null));

      return api.obtener("/auth/sesion")
        .then(function (usuario) {
          utils.storageSet(api.CLAVE_SESION, usuario);
          return usuario;
        })
        .catch(function () {
          utils.storageRemove(api.CLAVE_SESION);
          return null;
        });
    },

    cambiarPassword: function (actual, nueva) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Cambio de contraseña");

      return api.modificar("/auth/password", { actual: actual, nueva: nueva });
    }
  };

  /* ------------------------------ USUARIOS ------------------------------ */
  Eternum.repositorios.usuarios = {
    listar: function () {
      return api.obtener("/usuarios");
    },
    crear: function (datos) {
      return api.crear("/usuarios", datos);
    },
    actualizar: function (id, datos) {
      return api.modificar("/usuarios/" + id, datos);
    },
    cambiarBloqueo: function (id, bloqueado) {
      return api.modificar("/usuarios/" + id + "/bloqueo", { bloqueado: !!bloqueado });
    },
    /** Nombres para elegir a quién sumar a un ticket o una solicitud. */
    directorio: function () {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("usuarios").slice());
      return api.obtener("/directorio");
    }
  };

  /* ----------------------------- INVENTARIO ----------------------------- */
  Eternum.repositorios.inventario = {
    /**
     * Equipos. Acepta filtros que resuelve el servidor:
     * { buscar, ubicacion, estado }. "buscar" mira el código (L1-SN-88213),
     * la serie, la marca, el modelo y la ubicación.
     */
    equipos: function (filtros) {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("equipos").slice());
      return api.obtener("/equipos" + api.consulta(filtros));
    },

    componentes: function (filtros) {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("componentes").slice());
      return api.obtener("/componentes" + api.consulta(filtros));
    },

    crearEquipo: function (datos) {
      if (api.USA_EJEMPLOS) return guardarEjemplo("equipos", datos, "eq", { estado: "operativo" });
      return api.crear("/equipos", datos);
    },

    crearComponente: function (datos) {
      if (api.USA_EJEMPLOS) return guardarEjemplo("componentes", datos, "co", {});
      return api.crear("/componentes", datos);
    }
  };

  /* ------------------------------- TICKETS ------------------------------ */
  Eternum.repositorios.tickets = {
    listar: function () {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("tickets").slice());
      return api.obtener("/tickets");
    },
    porId: function (id) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Detalle del ticket");
      return api.obtener("/tickets/" + id);
    },
    crear: function (datos) {
      if (api.USA_EJEMPLOS) return guardarEjemplo("tickets", datos, "tk", { estado: "pendiente" }, true);
      return api.crear("/tickets", datos);
    },
    /**
     * Cambia el estado. La nota es obligatoria: es lo que queda escrito en la
     * línea de tiempo, así que el servidor rechaza el cambio sin ella.
     */
    cambiarEstado: function (id, estado, nota) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Avanzar el estado de un ticket");
      return api.modificar("/tickets/" + id, { estado: estado, nota: nota });
    }
  };

  /* ----------------------------- SOLICITUDES ---------------------------- */
  Eternum.repositorios.solicitudes = {
    listar: function () {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("solicitudes").slice());
      return api.obtener("/solicitudes");
    },
    porId: function (id) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Detalle de la solicitud");
      return api.obtener("/solicitudes/" + id);
    },
    crear: function (datos) {
      if (api.USA_EJEMPLOS) return guardarEjemplo("solicitudes", datos, "so", { estado: "pendiente" }, true);
      return api.crear("/solicitudes", datos);
    },
    cambiarEstado: function (id, estado, nota) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Cambiar el estado de una solicitud");
      return api.modificar("/solicitudes/" + id, { estado: estado, nota: nota });
    }
  };

  /* ------------------------------ PRÉSTAMOS ----------------------------- */
  Eternum.repositorios.prestamos = {
    listar: function () {
      if (api.USA_EJEMPLOS) return utils.mockDelay(ejemplos.load("prestamos").slice());
      return api.obtener("/prestamos");
    },
    crear: function (datos) {
      if (api.USA_EJEMPLOS) {
        return guardarEjemplo("prestamos", datos, "pr", {
          estado: "activo",
          fechaInicio: new Date().toISOString().slice(0, 10)
        }, true);
      }
      return api.crear("/prestamos", datos);
    },
    marcarDevuelto: function (id) {
      if (api.USA_EJEMPLOS) return api.soloConApi("Marcar una devolución");
      return api.modificar("/prestamos/" + id, {
        estado: "devuelto",
        nota: "Equipo devuelto y verificado."
      });
    }
  };

  /* ------------------------------ RESÚMENES ----------------------------- */
  Eternum.repositorios.resumenes = {
    /** Lo que necesita quien entra, según su rol. */
    inicio: function () {
      if (api.USA_EJEMPLOS) return api.soloConApi("Resumen de inicio");
      return api.obtener("/inicio");
    },
    /** Métricas de la pantalla "Estado de Equipos". */
    panel: function () {
      if (api.USA_EJEMPLOS) return api.soloConApi("Métricas del panel");
      return api.obtener("/dashboard");
    }
  };

  /* --------------------- AUDITORÍA Y MATRIZ DE PERMISOS ------------------ */
  Eternum.repositorios.auditoria = {
    /**
     * Registro filtrado. Los filtros van como cadena de consulta ya armada
     * ("desde=...&accion=..."); el filtrado ocurre en el servidor.
     */
    listar: function (filtros) {
      return api.obtener("/auditoria" + (filtros ? "?" + filtros : ""));
    }
  };

  Eternum.repositorios.permisos = {
    matriz: function () {
      return api.obtener("/permisos");
    }
  };

  /* ---------------------------------------------------------------------- */

  /** Alta en los datos de ejemplo, para el modo sin servidor. */
  function guardarEjemplo(coleccion, datos, prefijo, extra, alPrincipio) {
    var lista = ejemplos.load(coleccion);
    var nuevo = Object.assign(
      { id: utils.uid(prefijo), creado: new Date().toISOString().slice(0, 10) },
      extra,
      datos
    );

    if (alPrincipio) {
      lista.unshift(nuevo);
    } else {
      lista.push(nuevo);
    }

    ejemplos.save(coleccion, lista);

    return utils.mockDelay(nuevo);
  }
})();
