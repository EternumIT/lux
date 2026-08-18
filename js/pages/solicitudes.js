/* Lógica de la pantalla de Solicitudes de Servicio. */
(function () {
  var utils = Eternum.utils;
  var svc = Eternum.services.solicitudes;

  var ESTADOS = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    en_progreso: "En progreso",
    completado: "Completado",
    rechazado: "Rechazado"
  };

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");
    var solicitudes = [];

    function render() {
      var estado = selEstado.value;
      var filtradas = solicitudes.filter(function (s) { return !estado || s.estado === estado; });

      if (!filtradas.length) {
        lista.innerHTML =
          '<p class="mensaje-vacio"><span class="text-3xl opacity-50">🔧</span>No hay solicitudes de servicio</p>';
        return;
      }

      lista.innerHTML = '<div class="flex flex-col">' + filtradas.map(function (s) {
        return (
          '<article class="item-lista">' +
            '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
              '<div class="item-titulo">' + utils.escapeHtml(s.titulo) +
                ' <span class="insignia insignia-' + s.estado + '">' + ESTADOS[s.estado] + "</span>" +
              "</div>" +
              '<div class="item-meta">' +
                "<span>👤 " + utils.escapeHtml(s.solicitante) + "</span>" +
                "<span>📅 " + utils.formatDate(s.creado) + "</span>" +
              "</div>" +
              (s.detalle ? '<p class="text-sm text-tenue">' + utils.escapeHtml(s.detalle) + "</p>" : "") +
            "</div>" +
          "</article>"
        );
      }).join("") + "</div>";
    }

    utils.on(selEstado, "change", render);

    utils.on(btnNuevo, "click", function () {
      Eternum.components.modal.open({
        title: "Nueva solicitud",
        submitLabel: "Enviar solicitud",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="so-titulo">Título</label>' +
            '<input type="text" id="so-titulo" class="control" placeholder="Ej: Solicitud de 2 laptops">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="so-solicitante">Solicitante</label>' +
            '<input type="text" id="so-solicitante" class="control" placeholder="Nombre y apellido">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="so-detalle">Detalle</label>' +
            '<textarea id="so-detalle" class="control-area" rows="3" placeholder="Describí la solicitud"></textarea></div>',
        onSubmit: function (caja, cerrar) {
          var titulo = caja.querySelector("#so-titulo");
          var solicitante = caja.querySelector("#so-solicitante");
          utils.clearFormErrors(caja);

          var valido = true;
          if (!utils.validators.required(titulo.value)) {
            utils.setFieldError(titulo, "El título es obligatorio.");
            valido = false;
          }
          if (!utils.validators.required(solicitante.value)) {
            utils.setFieldError(solicitante, "Indicá el solicitante.");
            valido = false;
          }
          if (!valido) return;

          svc.createSolicitud({
            titulo: titulo.value.trim(),
            solicitante: solicitante.value.trim(),
            detalle: caja.querySelector("#so-detalle").value.trim()
          }).then(function (nueva) {
            solicitudes.unshift(nueva);
            render();
            cerrar();
            Eternum.components.toast.show("Solicitud enviada correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    });

    svc.getSolicitudes().then(function (data) {
      solicitudes = data;
      render();
    }).catch(function (err) {
      lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
