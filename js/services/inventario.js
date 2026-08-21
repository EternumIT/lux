/*
 * CAPA DE NEGOCIO — reglas del inventario.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.inventario = (function () {
  var datos = Eternum.repositorios.inventario;

  var ESTADOS_EQUIPO = {
    operativo: "Operativo",
    reparacion: "En reparación",
    baja: "De baja"
  };

  /** Un equipo "con problemas" es todo lo que no está operativo. */
  function tieneProblema(equipo) {
    return equipo.estado !== "operativo";
  }

  function contarConProblemas(equipos) {
    return equipos.filter(tieneProblema).length;
  }

  /**
   * Filtra equipos por texto, ubicación y estado.
   * La búsqueda mira el código, la serie, la marca, el modelo y el tipo: son
   * las cinco formas en que alguien nombra un equipo que tiene delante.
   */
  function filtrarEquipos(equipos, filtros) {
    var texto = (filtros.texto || "").toLowerCase().trim();
    var ubicacion = filtros.ubicacion || "";
    var estado = filtros.estado || "";

    return equipos.filter(function (eq) {
      var coincideTexto = !texto ||
        (eq.codigo + " " + eq.serie + " " + eq.marca + " " + eq.modelo + " " + eq.tipo)
          .toLowerCase().indexOf(texto) !== -1;

      return coincideTexto &&
        (!ubicacion || eq.ubicacion === ubicacion) &&
        (!estado || eq.estado === estado);
    });
  }

  function filtrarComponentes(componentes, filtros) {
    var texto = (filtros.texto || "").toLowerCase().trim();

    return componentes.filter(function (co) {
      return !texto ||
        (co.codigo + " " + co.nombre + " " + co.modelo + " " + co.fabricante + " " + (co.serie || ""))
          .toLowerCase().indexOf(texto) !== -1;
    });
  }

  return {
    ESTADOS_EQUIPO: ESTADOS_EQUIPO,
    tieneProblema: tieneProblema,
    contarConProblemas: contarConProblemas,
    filtrarEquipos: filtrarEquipos,
    filtrarComponentes: filtrarComponentes,
    equipos: function (filtros) { return datos.equipos(filtros); },
    componentes: function (filtros) { return datos.componentes(filtros); },
    crearEquipo: function (datosEquipo) { return datos.crearEquipo(datosEquipo); },
    crearComponente: function (datosComponente) { return datos.crearComponente(datosComponente); }
  };
})();
