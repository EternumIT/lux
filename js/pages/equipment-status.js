/* Lógica de la pantalla de Estado de Equipos. */
(function () {
  var utils = Eternum.utils;

  var ESTADOS = { operativo: "Operativo", reparacion: "En reparación", baja: "De baja" };
  var CATEGORIAS = ["Laboratorios", "Salones", "Administración", "Otros"];
  var COLORES = { Laboratorios: "azul", Salones: "verde", "Administración": "amarillo", Otros: "gris" };

  document.addEventListener("DOMContentLoaded", function () {
    var cuerpo = utils.qs("#cuerpo-equipos");
    if (!cuerpo) return;

    var vacio = utils.qs("#vacio-equipos");

    Promise.all([
      Eternum.services.inventario.getEquipos(),
      Eternum.services.dashboard.getResumen()
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

      if (!equipos.length) {
        if (vacio) vacio.textContent = "No hay equipos registrados";
        return;
      }
      if (vacio) vacio.classList.add("hidden");

      cuerpo.innerHTML = equipos.map(function (eq) {
        return "<tr>" +
          "<td>" + utils.escapeHtml(eq.ubicacion) + "</td>" +
          "<td>" + utils.escapeHtml(eq.serie) + "</td>" +
          '<td><span class="insignia insignia-' + eq.estado + '">' +
            (ESTADOS[eq.estado] || eq.estado) + "</span></td>" +
          "<td>" + utils.formatDate(eq.creado) + "</td>" +
          "<td>" + utils.escapeHtml(eq.tipo) + "</td>" +
          "<td>" + (eq.fallas ? utils.escapeHtml(eq.fallas) : "—") + "</td>" +
        "</tr>";
      }).join("");
    }).catch(function (err) {
      if (vacio) vacio.textContent = err.message;
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
