/* Lógica de la pantalla de Estado de Equipos. */
(function () {
  var utils = Eternum.utils;

  var ESTADOS = Eternum.services.inventario.ESTADOS_EQUIPO;
  var CATEGORIAS = ["Laboratorios", "Salones", "Administración", "Otros"];
  var COLORES = { Laboratorios: "azul", Salones: "verde", "Administración": "amarillo", Otros: "gris" };

  document.addEventListener("DOMContentLoaded", function () {
    var tabla = utils.qs("#tabla-equipos");
    if (!tabla) return;

    Promise.all([
      Eternum.services.inventario.equipos(),
      Eternum.services.resumenes.panel()
    ]).then(function (res) {
      var equipos = res[0];
      var resumen = res[1];

      Eternum.charts.donut(
        utils.qs("#grafica-ubicacion"),
        CATEGORIAS.map(function (cat) {
          return { value: resumen.porUbicacion[cat] || 0, color: COLORES[cat] };
        }),
        { centerLabel: "equipos" }
      );

      Eternum.charts.bars(
        utils.qs("#grafica-incidentes"),
        CATEGORIAS.map(function (cat) {
          return { label: cat, value: resumen.incidentesPorUbicacion[cat] || 0, color: "rojo" };
        })
      );

      Eternum.components.listado.render({
        contenedor: tabla,
        items: equipos,
        vacio: { icono: "inventario", mensaje: "No hay equipos registrados" },
        contenido: function (visibles) {
          return '<table class="tabla"><thead><tr>' +
              '<th scope="col">Código</th>' +
              '<th scope="col">Ubicación</th>' +
              '<th scope="col">N° Equipo</th>' +
              '<th scope="col">Estado</th>' +
              '<th scope="col">Alta</th>' +
              '<th scope="col">Tipo</th>' +
              '<th scope="col">Fallas</th>' +
            "</tr></thead><tbody>" +
            visibles.map(function (eq) {
              return "<tr>" +
                '<td class="celda-titulo"><span class="codigo codigo-fuerte">' +
                  utils.escapeHtml(eq.codigo) + "</span></td>" +
                '<td data-etiqueta="Ubicación">' + utils.escapeHtml(eq.ubicacion) + "</td>" +
                '<td data-etiqueta="N° Equipo">' + utils.escapeHtml(eq.serie) + "</td>" +
                '<td class="celda-insignia"><span class="insignia insignia-' + eq.estado + '">' +
                  (ESTADOS[eq.estado] || eq.estado) + "</span></td>" +
                '<td data-etiqueta="Alta">' + utils.formatDate(eq.creado) + "</td>" +
                '<td data-etiqueta="Tipo">' + utils.escapeHtml(eq.tipo) + "</td>" +
                '<td class="celda-bloque" data-etiqueta="Fallas">' +
                  (eq.fallas ? utils.escapeHtml(eq.fallas) : "—") + "</td>" +
              "</tr>";
            }).join("") +
            "</tbody></table>";
        }
      });
    }).catch(function (err) {
      tabla.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
