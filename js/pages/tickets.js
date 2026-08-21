/*
 * Pantalla de Tickets.
 *
 * Cada usuario ve únicamente sus tickets y aquellos a los que lo agregaron;
 * el personal técnico ve todos. Ese recorte lo hace la API: acá solo se
 * dibuja lo que llega.
 *
 * Al tocar un ticket se abre su ficha con la línea de tiempo completa. El
 * botón de avanzar el estado solo aparece para el personal técnico, y el
 * cambio siempre pide una nota.
 */
(function () {
  var utils = Eternum.utils;

  // Las reglas (estados, orden, quién puede avanzar, por qué campos se busca)
  // viven en la capa de negocio: acá solo se dibuja.
  var negocio = Eternum.services.tickets;
  var ESTADOS = negocio.ESTADOS;

  /** Parámetros de la dirección: ?nuevo=1&equipo=3&estado=pendiente */
  function parametros() {
    var params = new URLSearchParams(window.location.search);
    return {
      nuevo: params.get("nuevo") === "1",
      equipo: params.get("equipo") || "",
      estado: params.get("estado") || ""
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var buscador = utils.qs("#buscador");
    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");
    var args = parametros();

    var tickets = [];
    var equipos = [];
    var personas = [];
    var sesion = Eternum.services.sesion.actual();

    /* ----------------------------- LISTADO ----------------------------- */

    function render() {
      var filtrados = negocio.filtrar(tickets, {
        texto: buscador.value,
        estado: selEstado.value
      });

      Eternum.components.listado.render({
        contenedor: lista,
        items: filtrados,
        vacio: {
          icono: "tickets",
          mensaje: tickets.length ? "Ningún ticket coincide con el filtro" : "Todavía no tenés tickets"
        },
        contenido: function (visibles) {
          return '<div class="flex flex-col">' + visibles.map(function (t) {
            return (
              '<article class="item-lista">' +
                '<div class="flex min-w-0 flex-1 flex-col gap-1">' +
                  '<div class="item-titulo">' +
                    '<span class="codigo">' + utils.escapeHtml(t.codigo) + "</span>" +
                    utils.escapeHtml(t.titulo) +
                    ' <span class="insignia insignia-' + t.estado + '">' + ESTADOS[t.estado] + "</span>" +
                  "</div>" +
                  '<div class="item-meta">' +
                    "<span>" + Eternum.iconos.svg("profile", "icono-meta") + " " + utils.escapeHtml(t.solicitante) + "</span>" +
                    "<span>" + Eternum.iconos.svg("calendario", "icono-meta") + " " + utils.formatDate(t.creado) + "</span>" +
                    (t.equipoCodigo
                      ? "<span>" + Eternum.iconos.svg("inventario", "icono-meta") + " " +
                        utils.escapeHtml(t.equipoCodigo) + "</span>"
                      : "") +
                    (t.participantes
                      ? "<span>" + Eternum.iconos.svg("usuarios", "icono-meta") + " +" + t.participantes + "</span>"
                      : "") +
                  "</div>" +
                "</div>" +
                '<div class="flex shrink-0 items-center gap-2.5">' +
                  '<button type="button" class="btn-secundario" data-ver="' + t.id + '">Ver detalle</button>' +
                  // Solo el personal técnico mueve el estado, y lo hace desde la
                  // ficha, donde puede dejar la nota de qué hizo.
                  (negocio.puedeAvanzar(sesion, t)
                    ? '<button type="button" class="btn-primario" data-avanzar="' + t.id + '">Avanzar estado</button>'
                    : "") +
                "</div>" +
              "</article>"
            );
          }).join("") + "</div>";
        }
      });
    }

    /* ------------------------------ FICHA ------------------------------ */

    function abrirDetalle(id, avanzar) {
      negocio.detalle(id).then(function (ticket) {
        Eternum.detalle.abrir({
          titulo: ticket.titulo,
          codigo: ticket.codigo,
          estado: ticket.estado,
          estados: ESTADOS,
          siguienteEstado: avanzar ? negocio.siguienteEstado(ticket.estado) : ticket.estado,
          descripcion: ticket.descripcion,
          participantes: ticket.participantes,
          historial: ticket.historial,
          puedeAvanzar: negocio.puedeGestionar(sesion),
          datos: [
            { etiqueta: "Solicitante", valor: ticket.solicitante },
            { etiqueta: "Abierto el", valor: utils.formatDate(ticket.creado) },
            {
              etiqueta: "Equipo",
              html: true,
              valor: ticket.equipoCodigo
                ? '<span class="codigo">' + utils.escapeHtml(ticket.equipoCodigo) + "</span> " +
                  utils.escapeHtml((ticket.equipoMarca || "") + " " + (ticket.equipoModelo || ""))
                : ""
            },
            { etiqueta: "Ubicación", valor: ticket.equipoUbicacion || "" }
          ],
          onAvanzar: function (estado, nota) {
            return negocio.avanzar(ticket.id, estado, nota).then(function (actualizado) {
              var indice = tickets.findIndex(function (t) { return t.id === actualizado.id; });
              if (indice !== -1) {
                actualizado.participantes = (actualizado.participantes || []).length;
                tickets[indice] = actualizado;
              }
              render();
              Eternum.components.toast.show(
                'Ticket actualizado a "' + ESTADOS[estado] + '".', "exito");
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

    // Un filtro nuevo empieza desde la primera pagina: si no, se podria
    // quedar mirando una pagina que ya no existe.
    function filtrar_y_render() {
      Eternum.components.listado.reiniciar(lista);
      render();
    }

    utils.on(buscador, "input", utils.debounce(filtrar_y_render, 200));
    utils.on(selEstado, "change", filtrar_y_render);

    /* --------------------------- NUEVO TICKET --------------------------- */

    // Los dos buscadores del formulario. El de equipos ya existía; el de
    // personas era una lista de casillas con todo el sistema adentro, que no
    // escala y obliga a recorrerla con la vista.
    var CAMPO_EQUIPO = "tk-equipo";
    var CAMPO_PERSONAS = "tk-participantes";

    function abrirFormulario(equipoPreseleccionado) {
      var indexador = Eternum.components.indexador;

      var opcionesEquipo = indexador.equipos(equipos);
      var opcionesPersona = indexador.personas(personas, sesion && sesion.id);

      var equipo = opcionesEquipo.find(function (o) {
        return o.valor === String(equipoPreseleccionado || "");
      });

      var configEquipo = {
        id: CAMPO_EQUIPO,
        etiqueta: "Equipo (opcional)",
        placeholder: "Buscá por código, marca o ubicación",
        ayuda: "Se identifica con su código, por ejemplo L1-SN-88213.",
        opciones: opcionesEquipo,
        vacio: "No hay equipos registrados."
      };

      var configPersonas = {
        id: CAMPO_PERSONAS,
        etiqueta: "Sumar a otras personas (opcional)",
        placeholder: "Buscá por cédula o nombre",
        ayuda: "Van a ver el ticket y seguir su avance.",
        opciones: opcionesPersona,
        multiple: true,
        vacio: "No hay otras personas para agregar."
      };

      var buscadorEquipo;
      var buscadorPersonas;

      Eternum.components.modal.open({
        title: "Nuevo ticket",
        submitLabel: "Crear ticket",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="tk-titulo">Título</label>' +
            '<input type="text" id="tk-titulo" class="control" placeholder="Ej: La PC no enciende">' +
            '<p class="campo-error"></p></div>' +

          indexador.html(configEquipo) +

          '<div class="campo"><label class="etiqueta" for="tk-descripcion">Descripción</label>' +
            '<textarea id="tk-descripcion" class="control-area" rows="3" ' +
              'placeholder="Contá qué pasa y desde cuándo"></textarea></div>' +

          indexador.html(configPersonas),

        onAbrir: function (caja) {
          buscadorEquipo = indexador.conectar(caja, configEquipo);
          buscadorPersonas = indexador.conectar(caja, configPersonas);

          // Al llegar desde "Reportar" en el inicio, el equipo ya viene elegido.
          if (equipo && buscadorEquipo.campo()) {
            buscadorEquipo.campo().value = equipo.busqueda;
          }
        },

        onSubmit: function (caja, cerrar) {
          var titulo = caja.querySelector("#tk-titulo");
          utils.clearFormErrors(caja);

          if (!utils.validators.required(titulo.value)) {
            utils.setFieldError(titulo, "El título es obligatorio.");
            return;
          }

          var equipoId = buscadorEquipo.valor();
          if (equipoId === false) {
            utils.setFieldError(buscadorEquipo.campo(),
              "No hay ningún equipo con ese dato. Elegí uno de la lista.");
            return;
          }

          var participantes = buscadorPersonas.valores();

          negocio.crear({
            titulo: titulo.value.trim(),
            descripcion: caja.querySelector("#tk-descripcion").value.trim(),
            equipoId: equipoId,
            participantes: participantes
          }).then(function (nuevo) {
            nuevo.participantes = (nuevo.participantes || []).length;
            tickets.unshift(nuevo);
            render();
            cerrar();
            Eternum.components.toast.show("Ticket " + nuevo.codigo + " creado correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    }

    utils.on(btnNuevo, "click", function () { abrirFormulario(""); });

    /* ------------------------------ CARGA ------------------------------ */

    if (args.estado && selEstado.querySelector('option[value="' + args.estado + '"]')) {
      selEstado.value = args.estado;
    }

    Promise.all([
      negocio.listar(),
      // El listado de equipos y el directorio alimentan el formulario. Si
      // fallan (por permisos o por red) el ticket igual se puede crear.
      Eternum.services.inventario.equipos().catch(function () { return []; }),
      Eternum.services.usuarios.directorio().catch(function () { return []; })
    ]).then(function (res) {
      tickets = res[0];
      equipos = res[1];
      personas = res[2];
      render();

      // Llegar desde el inicio con "Reportar" abre el formulario ya apuntando
      // al equipo elegido, sin tener que buscarlo de nuevo.
      if (args.nuevo) abrirFormulario(args.equipo);
    }).catch(function (err) {
      lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
