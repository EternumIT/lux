/* Lógica de la pantalla de Inventario (equipos + componentes). */
(function () {
  var utils = Eternum.utils;

  // Las reglas (qué se busca, qué cuenta como problema) viven en negocio.
  var negocio = Eternum.services.inventario;
  var ESTADO_EQUIPO = negocio.ESTADOS_EQUIPO;

  document.addEventListener("DOMContentLoaded", function () {
    var panelEquipos = utils.qs("#tab-equipos");
    var panelComponentes = utils.qs("#tab-componentes");
    if (!panelEquipos || !panelComponentes) return;

    var botonesTab = utils.qsa(".tab-btn");
    var buscador = utils.qs("#buscador");
    var selEstado = utils.qs('select[name="estado"]');
    var selUbicacion = utils.qs('select[name="ubicacion"]');

    var equipos = [];
    var componentes = [];

    function insignia(estado, texto) {
      return '<span class="insignia insignia-' + estado + '">' + texto + "</span>";
    }

    function filtrarEquipos() {
      return negocio.filtrarEquipos(equipos, {
        texto: buscador.value,
        estado: selEstado.value,
        ubicacion: selUbicacion.value
      });
    }

    function filtrarComponentes() {
      return negocio.filtrarComponentes(componentes, { texto: buscador.value });
    }

    function tabla(encabezados, filas) {
      return (
        '<table class="tabla"><thead><tr>' +
        encabezados.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
        "</tr></thead><tbody>" + filas + "</tbody></table>"
      );
    }

    function renderEquipos(lista) {
      Eternum.components.listado.render({
        contenedor: panelEquipos,
        items: lista,
        vacio: { icono: "inventario", mensaje: "No se encontraron equipos" },
        contenido: function (visibles) {
          var filas = visibles.map(function (eq) {
            return "<tr>" +
              '<td class="celda-titulo"><span class="codigo codigo-fuerte">' +
                utils.escapeHtml(eq.codigo) + "</span></td>" +
              '<td data-etiqueta="Tipo">' + utils.escapeHtml(eq.tipo) + "</td>" +
              '<td data-etiqueta="Marca / Modelo">' +
                utils.escapeHtml(eq.marca + " " + eq.modelo) + "</td>" +
              '<td data-etiqueta="N° de serie">' + utils.escapeHtml(eq.serie) + "</td>" +
              '<td data-etiqueta="Ubicación">' + utils.escapeHtml(eq.ubicacion) + "</td>" +
              '<td class="celda-insignia">' +
                insignia(eq.estado, ESTADO_EQUIPO[eq.estado] || eq.estado) + "</td>" +
            "</tr>";
          }).join("");

          return tabla(
            ["Código", "Tipo", "Marca / Modelo", "N° de serie", "Ubicación", "Estado"], filas
          );
        }
      });
    }

    function renderComponentes(lista) {
      Eternum.components.listado.render({
        contenedor: panelComponentes,
        items: lista,
        vacio: { icono: "componente", mensaje: "No se encontraron componentes" },
        contenido: function (visibles) {
          var filas = visibles.map(function (co) {
            return "<tr>" +
              '<td class="celda-titulo"><span class="codigo codigo-fuerte">' +
                utils.escapeHtml(co.codigo) + "</span></td>" +
              '<td data-etiqueta="Nombre">' + utils.escapeHtml(co.nombre) + "</td>" +
              '<td data-etiqueta="Modelo">' + utils.escapeHtml(co.modelo) + "</td>" +
              '<td data-etiqueta="Fabricante">' + utils.escapeHtml(co.fabricante) + "</td>" +
              '<td data-etiqueta="N° de serie">' + utils.escapeHtml(co.serie || "—") + "</td>" +
              '<td class="celda-insignia">' + (co.funcionando
                ? insignia("operativo", "Funcionando")
                : insignia("baja", "Con falla")) + "</td>" +
            "</tr>";
          }).join("");

          return tabla(
            ["Código", "Nombre", "Modelo", "Fabricante", "N° de serie", "Estado"], filas
          );
        }
      });
    }

    function refrescar(desdeFiltro) {
      if (desdeFiltro) {
        Eternum.components.listado.reiniciar(panelEquipos);
        Eternum.components.listado.reiniciar(panelComponentes);
      }
      renderEquipos(filtrarEquipos());
      renderComponentes(filtrarComponentes());
    }

    /** Un filtro nuevo empieza desde la primera página. */
    function refrescarDesdeFiltro() {
      refrescar(true);
    }

    function cambiarTab(nombre) {
      botonesTab.forEach(function (btn) {
        btn.setAttribute("data-activo", btn.getAttribute("data-tab") === nombre ? "true" : "false");
      });
      panelEquipos.classList.toggle("hidden", nombre !== "equipos");
      panelComponentes.classList.toggle("hidden", nombre !== "componentes");
    }

    botonesTab.forEach(function (btn) {
      utils.on(btn, "click", function () {
        cambiarTab(btn.getAttribute("data-tab"));
      });
    });

    utils.on(buscador, "input", utils.debounce(refrescarDesdeFiltro, 200));
    utils.on(selEstado, "change", refrescarDesdeFiltro);
    utils.on(selUbicacion, "change", refrescarDesdeFiltro);

    Promise.all([negocio.equipos(), negocio.componentes()]).then(function (res) {
      equipos = res[0];
      componentes = res[1];

      var textoEquipos = botonesTab[0] && botonesTab[0].querySelector(".tab-texto");
      var textoComponentes = botonesTab[1] && botonesTab[1].querySelector(".tab-texto");
      if (textoEquipos) textoEquipos.textContent = "Equipos (" + equipos.length + ")";
      if (textoComponentes) textoComponentes.textContent = "Componentes (" + componentes.length + ")";

      refrescar();
    }).catch(function (err) {
      panelEquipos.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
