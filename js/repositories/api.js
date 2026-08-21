/*
 * CAPA DE DATOS — el cliente de la API.
 *
 * Es lo único del navegador que sabe que del otro lado hay HTTP: arma la URL,
 * manda la petición, interpreta la respuesta y traduce los errores. Los
 * repositorios de esta misma carpeta lo usan para exponer funciones con
 * nombre de dominio ("listar tickets") en lugar de rutas.
 *
 * Nada de acá decide reglas: eso es de js/services/.
 */
window.Eternum = window.Eternum || {};
Eternum.repositorios = Eternum.repositorios || {};

Eternum.repositorios.api = (function () {
  var utils = Eternum.utils;

  /* true  = datos de ejemplo en localStorage (sin servidor)
     false = API real (PHP + MariaDB) */
  var USA_EJEMPLOS = false;

  var CLAVE_SESION = "eternum:session";

  /**
   * URL base de la API.
   *
   * Es absoluta porque las páginas se sirven con direcciones limpias
   * (/tickets, /inventario) y ya no cuelgan de /pages/<modulo>/: no hay una
   * profundidad fija desde la que subir. Eso da por sentado que el sistema
   * se sirve desde la raíz del dominio, que es lo que hace "npm run main".
   */
  var BASE = "/api";

  /**
   * La sesión venció (o nunca hubo): el servidor contestó 401.
   *
   * Se borra la sesión guardada en el navegador y se vuelve al login con un
   * aviso. Sin esto la pantalla se queda con la identidad vieja pintada —
   * nombre, rol y menú de quien entró la vez anterior— y los listados
   * colgados en "Cargando...", porque la respuesta nunca llega.
   *
   * Vive acá a propósito: esta es la única función que ve todas las respuestas
   * de la API, así que alcanza con resolverlo una vez en lugar de repetir el
   * mismo control en cada pantalla.
   */
  var redirigiendoAlLogin = false;

  function sesionExpirada() {
    utils.storageRemove(CLAVE_SESION);

    // En el propio login no hay a dónde ir: ahí el 401 es "contraseña
    // incorrecta" y lo muestra el formulario.
    if (document.body.getAttribute("data-page") === "login") return;
    if (redirigiendoAlLogin) return;
    redirigiendoAlLogin = true;

    utils.storageSet("eternum:flash", {
      type: "aviso",
      message: "Tu sesión venció. Volvé a iniciar sesión para continuar."
    });

    window.location.replace("/login/");
  }

  /**
   * Hace una petición y devuelve el JSON ya decodificado.
   * Usa la forma ?_ruta=... para no depender de mod_rewrite: funciona igual
   * con o sin el .htaccess activo.
   */
  function pedir(ruta, opciones) {
    opciones = opciones || {};

    // La ruta puede traer su propia cadena de consulta ("/auditoria?desde=...").
    // Se separan: la ruta se codifica y los filtros se pegan aparte.
    var partes = ruta.replace(/^\//, "").split("?");
    var url = BASE + "/index.php?_ruta=" + encodeURIComponent(partes[0]) +
      (partes[1] ? "&" + partes[1] : "");

    return fetch(url, {
      method: opciones.method || "GET",
      headers: { "Content-Type": "application/json" },
      // La sesión viaja en una cookie, así que hay que mandarla en cada llamada:
      // es lo que permite que el servidor sepa quién sos y controle los permisos.
      credentials: "same-origin",
      body: opciones.body ? JSON.stringify(opciones.body) : undefined
    }).then(function (res) {
      if (res.status === 204) return null;

      return res.text().then(function (texto) {
        var datos;
        try {
          datos = texto ? JSON.parse(texto) : null;
        } catch (e) {
          // Respuesta que no es JSON: casi siempre un error de PHP o de Apache.
          throw new Error(
            "El servidor no devolvió JSON. Verificá que estés abriendo el sistema " +
            "por http://localhost:8080 (con \"npm run main\") y no como archivo local."
          );
        }

        if (!res.ok) {
          if (res.status === 401) sesionExpirada();

          var error = new Error((datos && datos.error) || "Error del servidor (" + res.status + ").");
          error.status = res.status;
          throw error;
        }

        return datos;
      });
    });
  }

  /** Atajos por verbo, para que los repositorios se lean como lo que hacen. */
  function obtener(ruta) {
    return pedir(ruta);
  }

  function crear(ruta, cuerpo) {
    return pedir(ruta, { method: "POST", body: cuerpo });
  }

  function modificar(ruta, cuerpo) {
    return pedir(ruta, { method: "PATCH", body: cuerpo });
  }

  /** Arma "?clave=valor&..." descartando lo vacío. */
  function consulta(filtros) {
    var partes = Object.keys(filtros || {}).filter(function (clave) {
      var valor = filtros[clave];
      return valor !== undefined && valor !== null && valor !== "";
    }).map(function (clave) {
      return encodeURIComponent(clave) + "=" + encodeURIComponent(filtros[clave]);
    });

    return partes.length ? "?" + partes.join("&") : "";
  }

  /** Funciones que necesitan sí o sí la API (no tienen equivalente de ejemplo). */
  function soloConApi(nombre) {
    return Promise.reject(new Error(
      "«" + nombre + "» necesita la API: poné USA_EJEMPLOS en false en js/repositories/api.js."
    ));
  }

  return {
    USA_EJEMPLOS: USA_EJEMPLOS,
    CLAVE_SESION: CLAVE_SESION,
    base: BASE,
    pedir: pedir,
    obtener: obtener,
    crear: crear,
    modificar: modificar,
    consulta: consulta,
    soloConApi: soloConApi
  };
})();
