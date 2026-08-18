/* Lógica de la pantalla de Préstamos. */
(function () {
  var utils = Eternum.utils;
  var svc = Eternum.services.prestamos;

  var ESTADOS = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    activo: "Activo",
    vencido: "Vencido",
    devuelto: "Devuelto"
  };

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");

    var equiposPorId = {};
    var prestamos = [];

    function actualizarMetricas() {
      var activos = prestamos.filter(function (p) { return p.estado === "activo"; }).length;
      var vencidos = prestamos.filter(function (p) { return p.estado === "vencido"; }).length;
      var devueltos = prestamos.filter(function (p) { return p.estado === "devuelto"; }).length;
      var tasa = prestamos.length ? Math.round((devueltos / prestamos.length) * 100) : 0;

      var m = {
        activos: activos,
        vencidos: vencidos,
        tasa: tasa + "%"
      };
      Object.keys(m).forEach(function (clave) {
        var el = utils.qs('[data-metrica="' + clave + '"]');
        if (el) el.textContent = m[clave];
      });
    }

    function nombreEquipo(id) {
      var eq = equiposPorId[String(id)];
      return eq ? eq.marca + " " + eq.modelo : "Equipo no asignado";
    }

    function render() {
      var estado = selEstado.value;
      var filtrados = prestamos.filter(function (p) { return !estado || p.estado === estado; });

      if (!filtrados.length) {
        lista.innerHTML =
          '<p class="mensaje-vacio">' + Eternum.iconos.svg("prestamos", "icono-vacio") + 'No hay préstamos</p>';
        return;
      }

      lista.innerHTML = '<div class="flex flex-col">' + filtrados.map(function (p) {
        return (
          '<article class="item-lista">' +
            '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
              '<div class="item-titulo">' + utils.escapeHtml(nombreEquipo(p.equipoId)) +
                ' <span class="insignia insignia-' + p.estado + '">' + ESTADOS[p.estado] + "</span>" +
              "</div>" +
              '<div class="item-meta">' +
                "<span>" + Eternum.iconos.svg("profile", "icono-meta") + " " + utils.escapeHtml(p.solicitante) + "</span>" +
                "<span>" + Eternum.iconos.svg("calendario", "icono-meta") + " Desde " + utils.formatDate(p.fechaInicio) + "</span>" +
                "<span>" + Eternum.iconos.svg("vence", "icono-meta") + " Hasta " + utils.formatDate(p.fechaLimite) + "</span>" +
              "</div>" +
            "</div>" +
            '<div class="flex shrink-0 items-center gap-2.5">' +
              (p.estado === "activo" || p.estado === "vencido"
                ? '<button type="button" class="btn-secundario" data-devolver="' + p.id + '">Marcar devuelto</button>'
                : "") +
            "</div>" +
          "</article>"
        );
      }).join("") + "</div>";
    }

    utils.on(lista, "click", function (e) {
      var btn = e.target.closest("[data-devolver]");
      if (!btn) return;

      var id = btn.getAttribute("data-devolver");
      btn.disabled = true;

      svc.marcarDevuelto(id).then(function () {
        var p = prestamos.find(function (x) { return String(x.id) === id; });
        if (p) p.estado = "devuelto";
        render();
        actualizarMetricas();
        Eternum.components.toast.show("Préstamo marcado como devuelto.", "exito");
      }).catch(function (err) {
        btn.disabled = false;
        Eternum.components.toast.show(err.message, "error", 6000);
      });
    });

    utils.on(selEstado, "change", render);

    utils.on(btnNuevo, "click", function () {
      var opciones = Object.keys(equiposPorId).map(function (id) {
        var eq = equiposPorId[id];
        return '<option value="' + id + '">' +
          utils.escapeHtml(eq.marca + " " + eq.modelo + " — " + eq.serie) + "</option>";
      }).join("");

      Eternum.components.modal.open({
        title: "Registrar préstamo",
        submitLabel: "Registrar",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="pr-equipo">Equipo</label>' +
            '<select id="pr-equipo" class="control">' + opciones + "</select></div>" +
          '<div class="campo"><label class="etiqueta" for="pr-solicitante">Solicitante</label>' +
            '<input type="text" id="pr-solicitante" class="control" placeholder="Nombre y apellido">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="pr-limite">Fecha límite</label>' +
            '<input type="date" id="pr-limite" class="control">' +
            '<p class="campo-error"></p></div>',
        onSubmit: function (caja, cerrar) {
          var solicitante = caja.querySelector("#pr-solicitante");
          var limite = caja.querySelector("#pr-limite");
          utils.clearFormErrors(caja);

          var valido = true;
          if (!utils.validators.required(solicitante.value)) {
            utils.setFieldError(solicitante, "Indicá el solicitante.");
            valido = false;
          }
          if (!utils.validators.required(limite.value)) {
            utils.setFieldError(limite, "Indicá la fecha límite.");
            valido = false;
          }
          if (!valido) return;

          svc.createPrestamo({
            equipoId: caja.querySelector("#pr-equipo").value,
            solicitante: solicitante.value.trim(),
            fechaLimite: limite.value
          }).then(function (nuevo) {
            prestamos.unshift(nuevo);
            render();
            actualizarMetricas();
            cerrar();
            Eternum.components.toast.show("Préstamo registrado correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    });

    Promise.all([Eternum.services.inventario.getEquipos(), svc.getPrestamos()])
      .then(function (res) {
        res[0].forEach(function (eq) { equiposPorId[String(eq.id)] = eq; });
        prestamos = res[1];
        render();
        actualizarMetricas();
      })
      .catch(function (err) {
        lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
        Eternum.components.toast.show(err.message, "error", 8000);
      });
  });
})();
