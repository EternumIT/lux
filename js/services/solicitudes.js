/*
 * CAPA DE NEGOCIO — reglas de las solicitudes de servicio.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.solicitudes = (function () {
  var datos = Eternum.repositorios.solicitudes;
  var sesion = Eternum.services.sesion;

  var ESTADOS = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    en_progreso: "En progreso",
    completado: "Completado",
    rechazado: "Rechazado"
  };

  /**
   * El camino normal de una solicitud.
   * "Rechazado" queda fuera a propósito: es una salida, no un paso, así que
   * se elige a mano y nunca se propone como "siguiente".
   */
  var ORDEN = ["pendiente", "aprobado", "en_progreso", "completado"];

  /** Estados en los que ya no hay nada más que hacer. */
  var CERRADOS = ["completado", "rechazado"];

  var NOTA_MINIMA = 5;

  function siguienteEstado(estado) {
    var indice = ORDEN.indexOf(estado);
    if (indice === -1) return estado;

    return ORDEN[Math.min(indice + 1, ORDEN.length - 1)];
  }

  function estaCerrada(solicitud) {
    return CERRADOS.indexOf(solicitud.estado) !== -1;
  }

  function puedeAvanzar(usuario, solicitud) {
    return sesion.esPersonal(usuario) && !estaCerrada(solicitud);
  }

  function puedeGestionar(usuario) {
    return sesion.esPersonal(usuario);
  }

  function filtrar(solicitudes, filtros) {
    var estado = filtros.estado || "";

    return solicitudes.filter(function (s) {
      return !estado || s.estado === estado;
    });
  }

  function notaValida(nota) {
    return String(nota || "").trim().length >= NOTA_MINIMA;
  }

  return {
    ESTADOS: ESTADOS,
    ORDEN: ORDEN,
    NOTA_MINIMA: NOTA_MINIMA,
    siguienteEstado: siguienteEstado,
    estaCerrada: estaCerrada,
    puedeAvanzar: puedeAvanzar,
    puedeGestionar: puedeGestionar,
    filtrar: filtrar,
    notaValida: notaValida,
    listar: function () { return datos.listar(); },
    detalle: function (id) { return datos.porId(id); },
    crear: function (datosSolicitud) { return datos.crear(datosSolicitud); },
    avanzar: function (id, estado, nota) { return datos.cambiarEstado(id, estado, nota); }
  };
})();
