/*
 * Pantalla de error.
 *
 * Se llega acá desde /error/?error=404, que redirige el servidor.
 *
 * Los mensajes son cortos y no cuentan de más: no dicen qué dirección se
 * pidió, ni qué parte del sistema falló, ni qué habría que revisar. Una
 * pantalla de error la ve cualquiera, y describir el problema con detalle es
 * describirle a un desconocido cómo está armado el sistema.
 *
 * No usa la capa de servicios ni la de datos a propósito: esta pantalla tiene
 * que poder dibujarse aunque la API esté caída, que es justo cuando se la
 * necesita.
 */
(function () {
  var utils = Eternum.utils;

  var ERRORES = {
    400: {
      titulo: "Solicitud incorrecta",
      mensaje: "La solicitud no pudo procesarse."
    },
    401: {
      titulo: "Sesión no iniciada",
      mensaje: "Es necesario iniciar sesión para continuar.",
      accion: { texto: "Ir al inicio de sesión", destino: "/login/" }
    },
    403: {
      titulo: "Acceso restringido",
      mensaje: "No dispone de permisos para acceder a esta sección."
    },
    404: {
      titulo: "Página no encontrada",
      mensaje: "La página solicitada no existe."
    },
    500: {
      titulo: "Error del servidor",
      mensaje: "Se produjo un error al procesar la solicitud."
    },
    503: {
      titulo: "Servicio no disponible",
      mensaje: "El sistema no se encuentra disponible en este momento."
    }
  };

  var POR_DEFECTO = {
    titulo: "Error",
    mensaje: "Se produjo un error."
  };

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);
    var pedido = (params.get("error") || "").trim();
    var codigo = /^\d{3}$/.test(pedido) ? pedido : "";
    var datos = ERRORES[codigo] || POR_DEFECTO;

    var elCodigo = utils.qs("#codigo");
    if (elCodigo) elCodigo.textContent = codigo || "—";

    var elTitulo = utils.qs("#titulo");
    if (elTitulo) elTitulo.textContent = datos.titulo;
    document.title = "SGRSI — " + datos.titulo;

    var elMensaje = utils.qs("#mensaje");
    if (elMensaje) elMensaje.textContent = datos.mensaje;

    // Sin sesión, el inicio tampoco se puede ver: ahí el destino útil es el login.
    var accion = utils.qs("#accion");
    if (accion && datos.accion) {
      accion.textContent = datos.accion.texto;
      accion.setAttribute("href", datos.accion.destino);
    }
  });
})();
