/*
 * Pantalla de inicio.
 *
 * No es un tablero de métricas del sistema: es el punto de partida de quien
 * entra. Arriba, lo que va a hacer (abrir un ticket, pedir un servicio, ver
 * lo suyo); abajo, el estado de los equipos del lugar donde va a trabajar.
 *
 * Cambia según el rol: el personal técnico ve además la carga de trabajo del
 * área. Quién es "personal" lo decide el servidor y viaja en el resumen.
 */
(function () {
  var utils = Eternum.utils;

  var inventario = Eternum.services.inventario;
  var resumenes = Eternum.services.resumenes;
  var ESTADOS_EQUIPO = inventario.ESTADOS_EQUIPO;

  /** Tarjetas de la carga de trabajo, en el orden en que se muestran. */
  var COLA = [
    { clave: "ticketsPendientes", etiqueta: "Tickets sin tomar", destino: "/tickets/?estado=pendiente" },
    { clave: "ticketsEnCurso", etiqueta: "Tickets en curso", destino: "/tickets/" },
    { clave: "solicitudesPendientes", etiqueta: "Solicitudes a responder", destino: "/solicitudes/?estado=pendiente" },
    { clave: "prestamosVencidos", etiqueta: "Préstamos vencidos", destino: "/prestamos/" },
    { clave: "equiposEnReparacion", etiqueta: "Equipos en reparación", destino: "/estado/" }
  ];

  /** Rellena los iconos de los accesos rápidos, que en el HTML van vacíos. */
  function pintarIconos() {
    utils.qsa("[data-icono]").forEach(function (hueco) {
      hueco.innerHTML = Eternum.iconos.svg(hueco.getAttribute("data-icono"), "icono-metrica");
    });
  }

  function pintarEncabezado(resumen) {
    var sesion = Eternum.services.sesion.actual();
    var titulo = utils.qs("#saludo");
    var subtitulo = utils.qs("#subtitulo");

    if (titulo && sesion) {
      titulo.textContent = resumenes.saludo() + ", " + String(sesion.nombre || "").split(" ")[0];
    }

    if (subtitulo) {
      subtitulo.textContent = resumen.esPersonal
        ? "Mesa de ayuda · ITI CETP"
        : "Tus pedidos y el estado de los equipos · ITI CETP";
    }
  }

  function pintarContadores(resumen) {
    var tickets = utils.qs('[data-contador="tickets"]');
    var solicitudes = utils.qs('[data-contador="solicitudes"]');

    if (tickets) {
      tickets.textContent = resumenes.textoContador(resumen.misTickets, "ticket", "tickets");
    }
    if (solicitudes) {
      solicitudes.textContent = resumenes.textoContador(resumen.misSolicitudes, "solicitud", "solicitudes");
    }
  }

  function pintarCola(resumen) {
    var seccion = utils.qs("#seccion-cola");
    var contenedor = utils.qs("#cola");
    if (!seccion || !contenedor) return;

    if (!resumen.esPersonal || !resumen.cola) {
      seccion.classList.add("hidden");
      return;
    }

    seccion.classList.remove("hidden");
    seccion.classList.add("flex");

    contenedor.innerHTML = COLA.map(function (item) {
      var valor = resumen.cola[item.clave] || 0;
      return (
        '<a class="tarjeta-cola no-underline transition-colors hover:border-primario" href="' + item.destino + '">' +
          '<span class="cola-valor">' + valor + "</span>" +
          '<span class="cola-etiqueta">' + item.etiqueta + "</span>" +
        "</a>"
      );
    }).join("");
  }

  /** Carga el desplegable de ubicaciones con lo que existe en el inventario. */
  function pintarFiltroUbicaciones(resumen) {
    var select = utils.qs("#filtro-ubicacion");
    if (!select || !resumen.ubicaciones) return;

    select.innerHTML = '<option value="">Todas las ubicaciones</option>' +
      resumen.ubicaciones.map(function (u) {
        return '<option value="' + utils.escapeHtml(u.ubicacion) + '">' +
          utils.escapeHtml(resumenes.etiquetaUbicacion(u)) + "</option>";
      }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var listaEquipos = utils.qs("#lista-equipos");
    if (!listaEquipos) return;

    var buscador = utils.qs("#buscador-equipos");
    var filtroUbicacion = utils.qs("#filtro-ubicacion");
    var filtroEstado = utils.qs("#filtro-estado");
    var conteo = utils.qs("#conteo-equipos");

    var equipos = [];

    pintarIconos();

    function filtrar() {
      return inventario.filtrarEquipos(equipos, {
        texto: buscador.value,
        ubicacion: filtroUbicacion.value,
        estado: filtroEstado.value
      });
    }

    function render() {
      var lista = filtrar();

      if (conteo) {
        var conProblemas = inventario.contarConProblemas(lista);
        conteo.textContent = lista.length + (lista.length === 1 ? " equipo" : " equipos") +
          (conProblemas ? " · " + conProblemas + " con problemas" : "");
      }

      Eternum.components.listado.render({
        contenedor: listaEquipos,
        items: lista,
        vacio: { icono: "inventario", mensaje: "No hay equipos que coincidan con el filtro" },
        contenido: function (visibles) {
          return '<table class="tabla"><thead><tr>' +
            "<th>Código</th><th>Tipo</th><th>Marca / Modelo</th>" +
            "<th>Ubicación</th><th>Estado</th><th>Detalle</th><th></th>" +
          "</tr></thead><tbody>" +
          visibles.map(function (eq) {
              return "<tr>" +
                '<td class="celda-titulo"><span class="codigo codigo-fuerte">' +
                  utils.escapeHtml(eq.codigo) + "</span></td>" +
                '<td data-etiqueta="Tipo">' + utils.escapeHtml(eq.tipo) + "</td>" +
                '<td data-etiqueta="Marca / Modelo">' +
                  utils.escapeHtml(eq.marca + " " + eq.modelo) + "</td>" +
                '<td data-etiqueta="Ubicación">' + utils.escapeHtml(eq.ubicacion) + "</td>" +
                '<td class="celda-insignia"><span class="insignia insignia-' + eq.estado + '">' +
                  (ESTADOS_EQUIPO[eq.estado] || eq.estado) + "</span></td>" +
                '<td class="celda-bloque" data-etiqueta="Detalle">' +
                  (eq.fallas ? utils.escapeHtml(eq.fallas) : "—") + "</td>" +
                '<td class="celda-accion text-right">' +
                  '<a class="btn-secundario" href="/tickets/?nuevo=1&equipo=' +
                    encodeURIComponent(eq.id) + '">Reportar</a>' +
                "</td>" +
              "</tr>";
          }).join("") +
          "</tbody></table>";
        }
      });
    }

    /** Un filtro nuevo empieza desde la primera página. */
    function renderDesdeFiltro() {
      Eternum.components.listado.reiniciar(listaEquipos);
      render();
    }

    utils.on(buscador, "input", utils.debounce(renderDesdeFiltro, 200));
    utils.on(filtroUbicacion, "change", renderDesdeFiltro);
    utils.on(filtroEstado, "change", renderDesdeFiltro);

    Promise.all([
      resumenes.inicio(),
      inventario.equipos()
    ]).then(function (res) {
      var resumen = res[0];
      equipos = res[1];

      pintarEncabezado(resumen);
      pintarContadores(resumen);
      pintarCola(resumen);
      pintarFiltroUbicaciones(resumen);
      render();
    }).catch(function (err) {
      listaEquipos.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
