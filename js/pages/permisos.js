/* Sección administrativa: matriz de permisos por rol. */
(function () {
  var utils = Eternum.utils;

  var ETIQUETA_ROL = {
    Root: "Root",
    Administrador: "Administrador",
    Tecnico: "Técnico",
    Docente: "Docente"
  };
  var INSIGNIA_ROL = {
    Root: "insignia-vencido",
    Administrador: "insignia-en_progreso",
    Tecnico: "insignia-en_resolucion",
    Docente: "insignia-resuelto"
  };

  document.addEventListener("DOMContentLoaded", function () {
    var contenedorMatriz = utils.qs("#matriz");
    var contenedorRoles = utils.qs("#tarjetas-roles");
    if (!contenedorMatriz) return;

    function pintarRoles(datos) {
      contenedorRoles.innerHTML = datos.roles.map(function (rol) {
        return (
          '<article class="tarjeta flex flex-col gap-2">' +
            '<span class="insignia ' + INSIGNIA_ROL[rol] + ' self-start">' + ETIQUETA_ROL[rol] + "</span>" +
            '<p class="text-sm text-tenue">' + utils.escapeHtml(datos.notas[rol] || "") + "</p>" +
          "</article>"
        );
      }).join("");
    }

    function pintarMatriz(datos) {
      // Cabecera: una columna por rol.
      var encabezados = '<th scope="col">Acción</th>' + datos.roles.map(function (rol) {
        return '<th scope="col" class="text-center">' + ETIQUETA_ROL[rol] + "</th>";
      }).join("");

      var filas = datos.modulos.map(function (modulo) {
        // Fila separadora con el nombre del módulo.
        var cabeceraModulo =
          '<tr><td colspan="' + (datos.roles.length + 1) + '" ' +
              'class="bg-fondo text-[0.7rem] font-bold uppercase tracking-wider text-tenue">' +
            utils.escapeHtml(modulo.modulo) +
          "</td></tr>";

        var acciones = modulo.acciones.map(function (accion) {
          var celdas = datos.roles.map(function (rol) {
            var permitido = accion.roles[rol];
            return '<td class="text-center">' +
              (permitido
                ? '<span class="text-exito" title="Permitido" aria-label="Permitido">' +
                  Eternum.iconos.svg("tilde", "icono-tilde") + '</span>'
                : '<span class="text-debil" title="No permitido" aria-label="No permitido">—</span>') +
              "</td>";
          }).join("");

          return "<tr><td>" + utils.escapeHtml(accion.descripcion) + "</td>" + celdas + "</tr>";
        }).join("");

        return cabeceraModulo + acciones;
      }).join("");

      contenedorMatriz.innerHTML =
        '<table class="tabla"><thead><tr>' + encabezados + "</tr></thead><tbody>" + filas + "</tbody></table>";
    }

    Eternum.services.permisos.getMatriz().then(function (datos) {
      pintarRoles(datos);
      pintarMatriz(datos);
    }).catch(function (err) {
      // Un 403 acá significa que la persona no es admin; app.js ya la redirige.
      contenedorMatriz.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      contenedorRoles.innerHTML = "";
    });
  });
})();
