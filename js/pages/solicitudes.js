/*
 * Pantalla de Solicitudes de Servicio.
 *
 * Funciona igual que la de tickets: cada uno ve las suyas y las que le
 * compartieron, el personal técnico ve todas, y el cambio de estado se hace
 * desde la ficha dejando escrito qué se resolvió.
 */
(function () {
  var utils = Eternum.utils;

  // Las reglas viven en la capa de negocio: acá solo se dibuja.
  var negocio = Eternum.services.solicitudes;
  var ESTADOS = negocio.ESTADOS;

  function parametros() {
    var params = new URLSearchParams(window.location.search);
    return {
      nuevo: params.get("nuevo") === "1",
      estado: params.get("estado") || ""
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");
    var args = parametros();

    var solicitudes = [];
    var personas = [];
    var sesion = Eternum.services.sesion.actual();

    function render() {
      var filtradas = negocio.filtrar(solicitudes, { estado: selEstado.value });

      Eternum.components.listado.render({
        contenedor: lista,
        items: filtradas,
        vacio: {
          icono: "solicitudes",
          mensaje: solicitudes.length
            ? "Ninguna solicitud coincide con el filtro"
            : "Todavía no tenés solicitudes"
        },
        contenido: function (visibles) {
          return '<div class="flex flex-col">' + visibles.map(function (s) {
            return (
              '<article class="item-lista">' +
                '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
                  '<div class="item-titulo">' +
                    '<span class="codigo">' + utils.escapeHtml(s.codigo) + "</span>" +
                    utils.escapeHtml(s.titulo) +
                    ' <span class="insignia insignia-' + s.estado + '">' + ESTADOS[s.estado] + "</span>" +
                  "</div>" +
                  '<div class="item-meta">' +
                    "<span>" + Eternum.iconos.svg("profile", "icono-meta") + " " + utils.escapeHtml(s.solicitante) + "</span>" +
                    "<span>" + Eternum.iconos.svg("calendario", "icono-meta") + " " + utils.formatDate(s.creado) + "</span>" +
                    (s.participantes
                      ? "<span>" + Eternum.iconos.svg("usuarios", "icono-meta") + " +" + s.participantes + "</span>"
                      : "") +
                  "</div>" +
                  (s.detalle ? '<p class="text-sm text-tenue">' + utils.escapeHtml(s.detalle) + "</p>" : "") +
                "</div>" +
                '<div class="flex shrink-0 items-center gap-2.5">' +
                  '<button type="button" class="btn-secundario" data-ver="' + s.id + '">Ver detalle</button>' +
                  (negocio.puedeAvanzar(sesion, s)
                    ? '<button type="button" class="btn-primario" data-avanzar="' + s.id + '">Cambiar estado</button>'
                    : "") +
                "</div>" +
              "</article>"
            );
          }).join("") + "</div>";
        }
      });
    }

    function abrirDetalle(id, avanzar) {
      negocio.detalle(id).then(function (solicitud) {
        Eternum.detalle.abrir({
          titulo: solicitud.titulo,
          codigo: solicitud.codigo,
          estado: solicitud.estado,
          estados: ESTADOS,
          siguienteEstado: avanzar ? negocio.siguienteEstado(solicitud.estado) : solicitud.estado,
          descripcion: solicitud.detalle,
          participantes: solicitud.participantes,
          historial: solicitud.historial,
          puedeAvanzar: negocio.puedeGestionar(sesion),
          datos: [
            { etiqueta: "Solicitante", valor: solicitud.solicitante },
            { etiqueta: "Enviada el", valor: utils.formatDate(solicitud.creado) }
          ],
          onAvanzar: function (estado, nota) {
            return negocio.avanzar(solicitud.id, estado, nota).then(function (actualizada) {
              var indice = solicitudes.findIndex(function (s) { return s.id === actualizada.id; });
              if (indice !== -1) {
                actualizada.participantes = (actualizada.participantes || []).length;
                solicitudes[indice] = actualizada;
              }
              render();
              Eternum.components.toast.show(
                'Solicitud actualizada a "' + ESTADOS[estado] + '".', "exito");
            });
          }
        });
      }).catch(function (err) {
        Eternum.components.toast.show(err.message, "error", 6000);
      });
    }

    utils.on(lista, "click", function (e) {
      var ver = e.target.closest("[data-ver]");
      if (ver) return abrirDetalle(ver.getAttribute("data-ver"), false);

      var avanzar = e.target.closest("[data-avanzar]");
      if (avanzar) return abrirDetalle(avanzar.getAttribute("data-avanzar"), true);
    });

    utils.on(selEstado, "change", function () {
      Eternum.components.listado.reiniciar(lista);
      render();
    });

    var CAMPO_PERSONAS = "so-participantes";

    function abrirFormulario() {
      var indexador = Eternum.components.indexador;

      var configPersonas = {
        id: CAMPO_PERSONAS,
        etiqueta: "Sumar a otras personas (opcional)",
        placeholder: "Buscá por cédula o nombre",
        ayuda: "Van a ver la solicitud y seguir su avance.",
        opciones: indexador.personas(personas, sesion && sesion.id),
        multiple: true,
        vacio: "No hay otras personas para agregar."
      };

      var buscadorPersonas;

      Eternum.components.modal.open({
        title: "Nueva solicitud",
        submitLabel: "Enviar solicitud",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="so-titulo">Título</label>' +
            '<input type="text" id="so-titulo" class="control" placeholder="Ej: Solicitud de 2 laptops">' +
            '<p class="campo-error"></p></div>' +

          '<div class="campo"><label class="etiqueta" for="so-detalle">Detalle</label>' +
            '<textarea id="so-detalle" class="control-area" rows="3" ' +
              'placeholder="Contá para qué la necesitás y para cuándo"></textarea></div>' +

          indexador.html(configPersonas),

        onAbrir: function (caja) {
          buscadorPersonas = indexador.conectar(caja, configPersonas);
        },

        onSubmit: function (caja, cerrar) {
          var titulo = caja.querySelector("#so-titulo");
          utils.clearFormErrors(caja);

          if (!utils.validators.required(titulo.value)) {
            utils.setFieldError(titulo, "El título es obligatorio.");
            return;
          }

          var participantes = buscadorPersonas.valores();

          negocio.crear({
            titulo: titulo.value.trim(),
            detalle: caja.querySelector("#so-detalle").value.trim(),
            participantes: participantes
          }).then(function (nueva) {
            nueva.participantes = (nueva.participantes || []).length;
            solicitudes.unshift(nueva);
            render();
            cerrar();
            Eternum.components.toast.show("Solicitud " + nueva.codigo + " enviada correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    }

    utils.on(btnNuevo, "click", abrirFormulario);

    if (args.estado && selEstado.querySelector('option[value="' + args.estado + '"]')) {
      selEstado.value = args.estado;
    }

    Promise.all([
      negocio.listar(),
      Eternum.services.usuarios.directorio().catch(function () { return []; })
    ]).then(function (res) {
      solicitudes = res[0];
      personas = res[1];
      render();

      if (args.nuevo) abrirFormulario();
    }).catch(function (err) {
      lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
