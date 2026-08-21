/* Lógica de la pantalla de Préstamos. */
(function () {
  var utils = Eternum.utils;

  // Las reglas viven en la capa de negocio: acá solo se dibuja.
  var negocio = Eternum.services.prestamos;
  var ESTADOS = negocio.ESTADOS;

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");

    var equiposPorId = {};
    var prestamos = [];
    var personas = [];

    function actualizarMetricas() {
      var m = negocio.metricas(prestamos);

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
      var filtrados = negocio.filtrar(prestamos, { estado: selEstado.value });

      Eternum.components.listado.render({
        contenedor: lista,
        items: filtrados,
        vacio: { icono: "prestamos", mensaje: "No hay préstamos" },
        contenido: function (visibles) {
          return '<div class="flex flex-col">' + visibles.map(function (p) {
            return (
              '<article class="item-lista">' +
                '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
                  '<div class="item-titulo">' +
                    '<span class="codigo">' + utils.escapeHtml(p.codigo) + "</span>" +
                    utils.escapeHtml(nombreEquipo(p.equipoId)) +
                    ' <span class="insignia insignia-' + p.estado + '">' + ESTADOS[p.estado] + "</span>" +
                  "</div>" +
                  '<div class="item-meta">' +
                    (p.equipoCodigo
                      ? "<span>" + Eternum.iconos.svg("inventario", "icono-meta") + " " +
                        utils.escapeHtml(p.equipoCodigo) + "</span>"
                      : "") +
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
      });
    }

    utils.on(lista, "click", function (e) {
      var btn = e.target.closest("[data-devolver]");
      if (!btn) return;

      var id = btn.getAttribute("data-devolver");
      btn.disabled = true;

      negocio.marcarDevuelto(id).then(function () {
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

    utils.on(selEstado, "change", function () {
      Eternum.components.listado.reiniciar(lista);
      render();
    });

    utils.on(btnNuevo, "click", function () {
      var indexador = Eternum.components.indexador;

      var configEquipo = {
        id: "pr-equipo",
        etiqueta: "Equipo",
        placeholder: "Buscá por código, marca o ubicación",
        ayuda: "Se identifica con su código, por ejemplo L1-SN-88213.",
        opciones: indexador.equipos(Object.keys(equiposPorId).map(function (id) {
          return equiposPorId[id];
        })),
        vacio: "No hay equipos registrados."
      };

      // El solicitante también se busca, en vez de escribirse a mano: así el
      // préstamo queda atado a una cuenta y no a un nombre suelto, que era
      // imposible de cruzar con nada.
      var configSolicitante = {
        id: "pr-solicitante",
        etiqueta: "Solicitante",
        placeholder: "Buscá por cédula o nombre",
        ayuda: "Queda registrado a nombre de esa persona.",
        opciones: indexador.personas(personas),
        vacio: "No hay personas registradas."
      };

      var buscadorEquipo;
      var buscadorSolicitante;

      Eternum.components.modal.open({
        title: "Registrar préstamo",
        submitLabel: "Registrar",
        bodyHtml:
          indexador.html(configEquipo) +
          indexador.html(configSolicitante) +
          '<div class="campo"><label class="etiqueta" for="pr-limite">Fecha límite</label>' +
            '<input type="date" id="pr-limite" class="control">' +
            '<p class="campo-error"></p></div>',

        onAbrir: function (caja) {
          buscadorEquipo = indexador.conectar(caja, configEquipo);
          buscadorSolicitante = indexador.conectar(caja, configSolicitante);
        },

        onSubmit: function (caja, cerrar) {
          var limite = caja.querySelector("#pr-limite");
          utils.clearFormErrors(caja);

          var equipoId = buscadorEquipo.valor();
          if (!equipoId) {
            utils.setFieldError(buscadorEquipo.campo(), "Elegí un equipo de la lista.");
            return;
          }

          var solicitanteId = buscadorSolicitante.valor();
          if (!solicitanteId) {
            utils.setFieldError(buscadorSolicitante.campo(), "Elegí a la persona de la lista.");
            return;
          }

          if (!utils.validators.required(limite.value)) {
            utils.setFieldError(limite, "Indicá la fecha límite.");
            return;
          }

          negocio.crear({
            equipoId: equipoId,
            solicitanteId: solicitanteId,
            fechaLimite: limite.value
          }).then(function (nuevo) {
            prestamos.unshift(nuevo);
            render();
            actualizarMetricas();
            cerrar();
            Eternum.components.toast.show("Préstamo " + nuevo.codigo + " registrado correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    });

    Promise.all([
      Eternum.services.inventario.equipos(),
      negocio.listar(),
      // Si falla, el formulario avisa que no hay personas para elegir; el
      // listado de préstamos se puede ver igual.
      Eternum.services.usuarios.directorio().catch(function () { return []; })
    ])
      .then(function (res) {
        res[0].forEach(function (eq) { equiposPorId[String(eq.id)] = eq; });
        prestamos = res[1];
        personas = res[2];
        render();
        actualizarMetricas();
      })
      .catch(function (err) {
        lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
        Eternum.components.toast.show(err.message, "error", 8000);
      });
  });
})();
