/*
 * CAPA DE NEGOCIO — reglas de los préstamos.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.prestamos = (function () {
  var datos = Eternum.repositorios.prestamos;

  var ESTADOS = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    activo: "Activo",
    vencido: "Vencido",
    devuelto: "Devuelto"
  };

  /** Un préstamo se puede devolver mientras el equipo siga afuera. */
  function sePuedeDevolver(prestamo) {
    return prestamo.estado === "activo" || prestamo.estado === "vencido";
  }

  function filtrar(prestamos, filtros) {
    var estado = filtros.estado || "";

    return prestamos.filter(function (p) {
      return !estado || p.estado === estado;
    });
  }

  /**
   * Números de la cabecera de la pantalla.
   * La tasa de devolución mide cuántos volvieron sobre el total: es la forma
   * corta de responder "¿se devuelven los equipos que se prestan?".
   */
  function metricas(prestamos) {
    var devueltos = prestamos.filter(function (p) { return p.estado === "devuelto"; }).length;

    return {
      activos: prestamos.filter(function (p) { return p.estado === "activo"; }).length,
      vencidos: prestamos.filter(function (p) { return p.estado === "vencido"; }).length,
      tasa: (prestamos.length ? Math.round((devueltos / prestamos.length) * 100) : 0) + "%"
    };
  }

  return {
    ESTADOS: ESTADOS,
    sePuedeDevolver: sePuedeDevolver,
    filtrar: filtrar,
    metricas: metricas,
    listar: function () { return datos.listar(); },
    crear: function (datosPrestamo) { return datos.crear(datosPrestamo); },
    marcarDevuelto: function (id) { return datos.marcarDevuelto(id); }
  };
})();
