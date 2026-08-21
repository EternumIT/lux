/*
 * Buscador con índice: se escribe y se elige de una lista.
 *
 * Es el control que ya se usaba para elegir el equipo de un ticket, ahora
 * compartido y capaz de elegir varias cosas. Sirve para cualquier lista larga
 * donde la persona ya sabe QUÉ busca pero no dónde está en la lista: equipos
 * por código o modelo, personas por nombre o cédula.
 *
 * Por qué esto y no un desplegable con casillas: una lista de casillas obliga
 * a recorrer todo el sistema con la vista para encontrar a alguien, y crece
 * sin control. Acá se escriben tres letras y aparece.
 *
 * Se apoya en <datalist>, que es del propio navegador: filtra solo, se puede
 * usar con el teclado y no necesita ninguna librería.
 */
window.Eternum = window.Eternum || {};

Eternum.components.indexador = (function () {
  var utils = Eternum.utils;

  /**
   * HTML del control, para meter en el cuerpo de un formulario.
   *
   * config = {
   *   id,                              // identificador único dentro del formulario
   *   etiqueta, placeholder, ayuda,    // textos
   *   opciones: [{ valor, busqueda, detalle }],
   *   multiple,                        // permite elegir varias
   *   vacio                            // qué decir si no hay nada para elegir
   * }
   *
   * "busqueda" es lo que se escribe y lo que el navegador filtra, así que
   * lleva junto todo aquello por lo que alguien podría buscar: para una
   * persona, la cédula y el nombre.
   */
  function html(config) {
    var opciones = config.opciones || [];

    if (!opciones.length) {
      return '<div class="campo">' +
        '<span class="etiqueta">' + utils.escapeHtml(config.etiqueta || "") + "</span>" +
        '<p class="text-sm text-tenue">' +
          utils.escapeHtml(config.vacio || "No hay nada para elegir.") +
        "</p></div>";
    }

    var listaId = config.id + "-opciones";

    return '<div class="campo" data-indexador="' + config.id + '"' +
             (config.multiple ? " data-multiple" : "") + ">" +
        '<label class="etiqueta" for="' + config.id + '">' +
          utils.escapeHtml(config.etiqueta || "") + "</label>" +

        '<input type="text" class="control" id="' + config.id + '" list="' + listaId + '"' +
          ' placeholder="' + utils.escapeHtml(config.placeholder || "Escribí para buscar") + '"' +
          ' autocomplete="off">' +

        '<datalist id="' + listaId + '">' +
          opciones.map(function (o) {
            return '<option value="' + utils.escapeHtml(o.busqueda) + '">' +
              utils.escapeHtml(o.detalle || "") + "</option>";
          }).join("") +
        "</datalist>" +

        '<p class="campo-error"></p>' +

        // Lo ya elegido, cuando se puede elegir más de uno.
        (config.multiple ? '<div class="flex flex-wrap gap-1.5 empty:hidden" data-elegidos></div>' : "") +

        (config.ayuda ? '<p class="text-xs text-tenue">' + utils.escapeHtml(config.ayuda) + "</p>" : "") +
      "</div>";
  }

  /**
   * Conecta el control ya dibujado y devuelve con qué leerlo.
   *
   * Devuelve { valores(), valor(), campo(), limpiar() }.
   */
  function conectar(contenedor, config) {
    var raiz = utils.qs('[data-indexador="' + config.id + '"]', contenedor);
    var entrada = utils.qs("#" + config.id, contenedor);

    // Sin opciones no se dibujó el control: se devuelve algo inofensivo para
    // que quien lo use no tenga que preguntar si existe.
    if (!raiz || !entrada) {
      return { valores: function () { return []; }, valor: function () { return null; },
               campo: function () { return null; }, limpiar: function () {} };
    }

    var opciones = config.opciones || [];
    var elegidos = [];
    var caja = utils.qs("[data-elegidos]", raiz);

    function buscarPorTexto(texto) {
      texto = String(texto || "").trim().toLowerCase();
      if (!texto) return null;

      for (var i = 0; i < opciones.length; i++) {
        if (opciones[i].busqueda.toLowerCase() === texto) return opciones[i];
      }

      return null;
    }

    function pintarElegidos() {
      if (!caja) return;

      caja.innerHTML = elegidos.map(function (o) {
        return '<span class="insignia insignia-en_progreso">' +
          utils.escapeHtml(o.detalle || o.busqueda) +
          '<button type="button" class="ml-1 cursor-pointer font-bold" ' +
            'data-quitar="' + utils.escapeHtml(o.valor) + '" aria-label="Quitar">×</button>' +
        "</span>";
      }).join("");
    }

    function agregar(opcion) {
      var repetido = elegidos.some(function (o) { return o.valor === opcion.valor; });
      if (!repetido) {
        elegidos.push(opcion);
        pintarElegidos();
      }
      entrada.value = "";
    }

    if (config.multiple) {
      // "change" es el evento que dispara el navegador al elegir del listado.
      utils.on(entrada, "change", function () {
        var opcion = buscarPorTexto(entrada.value);
        if (opcion) {
          utils.clearFieldError(entrada);
          agregar(opcion);
        }
      });

      utils.on(raiz, "click", function (e) {
        var boton = e.target.closest("[data-quitar]");
        if (!boton) return;

        var valor = boton.getAttribute("data-quitar");
        elegidos = elegidos.filter(function (o) { return o.valor !== valor; });
        pintarElegidos();
      });
    }

    return {
      /** Ids elegidos (modo múltiple). */
      valores: function () {
        return elegidos.map(function (o) { return o.valor; });
      },

      /**
       * Id elegido (modo simple).
       * Devuelve null si está vacío, y false si hay texto que no corresponde
       * a nada: quien llama distingue "no eligió" de "escribió cualquier cosa".
       */
      valor: function () {
        var texto = entrada.value.trim();
        if (!texto) return null;

        var opcion = buscarPorTexto(texto);

        return opcion ? opcion.valor : false;
      },

      /** El input, para marcarle un error. */
      campo: function () {
        return entrada;
      },

      limpiar: function () {
        entrada.value = "";
        elegidos = [];
        pintarElegidos();
      }
    };
  }

  /** Arma las opciones de una lista de personas: se busca por cédula o nombre. */
  function personas(lista, exceptoId) {
    return lista.filter(function (p) {
      return String(p.id) !== String(exceptoId || "");
    }).map(function (p) {
      return {
        valor: String(p.id),
        busqueda: (p.cedula ? p.cedula + " · " : "") + p.nombre,
        detalle: p.nombre + " · " + p.rol
      };
    });
  }

  /** Arma las opciones de una lista de equipos: se busca por código o modelo. */
  function equipos(lista) {
    return lista.map(function (eq) {
      return {
        valor: String(eq.id),
        busqueda: eq.codigo + " · " + eq.marca + " " + eq.modelo,
        detalle: eq.marca + " " + eq.modelo + " · " + eq.ubicacion
      };
    });
  }

  return { html: html, conectar: conectar, personas: personas, equipos: equipos };
})();
