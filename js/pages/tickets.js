/* Lógica de la pantalla de Tickets. */
(function () {
  var utils = Eternum.utils;
  var svc = Eternum.services.tickets;

  var ESTADOS = {
    pendiente: "Pendiente",
    en_progreso: "En progreso",
    en_resolucion: "En resolución",
    resuelto: "Resuelto"
  };
  var ORDEN = ["pendiente", "en_progreso", "en_resolucion", "resuelto"];

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var buscador = utils.qs("#buscador");
    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");

    var tickets = [];

    function render() {
      var texto = (buscador.value || "").toLowerCase().trim();
      var estado = selEstado.value;

      var filtrados = tickets.filter(function (t) {
        var coincideTexto = !texto ||
          (t.titulo + " " + t.solicitante).toLowerCase().indexOf(texto) !== -1;
        return coincideTexto && (!estado || t.estado === estado);
      });

      if (!filtrados.length) {
        lista.innerHTML =
          '<p class="mensaje-vacio"><span class="text-3xl opacity-50">🎫</span>No hay tickets</p>';
        return;
      }

      lista.innerHTML = '<div class="flex flex-col">' + filtrados.map(function (t) {
        return (
          '<article class="item-lista">' +
            '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
              '<div class="item-titulo">' + utils.escapeHtml(t.titulo) +
                ' <span class="insignia insignia-' + t.estado + '">' + ESTADOS[t.estado] + "</span>" +
              "</div>" +
              '<div class="item-meta">' +
                "<span>👤 " + utils.escapeHtml(t.solicitante) + "</span>" +
                "<span>📅 " + utils.formatDate(t.creado) + "</span>" +
              "</div>" +
            "</div>" +
            '<div class="flex shrink-0 items-center gap-2.5">' +
              (t.estado !== "resuelto"
                ? '<button type="button" class="btn-secundario" data-avanzar="' + t.id + '">Avanzar estado</button>'
                : "") +
            "</div>" +
          "</article>"
        );
      }).join("") + "</div>";
    }

    function siguienteEstado(estado) {
      return ORDEN[Math.min(ORDEN.indexOf(estado) + 1, ORDEN.length - 1)];
    }

    utils.on(lista, "click", function (e) {
      var btn = e.target.closest("[data-avanzar]");
      if (!btn) return;

      var ticket = tickets.find(function (t) { return String(t.id) === btn.getAttribute("data-avanzar"); });
      if (!ticket) return;

      var nuevo = siguienteEstado(ticket.estado);
      btn.disabled = true;

      svc.updateEstado(ticket.id, nuevo).then(function () {
        ticket.estado = nuevo;
        render();
        Eternum.components.toast.show('Ticket actualizado a "' + ESTADOS[nuevo] + '".', "exito");
      }).catch(function (err) {
        btn.disabled = false;
        Eternum.components.toast.show(err.message, "error", 6000);
      });
    });

    utils.on(buscador, "input", utils.debounce(render, 200));
    utils.on(selEstado, "change", render);

    utils.on(btnNuevo, "click", function () {
      Eternum.components.modal.open({
        title: "Nuevo ticket",
        submitLabel: "Crear ticket",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="tk-titulo">Título</label>' +
            '<input type="text" id="tk-titulo" class="control" placeholder="Ej: Impresora no imprime">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="tk-solicitante">Solicitante</label>' +
            '<input type="text" id="tk-solicitante" class="control" placeholder="Nombre y apellido">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="tk-descripcion">Descripción</label>' +
            '<textarea id="tk-descripcion" class="control-area" rows="3" placeholder="Detalle del problema"></textarea></div>',
        onSubmit: function (caja, cerrar) {
          var titulo = caja.querySelector("#tk-titulo");
          var solicitante = caja.querySelector("#tk-solicitante");
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

          svc.createTicket({
            titulo: titulo.value.trim(),
            solicitante: solicitante.value.trim(),
            descripcion: caja.querySelector("#tk-descripcion").value.trim()
          }).then(function (nuevo) {
            tickets.unshift(nuevo);
            render();
            cerrar();
            Eternum.components.toast.show("Ticket creado correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    });

    svc.getTickets().then(function (data) {
      tickets = data;
      render();
    }).catch(function (err) {
      lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
