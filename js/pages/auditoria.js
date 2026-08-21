/* Registro de auditoría: consulta con filtros por fecha, hora, quién y qué. */
(function () {
  var utils = Eternum.utils;

  /* Los filtros se mandan al servidor, no se filtra en el navegador: el
     registro puede crecer mucho y no tiene sentido traerlo entero. */
  document.addEventListener("DOMContentLoaded", function () {
    var tabla = utils.qs("#tabla-auditoria");
    if (!tabla) return;

    var campos = {
      desde: utils.qs("#f-desde"),
      hasta: utils.qs("#f-hasta"),
      horaDesde: utils.qs("#f-hora-desde"),
      horaHasta: utils.qs("#f-hora-hasta"),
      usuario: utils.qs("#f-usuario"),
      accion: utils.qs("#f-accion"),
      q: utils.qs("#f-texto")
    };
    var resumen = utils.qs("#resumen-filtros");
    var ultimosRegistros = [];
    var opcionesCargadas = false;

    /** Arma la cadena de consulta con los filtros que estén completos. */
    function filtrosActuales() {
      var partes = [];
      Object.keys(campos).forEach(function (clave) {
        var valor = (campos[clave].value || "").trim();
        if (valor) partes.push(encodeURIComponent(clave) + "=" + encodeURIComponent(valor));
      });
      return partes.join("&");
    }

    /** Carga los desplegables de "quién" y "qué" una sola vez. */
    function cargarOpciones(datos) {
      if (opcionesCargadas) return;
      opcionesCargadas = true;

      campos.usuario.innerHTML = '<option value="">Cualquier usuario</option>' +
        datos.usuarios.map(function (u) {
          return '<option value="' + u.id + '">' + utils.escapeHtml(u.nombre) + "</option>";
        }).join("");

      campos.accion.innerHTML = '<option value="">Cualquier acción</option>' +
        datos.acciones.map(function (a) {
          return '<option value="' + a.clave + '">' + utils.escapeHtml(a.descripcion) + "</option>";
        }).join("");
    }

    function describirResultado(datos) {
      var n = datos.registros.length;
      if (datos.total === 0) return "Sin movimientos para estos filtros.";

      var texto = n === 1 ? "1 movimiento" : n + " movimientos";
      if (datos.recortado) {
        texto += " (de " + datos.total + " en total; se muestran los " +
          datos.limite + " más recientes)";
      }
      return texto;
    }

    function render(datos) {
      ultimosRegistros = datos.registros;
      resumen.textContent = describirResultado(datos);

      Eternum.components.listado.render({
        contenedor: tabla,
        items: datos.registros,
        vacio: { icono: "auditoria", mensaje: "No hay movimientos que coincidan con los filtros" },
        contenido: function (visibles) {
          var filas = visibles.map(function (r) {
                return "<tr>" +
                  '<td class="whitespace-nowrap" data-etiqueta="Fecha">' +
                    utils.formatDate(r.fecha) + "</td>" +
                  '<td class="whitespace-nowrap tabular-nums" data-etiqueta="Hora">' + r.hora + "</td>" +
                  '<td class="celda-bloque" data-etiqueta="Quién">' +
                    '<div class="flex items-center gap-2">' +
                      Eternum.iconos.svg("profile", "icono-meta") +
                      "<span>" + utils.escapeHtml(r.usuarioNombre) + "</span>" +
                    "</div>" +
                    '<span class="text-xs text-tenue">' + utils.escapeHtml(r.usuarioRol) + "</span>" +
                  "</td>" +
                  '<td class="celda-titulo">' + utils.escapeHtml(r.descripcion) + "</td>" +
                  '<td class="celda-bloque text-tenue" data-etiqueta="Detalle">' +
                    (r.detalle ? utils.escapeHtml(r.detalle) : "—") + "</td>" +
                "</tr>";
          }).join("");

          return '<table class="tabla"><thead><tr>' +
              '<th scope="col">Fecha</th>' +
              '<th scope="col">Hora</th>' +
              '<th scope="col">Quién</th>' +
              '<th scope="col">Qué</th>' +
              '<th scope="col">Detalle</th>' +
            "</tr></thead><tbody>" + filas + "</tbody></table>";
        }
      });
    }

    function consultar() {
      Eternum.components.listado.reiniciar(tabla);
      tabla.innerHTML = '<p class="mensaje-vacio">Cargando…</p>';

      Eternum.services.auditoria.consultar(filtrosActuales())
        .then(function (datos) {
          cargarOpciones(datos);
          render(datos);
        })
        .catch(function (err) {
          tabla.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
          resumen.textContent = "—";
        });
    }

    /* Los desplegables y las fechas consultan al instante; el texto libre
       espera a que se deje de escribir. */
    ["desde", "hasta", "horaDesde", "horaHasta", "usuario", "accion"].forEach(function (clave) {
      utils.on(campos[clave], "change", consultar);
    });
    utils.on(campos.q, "input", utils.debounce(consultar, 350));

    utils.on(utils.qs("#btn-hoy"), "click", function () {
      var hoy = new Date().toISOString().slice(0, 10);
      campos.desde.value = hoy;
      campos.hasta.value = hoy;
      consultar();
    });

    utils.on(utils.qs("#btn-limpiar"), "click", function () {
      Object.keys(campos).forEach(function (clave) { campos[clave].value = ""; });
      consultar();
    });

    utils.on(utils.qs("#btn-exportar"), "click", function () {
      if (!ultimosRegistros.length) {
        Eternum.components.toast.show("No hay movimientos para exportar.", "aviso");
        return;
      }

      var encabezados = ["Fecha", "Hora", "Usuario", "Rol", "Acción", "Detalle"];
      var filas = ultimosRegistros.map(function (r) {
        return [r.fecha, r.hora, r.usuarioNombre, r.usuarioRol, r.descripcion, r.detalle || ""];
      });

      var csv = [encabezados].concat(filas).map(function (fila) {
        return fila.map(function (v) {
          return '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"';
        }).join(",");
      }).join("\r\n");

      // El BOM hace que Excel abra bien los acentos.
      var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "auditoria-sgrsi.csv";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      Eternum.components.toast.show("Registro exportado correctamente.", "exito");
    });

    consultar();
  });
})();
