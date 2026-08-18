/* Lógica de la pantalla de Inventario (equipos + componentes). */
(function () {
  var utils = Eternum.utils;
  var svc = Eternum.services.inventario;

  var ESTADO_EQUIPO = { operativo: "Operativo", reparacion: "En reparación", baja: "De baja" };

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
      var texto = (buscador.value || "").toLowerCase().trim();
      var estado = selEstado.value;
      var ubicacion = selUbicacion.value;

      return equipos.filter(function (eq) {
        var coincideTexto = !texto ||
          (eq.marca + " " + eq.modelo + " " + eq.serie).toLowerCase().indexOf(texto) !== -1;
        return coincideTexto &&
          (!estado || eq.estado === estado) &&
          (!ubicacion || eq.ubicacion === ubicacion);
      });
    }

    function filtrarComponentes() {
      var texto = (buscador.value || "").toLowerCase().trim();
      return componentes.filter(function (co) {
        return !texto ||
          (co.nombre + " " + co.modelo + " " + co.fabricante + " " + (co.serie || ""))
            .toLowerCase().indexOf(texto) !== -1;
      });
    }

    function tabla(encabezados, filas) {
      return (
        '<table class="tabla"><thead><tr>' +
        encabezados.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
        "</tr></thead><tbody>" + filas + "</tbody></table>"
      );
    }

    function renderEquipos(lista) {
      if (!lista.length) {
        panelEquipos.innerHTML =
          '<p class="mensaje-vacio"><span class="text-3xl opacity-50">📦</span>No se encontraron equipos</p>';
        return;
      }

      var filas = lista.map(function (eq) {
        return "<tr>" +
          "<td>" + utils.escapeHtml(eq.tipo) + "</td>" +
          "<td>" + utils.escapeHtml(eq.marca + " " + eq.modelo) + "</td>" +
          "<td>" + utils.escapeHtml(eq.serie) + "</td>" +
          "<td>" + utils.escapeHtml(eq.ubicacion) + "</td>" +
          "<td>" + insignia(eq.estado, ESTADO_EQUIPO[eq.estado] || eq.estado) + "</td>" +
        "</tr>";
      }).join("");

      panelEquipos.innerHTML = tabla(
        ["Tipo", "Marca / Modelo", "N° de serie", "Ubicación", "Estado"], filas
      );
    }

    function renderComponentes(lista) {
      if (!lista.length) {
        panelComponentes.innerHTML =
          '<p class="mensaje-vacio"><span class="text-3xl opacity-50">⚙</span>No se encontraron componentes</p>';
        return;
      }

      var filas = lista.map(function (co) {
        return "<tr>" +
          "<td>" + utils.escapeHtml(co.nombre) + "</td>" +
          "<td>" + utils.escapeHtml(co.modelo) + "</td>" +
          "<td>" + utils.escapeHtml(co.fabricante) + "</td>" +
          "<td>" + utils.escapeHtml(co.serie || "—") + "</td>" +
          "<td>" + (co.funcionando
            ? insignia("operativo", "Funcionando")
            : insignia("baja", "Con falla")) + "</td>" +
        "</tr>";
      }).join("");

      panelComponentes.innerHTML = tabla(
        ["Nombre", "Modelo", "Fabricante", "N° de serie", "Estado"], filas
      );
    }

    function refrescar() {
      renderEquipos(filtrarEquipos());
      renderComponentes(filtrarComponentes());
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

    utils.on(buscador, "input", utils.debounce(refrescar, 200));
    utils.on(selEstado, "change", refrescar);
    utils.on(selUbicacion, "change", refrescar);

    Promise.all([svc.getEquipos(), svc.getComponentes()]).then(function (res) {
      equipos = res[0];
      componentes = res[1];

      if (botonesTab[0]) botonesTab[0].textContent = "📦 Equipos (" + equipos.length + ")";
      if (botonesTab[1]) botonesTab[1].textContent = "⚙ Componentes (" + componentes.length + ")";

      refrescar();
    }).catch(function (err) {
      panelEquipos.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
