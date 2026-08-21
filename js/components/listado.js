/*
 * Listados con tope, desplazamiento propio y paginación.
 *
 * Todas las pantallas que muestran una lista (usuarios, tickets, solicitudes,
 * préstamos, inventario, auditoría, equipos del inicio) la dibujan con esto,
 * así se comportan igual en las tres cosas que antes cada una resolvía por su
 * cuenta, o no resolvía:
 *
 *   1. El contenido no se sale del recuadro: va dentro de un contenedor con
 *      altura máxima y su propia barra de desplazamiento.
 *   2. No se pintan mil filas de una: se muestra de a una cantidad, que se
 *      puede cambiar desde el pie.
 *   3. El pie dice siempre cuántos hay y cuántos se están viendo, que es la
 *      pregunta que aparece apenas la lista crece.
 *
 * Cada contenedor recuerda su página y su cantidad por página, así volver a
 * dibujar (por un filtro, por un alta) no reinicia lo que la persona eligió.
 */
window.Eternum = window.Eternum || {};

Eternum.components.listado = (function () {
  var utils = Eternum.utils;

  /** Opciones del selector de "cuántos por página". */
  var CANTIDADES = [10, 25, 50, 100];
  var POR_DEFECTO = 25;

  /** Estado de cada contenedor, guardado en el propio elemento. */
  function estado(contenedor) {
    if (!contenedor.__listado) {
      contenedor.__listado = { pagina: 1, porPagina: POR_DEFECTO };
    }
    return contenedor.__listado;
  }

  function pieHtml(info) {
    var desde = info.total === 0 ? 0 : info.inicio + 1;
    var hasta = Math.min(info.inicio + info.porPagina, info.total);

    var opciones = CANTIDADES.map(function (n) {
      return '<option value="' + n + '"' + (n === info.porPagina ? " selected" : "") + ">" + n + "</option>";
    }).join("");

    return (
      '<div class="paginacion">' +
        '<span>Mostrando <strong class="text-texto">' + desde + "–" + hasta +
          '</strong> de <strong class="text-texto">' + info.total + "</strong></span>" +

        '<div class="paginacion-controles">' +
          '<label class="flex items-center gap-1.5">' +
            '<span class="max-sm:hidden">Por página</span>' +
            '<select class="paginacion-cantidad" data-cantidad aria-label="Elementos por página">' +
              opciones +
            "</select>" +
          "</label>" +

          '<button type="button" class="paginacion-boton" data-pagina="anterior" ' +
            (info.pagina <= 1 ? "disabled " : "") + 'aria-label="Página anterior">‹</button>' +
          '<span class="paginacion-pagina">' + info.pagina + " / " + info.paginas + "</span>" +
          '<button type="button" class="paginacion-boton" data-pagina="siguiente" ' +
            (info.pagina >= info.paginas ? "disabled " : "") + 'aria-label="Página siguiente">›</button>' +
        "</div>" +
      "</div>"
    );
  }

  /**
   * Dibuja un listado completo.
   *
   * config = {
   *   contenedor,                       // dónde se dibuja
   *   items,                            // la lista COMPLETA, ya filtrada
   *   contenido: function (visibles),   // devuelve el HTML de esa página
   *   vacio: { icono, mensaje },        // qué mostrar si no hay nada
   *   porPagina                         // opcional, por defecto 25
   * }
   */
  function render(config) {
    var contenedor = config.contenedor;
    if (!contenedor) return;

    var items = config.items || [];
    var st = estado(contenedor);

    if (config.porPagina && !contenedor.__listadoIniciado) {
      st.porPagina = config.porPagina;
    }
    contenedor.__listadoIniciado = true;

    if (!items.length) {
      var vacio = config.vacio || {};
      contenedor.innerHTML =
        '<p class="mensaje-vacio">' +
          (vacio.icono ? Eternum.iconos.svg(vacio.icono, "icono-vacio") : "") +
          utils.escapeHtml(vacio.mensaje || "No hay nada para mostrar") +
        "</p>";
      return;
    }

    var paginas = Math.max(1, Math.ceil(items.length / st.porPagina));

    // Al filtrar, la página en la que estabas puede dejar de existir.
    if (st.pagina > paginas) st.pagina = paginas;
    if (st.pagina < 1) st.pagina = 1;

    var inicio = (st.pagina - 1) * st.porPagina;
    var visibles = items.slice(inicio, inicio + st.porPagina);

    contenedor.innerHTML =
      '<div class="lista-scroll">' + config.contenido(visibles) + "</div>" +
      pieHtml({
        total: items.length,
        inicio: inicio,
        porPagina: st.porPagina,
        pagina: st.pagina,
        paginas: paginas
      });

    conectar(contenedor, config);
  }

  /**
   * Conecta los controles del pie.
   *
   * Se vuelven a conectar en cada dibujado porque el pie se rehace entero;
   * como los nodos son nuevos, no quedan escuchas duplicadas.
   */
  function conectar(contenedor, config) {
    var st = estado(contenedor);

    utils.qsa("[data-pagina]", contenedor).forEach(function (boton) {
      utils.on(boton, "click", function () {
        st.pagina += boton.getAttribute("data-pagina") === "siguiente" ? 1 : -1;
        render(config);
        // Al cambiar de página se vuelve arriba: si no, se sigue viendo el
        // medio de la lista nueva y parece que no pasó nada.
        var caja = utils.qs(".lista-scroll", contenedor);
        if (caja) caja.scrollTop = 0;
      });
    });

    utils.qsa("[data-cantidad]", contenedor).forEach(function (select) {
      utils.on(select, "change", function () {
        st.porPagina = Number(select.value) || POR_DEFECTO;
        st.pagina = 1;
        render(config);
      });
    });
  }

  /** Deja el listado en la primera página (al cambiar un filtro). */
  function reiniciar(contenedor) {
    if (contenedor) estado(contenedor).pagina = 1;
  }

  return { render: render, reiniciar: reiniciar, CANTIDADES: CANTIDADES };
})();
