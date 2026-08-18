/* Pantalla de entrada de la sección administrativa. */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var actividad = utils.qs("#ultima-actividad");
    if (!actividad) return;

    function pintarMetricas(usuarios, movimientosHoy) {
      var m = {
        activos: usuarios.filter(function (u) { return !u.bloqueado; }).length,
        bloqueados: usuarios.filter(function (u) { return u.bloqueado; }).length,
        admins: usuarios.filter(function (u) {
          return u.rol === "Root" || u.rol === "Administrador";
        }).length,
        movimientos: movimientosHoy
      };
      Object.keys(m).forEach(function (clave) {
        var el = utils.qs('[data-metrica="' + clave + '"]');
        if (el) el.textContent = m[clave];
      });
    }

    function pintarActividad(registros) {
      if (!registros.length) {
        actividad.innerHTML = '<p class="mensaje-vacio">' +
          Eternum.iconos.svg("auditoria", "icono-vacio") + "Todavía no hay movimientos registrados</p>";
        return;
      }

      // Solo los últimos movimientos: el listado completo está en Auditoría.
      actividad.innerHTML = '<div class="flex flex-col">' + registros.slice(0, 8).map(function (r) {
        return (
          '<article class="item-lista">' +
            '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
              '<div class="item-titulo">' + utils.escapeHtml(r.descripcion) + "</div>" +
              '<div class="item-meta">' +
                "<span>" + Eternum.iconos.svg("profile", "icono-meta") + " " +
                  utils.escapeHtml(r.usuarioNombre) + "</span>" +
                "<span>" + Eternum.iconos.svg("calendario", "icono-meta") + " " +
                  utils.formatDate(r.fecha) + " · " + r.hora + "</span>" +
              "</div>" +
              (r.detalle ? '<p class="text-sm text-tenue">' + utils.escapeHtml(r.detalle) + "</p>" : "") +
            "</div>" +
          "</article>"
        );
      }).join("") + "</div>";
    }

    var hoy = new Date().toISOString().slice(0, 10);

    Promise.all([
      Eternum.services.usuarios.getUsuarios(),
      Eternum.services.auditoria.getRegistros(""),
      Eternum.services.auditoria.getRegistros("desde=" + hoy + "&hasta=" + hoy)
    ]).then(function (res) {
      pintarMetricas(res[0], res[2].total);
      pintarActividad(res[1].registros);
    }).catch(function (err) {
      actividad.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
    });
  });
})();
