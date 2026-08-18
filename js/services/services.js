/*
 * Capa de servicios: único punto de contacto entre las vistas y los datos.
 *
 * Por defecto habla con la API PHP + MariaDB de la carpeta /api.
 * Si la API no está disponible (por ejemplo, abriendo los HTML con doble clic
 * en lugar de servirlos con XAMPP), se puede poner USE_MOCK en true para
 * trabajar con datos de ejemplo en localStorage.
 */
window.Eternum = window.Eternum || {};

Eternum.services = (function () {
  var utils = Eternum.utils;
  var mock = Eternum.mockData;

  /* true  = datos de ejemplo en localStorage (sin servidor)
     false = API real (XAMPP: Apache + PHP + MariaDB) */
  var USE_MOCK = false;

  var SESSION_KEY = "eternum:session";

  /**
   * Calcula la URL base de la API a partir de la ubicación de la página.
   * Las vistas viven en /pages/<modulo>/<vista>.html, así que se sube dos
   * niveles para llegar a la raíz del proyecto y de ahí a /api.
   */
  var API_BASE = (function () {
    var path = window.location.pathname;
    var marcador = "/pages/";
    var idx = path.indexOf(marcador);
    var raiz = idx !== -1 ? path.slice(0, idx) : path.replace(/\/[^/]*$/, "");
    return raiz + "/api";
  })();

  /**
   * Realiza una petición a la API y devuelve el JSON ya decodificado.
   * Usa la forma ?_ruta=... para no depender de mod_rewrite: funciona igual
   * con o sin el .htaccess activo.
   */
  function apiRequest(ruta, options) {
    options = options || {};
    var url = API_BASE + "/index.php?_ruta=" + encodeURIComponent(ruta.replace(/^\//, ""));

    return fetch(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (res) {
      if (res.status === 204) return null;

      return res.text().then(function (texto) {
        var data;
        try {
          data = texto ? JSON.parse(texto) : null;
        } catch (e) {
          // Respuesta que no es JSON: casi siempre un error de PHP o de Apache.
          throw new Error(
            "El servidor no devolvió JSON. Verificá que estés abriendo el sistema " +
            "a través de XAMPP (http://localhost/...) y no como archivo local."
          );
        }
        if (!res.ok) {
          throw new Error((data && data.error) || "Error del servidor (" + res.status + ").");
        }
        return data;
      });
    });
  }

  /* ---------------- AUTH ---------------- */
  var auth = {
    login: function (cedula, password) {
      if (USE_MOCK) {
        return utils.mockDelay(null, 350).then(function () {
          var usuario = mock.load("usuarios").find(function (u) {
            return u.cedula === String(cedula || "").trim();
          });
          if (!usuario || !password) {
            throw new Error("Cédula o contraseña incorrecta.");
          }
          utils.storageSet(SESSION_KEY, usuario);
          return usuario;
        });
      }

      return apiRequest("/auth/login", {
        method: "POST",
        body: { cedula: cedula, password: password }
      }).then(function (usuario) {
        utils.storageSet(SESSION_KEY, usuario);
        return usuario;
      });
    },
    logout: function () {
      utils.storageRemove(SESSION_KEY);
    },
    getSession: function () {
      return utils.storageGet(SESSION_KEY, null);
    }
  };

  /* ---------------- INVENTARIO ---------------- */
  var inventario = {
    getEquipos: function () {
      if (USE_MOCK) return utils.mockDelay(mock.load("equipos").slice());
      return apiRequest("/equipos");
    },
    getComponentes: function () {
      if (USE_MOCK) return utils.mockDelay(mock.load("componentes").slice());
      return apiRequest("/componentes");
    },
    createEquipo: function (data) {
      if (USE_MOCK) {
        var equipos = mock.load("equipos");
        var nuevo = Object.assign(
          { id: utils.uid("eq"), estado: "operativo", creado: new Date().toISOString().slice(0, 10) },
          data
        );
        equipos.push(nuevo);
        mock.save("equipos", equipos);
        return utils.mockDelay(nuevo);
      }
      return apiRequest("/equipos", { method: "POST", body: data });
    },
    createComponente: function (data) {
      if (USE_MOCK) {
        var componentes = mock.load("componentes");
        var nuevo = Object.assign(
          { id: utils.uid("co"), creado: new Date().toISOString().slice(0, 10) },
          data
        );
        componentes.push(nuevo);
        mock.save("componentes", componentes);
        return utils.mockDelay(nuevo);
      }
      return apiRequest("/componentes", { method: "POST", body: data });
    }
  };

  /* ---------------- TICKETS ---------------- */
  var tickets = {
    getTickets: function () {
      if (USE_MOCK) return utils.mockDelay(mock.load("tickets").slice());
      return apiRequest("/tickets");
    },
    createTicket: function (data) {
      if (USE_MOCK) {
        var lista = mock.load("tickets");
        var nuevo = Object.assign(
          { id: utils.uid("tk"), estado: "pendiente", creado: new Date().toISOString().slice(0, 10) },
          data
        );
        lista.unshift(nuevo);
        mock.save("tickets", lista);
        return utils.mockDelay(nuevo);
      }
      return apiRequest("/tickets", { method: "POST", body: data });
    },
    updateEstado: function (id, estado) {
      if (USE_MOCK) {
        var lista = mock.load("tickets");
        var item = lista.find(function (t) { return t.id === id; });
        if (item) item.estado = estado;
        mock.save("tickets", lista);
        return utils.mockDelay(item);
      }
      return apiRequest("/tickets/" + id, { method: "PATCH", body: { estado: estado } });
    }
  };

  /* ---------------- PRÉSTAMOS ---------------- */
  var prestamos = {
    getPrestamos: function () {
      if (USE_MOCK) return utils.mockDelay(mock.load("prestamos").slice());
      return apiRequest("/prestamos");
    },
    createPrestamo: function (data) {
      if (USE_MOCK) {
        var lista = mock.load("prestamos");
        var nuevo = Object.assign(
          { id: utils.uid("pr"), estado: "activo", fechaInicio: new Date().toISOString().slice(0, 10) },
          data
        );
        lista.unshift(nuevo);
        mock.save("prestamos", lista);
        return utils.mockDelay(nuevo);
      }
      return apiRequest("/prestamos", { method: "POST", body: data });
    },
    marcarDevuelto: function (id) {
      if (USE_MOCK) {
        var lista = mock.load("prestamos");
        var item = lista.find(function (p) { return p.id === id; });
        if (item) item.estado = "devuelto";
        mock.save("prestamos", lista);
        return utils.mockDelay(item);
      }
      return apiRequest("/prestamos/" + id, { method: "PATCH", body: { estado: "devuelto" } });
    }
  };

  /* ---------------- SOLICITUDES ---------------- */
  var solicitudes = {
    getSolicitudes: function () {
      if (USE_MOCK) return utils.mockDelay(mock.load("solicitudes").slice());
      return apiRequest("/solicitudes");
    },
    createSolicitud: function (data) {
      if (USE_MOCK) {
        var lista = mock.load("solicitudes");
        var nueva = Object.assign(
          { id: utils.uid("so"), estado: "pendiente", creado: new Date().toISOString().slice(0, 10) },
          data
        );
        lista.unshift(nueva);
        mock.save("solicitudes", lista);
        return utils.mockDelay(nueva);
      }
      return apiRequest("/solicitudes", { method: "POST", body: data });
    }
  };

  /* ---------------- DASHBOARD ---------------- */
  var dashboard = {
    getResumen: function () {
      if (!USE_MOCK) return apiRequest("/dashboard");

      // En modo mock el resumen se calcula en el navegador.
      return Promise.all([
        inventario.getEquipos(),
        tickets.getTickets(),
        prestamos.getPrestamos(),
        solicitudes.getSolicitudes()
      ]).then(function (res) {
        var equipos = res[0], ticketsData = res[1], prestamosData = res[2], solicitudesData = res[3];

        var porEstadoTickets = { pendiente: 0, en_progreso: 0, en_resolucion: 0, resuelto: 0 };
        ticketsData.forEach(function (t) {
          if (porEstadoTickets[t.estado] !== undefined) porEstadoTickets[t.estado]++;
        });

        var actividad = {};
        for (var i = 6; i >= 0; i--) {
          var d = new Date();
          d.setDate(d.getDate() - i);
          actividad[d.toISOString().slice(0, 10)] = 0;
        }
        ticketsData.concat(solicitudesData).forEach(function (item) {
          if (actividad[item.creado] !== undefined) actividad[item.creado]++;
        });

        var porUbicacion = { Laboratorios: 0, Salones: 0, "Administración": 0, Otros: 0 };
        var incidentesPorUbicacion = { Laboratorios: 0, Salones: 0, "Administración": 0, Otros: 0 };
        equipos.forEach(function (eq) {
          var cat = categoriaUbicacion(eq.ubicacion);
          porUbicacion[cat]++;
          if (eq.fallas) incidentesPorUbicacion[cat]++;
        });

        return {
          equiposTotales: equipos.length,
          ticketsAbiertos: ticketsData.filter(function (t) { return t.estado !== "resuelto"; }).length,
          prestamosActivos: prestamosData.filter(function (p) { return p.estado === "activo"; }).length,
          solicitudesPendientes: solicitudesData.filter(function (s) { return s.estado === "pendiente"; }).length,
          porEstadoTickets: porEstadoTickets,
          actividad: actividad,
          porUbicacion: porUbicacion,
          incidentesPorUbicacion: incidentesPorUbicacion
        };
      });
    }
  };

  function categoriaUbicacion(ubicacion) {
    if (/laboratorio/i.test(ubicacion)) return "Laboratorios";
    if (/sal[oó]n/i.test(ubicacion)) return "Salones";
    if (/administraci[oó]n/i.test(ubicacion)) return "Administración";
    return "Otros";
  }

  return {
    USE_MOCK: USE_MOCK,
    apiClient: { request: apiRequest, base: API_BASE },
    auth: auth,
    inventario: inventario,
    tickets: tickets,
    prestamos: prestamos,
    solicitudes: solicitudes,
    dashboard: dashboard
  };
})();
