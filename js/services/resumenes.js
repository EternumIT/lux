/*
 * CAPA DE NEGOCIO — los resúmenes del inicio y del panel, y el registro de
 * auditoría.
 *
 * Son lecturas: la regla que aportan es cómo se lee lo que llega (qué cuenta
 * como "abierto", cómo se redacta un contador, qué accesos ofrece el inicio
 * según el rol).
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.resumenes = (function () {
  var datos = Eternum.repositorios.resumenes;

  /**
   * Redacta un contador para los accesos rápidos del inicio.
   * Se escribe en palabras y no como "3/7" porque es lo primero que se lee al
   * entrar: tiene que entenderse sin interpretar.
   */
  function textoContador(contador, singular, plural) {
    if (!contador || !contador.total) return "Todavía no creaste ninguno";

    if (!contador.abiertos) {
      return "Sin " + plural + " en curso · " + contador.total + " en total";
    }

    return contador.abiertos + " " + (contador.abiertos === 1 ? singular : plural) +
      " en curso · " + contador.total + " en total";
  }

  /** Saludo según la hora, para el encabezado del inicio. */
  function saludo(fecha) {
    var hora = (fecha || new Date()).getHours();

    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";

    return "Buenas noches";
  }

  /** Cómo se describe una ubicación en el filtro del inicio. */
  function etiquetaUbicacion(ubicacion) {
    var aviso = ubicacion.conProblemas ? " · " + ubicacion.conProblemas + " con problemas" : "";

    return ubicacion.ubicacion + " (" + ubicacion.equipos + aviso + ")";
  }

  return {
    textoContador: textoContador,
    saludo: saludo,
    etiquetaUbicacion: etiquetaUbicacion,
    inicio: function () { return datos.inicio(); },
    panel: function () { return datos.panel(); }
  };
})();

Eternum.services.auditoria = (function () {
  var datos = Eternum.repositorios.auditoria;

  return {
    consultar: function (filtros) { return datos.listar(filtros); }
  };
})();

Eternum.services.permisos = (function () {
  var datos = Eternum.repositorios.permisos;

  return {
    matriz: function () { return datos.matriz(); }
  };
})();
