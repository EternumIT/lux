/* Lógica de la pantalla de Dashboard. */
(function () {
  var utils = Eternum.utils;

  var ESTADOS = {
    pendiente: { label: "Pendiente", color: "naranja" },
    en_progreso: { label: "En progreso", color: "azul" },
    en_resolucion: { label: "En resolución", color: "amarillo" },
    resuelto: { label: "Resuelto", color: "verde" }
  };

  function pintarMetricas(resumen) {
    ["equiposTotales", "ticketsAbiertos", "prestamosActivos", "solicitudesPendientes"].forEach(function (clave) {
      var el = utils.qs('[data-metrica="' + clave + '"]');
      if (el) el.textContent = resumen[clave];
    });
  }

  function pintarDona(resumen) {
    Eternum.charts.donut(
      utils.qs("#grafica-dona"),
      Object.keys(ESTADOS).map(function (clave) {
        return { value: resumen.porEstadoTickets[clave] || 0, color: ESTADOS[clave].color };
      }),
      { centerLabel: "tickets" }
    );
  }

  function pintarActividad(resumen) {
    var items = Object.keys(resumen.actividad || {}).map(function (fecha) {
      var dia = new Date(fecha + "T00:00:00").toLocaleDateString("es-UY", { weekday: "short" });
      return {
        label: dia.charAt(0).toUpperCase() + dia.slice(1),
        value: resumen.actividad[fecha],
        color: "azul"
      };
    });
    Eternum.charts.bars(utils.qs("#grafica-barras"), items);
  }

  function pintarEstadoSistema(resumen) {
    var contenedor = utils.qs("#estado-barras");
    if (!contenedor) return;

    var total = Object.keys(ESTADOS).reduce(function (suma, clave) {
      return suma + (resumen.porEstadoTickets[clave] || 0);
    }, 0);

    contenedor.innerHTML = Object.keys(ESTADOS).map(function (clave) {
      var valor = resumen.porEstadoTickets[clave] || 0;
      var porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
      return (
        '<article class="flex flex-col gap-1.5">' +
          '<div class="flex items-center justify-between">' +
            '<span class="text-sm text-tenue">' + ESTADOS[clave].label + "</span>" +
            '<span class="text-sm font-bold text-texto">' + valor + "</span>" +
          "</div>" +
          '<div class="barra-fondo">' +
            '<div class="barra-relleno ' + ESTADOS[clave].color + '" style="width:' + porcentaje + '%"></div>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  /** Descarga el inventario de equipos como CSV (con BOM para Excel). */
  function exportarCSV() {
    Eternum.services.inventario.getEquipos().then(function (equipos) {
      var encabezados = ["Tipo", "Ubicación", "Marca", "Modelo", "N° de serie", "Estado"];
      var filas = equipos.map(function (eq) {
        return [eq.tipo, eq.ubicacion, eq.marca, eq.modelo, eq.serie, eq.estado];
      });

      var csv = [encabezados].concat(filas).map(function (fila) {
        return fila.map(function (v) {
          return '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"';
        }).join(",");
      }).join("\r\n");

      var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "equipos-sgrsi.csv";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      Eternum.components.toast.show("CSV de equipos exportado correctamente.", "exito");
    }).catch(function (err) {
      Eternum.components.toast.show(err.message, "error", 6000);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!utils.qs('[data-metrica="equiposTotales"]')) return;

    Eternum.services.dashboard.getResumen().then(function (resumen) {
      pintarMetricas(resumen);
      pintarDona(resumen);
      pintarActividad(resumen);
      pintarEstadoSistema(resumen);
    }).catch(function (err) {
      Eternum.components.toast.show(err.message, "error", 8000);
    });

    utils.on(utils.qs("#btn-exportar"), "click", exportarCSV);

    var sesion = Eternum.services.auth.getSession();
    if (sesion) {
      var titulo = utils.qs("h1");
      if (titulo) titulo.textContent = "Buenos días, " + String(sesion.nombre).split(" ")[0];
    }
  });
})();
