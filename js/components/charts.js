/* Gráficas ligeras sin dependencias externas (conic-gradient + barras CSS). */
window.Eternum = window.Eternum || {};

Eternum.charts = (function () {
  var utils = Eternum.utils;

  // Se usan las variables CSS del tema para que las gráficas cambien de color
  // automáticamente al pasar a modo oscuro.
  var COLORES = {
    azul: "var(--color-info)",
    naranja: "var(--color-aviso)",
    amarillo: "var(--color-amarillo)",
    verde: "var(--color-exito)",
    rojo: "var(--color-peligro)",
    gris: "var(--color-debil)"
  };

  function color(nombre) {
    return COLORES[nombre] || nombre;
  }

  /** Dibuja una dona con conic-gradient. items: [{value, color}] */
  function donut(contenedor, items, opts) {
    if (!contenedor) return;
    opts = opts || {};

    var total = items.reduce(function (suma, item) { return suma + item.value; }, 0);

    var dona = document.createElement("div");
    dona.className = "dona";

    if (total === 0) {
      dona.style.background = "var(--color-fondo)";
    } else {
      var tramos = [];
      var acumulado = 0;
      items.forEach(function (item) {
        if (item.value <= 0) return;
        var desde = (acumulado / total) * 100;
        acumulado += item.value;
        var hasta = (acumulado / total) * 100;
        tramos.push(color(item.color) + " " + desde.toFixed(2) + "% " + hasta.toFixed(2) + "%");
      });
      dona.style.background = "conic-gradient(" + tramos.join(", ") + ")";
    }

    var centro = document.createElement("div");
    centro.className = "dona-centro";
    centro.innerHTML =
      '<span class="text-2xl font-bold text-texto">' + total + "</span>" +
      '<span class="text-xs uppercase tracking-wide text-tenue">' +
        utils.escapeHtml(opts.centerLabel || "Total") +
      "</span>";
    dona.appendChild(centro);

    contenedor.innerHTML = "";
    contenedor.className = contenedor.className.replace(/\bborder-dashed\b/, "border-solid");
    contenedor.appendChild(dona);
  }

  /** Dibuja una lista de barras horizontales. items: [{label, value, color}] */
  function bars(contenedor, items) {
    if (!contenedor) return;

    var maximo = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));

    var envoltorio = document.createElement("div");
    envoltorio.className = "flex w-full flex-col gap-3.5";

    items.forEach(function (item) {
      var porcentaje = Math.round((item.value / maximo) * 100);
      var fila = document.createElement("div");
      fila.className = "flex flex-col gap-1.5";
      fila.innerHTML =
        '<div class="flex justify-between text-sm text-tenue">' +
          "<span>" + utils.escapeHtml(item.label) + "</span>" +
          '<strong class="text-texto">' + item.value + "</strong>" +
        "</div>" +
        '<div class="barra-fondo">' +
          '<div class="barra-relleno" style="width:' + porcentaje + "%;background:" + color(item.color) + ';"></div>' +
        "</div>";
      envoltorio.appendChild(fila);
    });

    contenedor.innerHTML = "";
    contenedor.className = contenedor.className.replace(/\bborder-dashed\b/, "border-solid");
    contenedor.appendChild(envoltorio);
  }

  return { donut: donut, bars: bars };
})();
