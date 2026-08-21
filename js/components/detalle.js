/*
 * Ficha de detalle con línea de tiempo.
 *
 * La usan tickets y solicitudes: las dos muestran lo mismo (los datos del
 * registro, quiénes lo siguen y todo lo que pasó desde que se abrió) y se
 * diferencian solo en las etiquetas y los estados posibles.
 *
 * Quien puede avanzar el estado ve además el formulario del final, donde la
 * nota es obligatoria: sin contar qué se hizo no se guarda el cambio, porque
 * esa nota es justamente lo que después se lee en la línea de tiempo.
 */
window.Eternum = window.Eternum || {};

Eternum.detalle = (function () {
  var utils = Eternum.utils;

  /** Fecha y hora en formato corto: "12/08/2026 14:30". */
  function fechaHora(valor) {
    if (!valor) return "—";
    var d = new Date(String(valor).replace(" ", "T"));
    if (isNaN(d.getTime())) return String(valor);
    return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  }

  function bloqueDatos(datos) {
    var visibles = (datos || []).filter(function (d) { return d.valor; });
    if (!visibles.length) return "";

    return '<div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">' +
      visibles.map(function (d) {
        return '<div class="dato">' +
          '<span class="dato-etiqueta">' + utils.escapeHtml(d.etiqueta) + "</span>" +
          '<span class="dato-valor">' + (d.html ? d.valor : utils.escapeHtml(d.valor)) + "</span>" +
        "</div>";
      }).join("") +
    "</div>";
  }

  function bloqueParticipantes(participantes) {
    if (!participantes || !participantes.length) return "";

    return '<div class="dato">' +
      '<span class="dato-etiqueta">También lo siguen</span>' +
      '<div class="flex flex-wrap gap-1.5">' +
        participantes.map(function (p) {
          return '<span class="insignia insignia-en_progreso">' +
            utils.escapeHtml(p.nombre) + " · " + utils.escapeHtml(p.rol) + "</span>";
        }).join("") +
      "</div>" +
    "</div>";
  }

  function bloqueHistorial(historial, estados) {
    if (!historial || !historial.length) {
      return '<p class="text-sm text-tenue">Todavía no hay movimientos registrados.</p>';
    }

    return '<ul class="linea-tiempo">' + historial.map(function (h) {
      return '<li class="linea-item">' +
        '<span class="linea-punto"></span>' +
        '<div class="linea-cuerpo">' +
          '<div class="linea-cabecera">' +
            '<span class="insignia insignia-' + h.estado + '">' +
              utils.escapeHtml(estados[h.estado] || h.estado) + "</span>" +
            '<span class="linea-meta">' + fechaHora(h.fechaHora) + "</span>" +
          "</div>" +
          (h.nota ? '<p class="linea-nota">' + utils.escapeHtml(h.nota) + "</p>" : "") +
          '<p class="linea-meta">' + utils.escapeHtml(h.usuario) +
            (h.rol ? " · " + utils.escapeHtml(h.rol) : "") + "</p>" +
        "</div>" +
      "</li>";
    }).join("") + "</ul>";
  }

  function bloqueAvance(config) {
    var estados = config.estados;
    var siguiente = config.siguienteEstado || config.estado;

    return '<div class="flex flex-col gap-4 rounded-xl border border-borde bg-fondo p-4">' +
      '<h3 class="text-sm font-bold text-texto">Registrar un avance</h3>' +
      '<div class="campo">' +
        '<label class="etiqueta" for="detalle-estado">Nuevo estado</label>' +
        '<select class="control" id="detalle-estado">' +
          Object.keys(estados).map(function (clave) {
            return '<option value="' + clave + '"' +
              (clave === siguiente ? " selected" : "") + ">" +
              utils.escapeHtml(estados[clave]) + "</option>";
          }).join("") +
        "</select>" +
      "</div>" +
      '<div class="campo">' +
        '<label class="etiqueta" for="detalle-nota">Qué se hizo</label>' +
        '<textarea class="control-area" id="detalle-nota" rows="3" ' +
          'placeholder="Ej: Se cambió la fuente y el equipo volvió a encender."></textarea>' +
        '<p class="campo-error"></p>' +
        '<p class="text-xs text-tenue">Queda registrado en la línea de tiempo, con tu nombre y la fecha.</p>' +
      "</div>" +
    "</div>";
  }

  /**
   * Abre la ficha.
   *
   * config = {
   *   titulo, codigo, estado, estados: {clave: etiqueta}, siguienteEstado,
   *   datos: [{etiqueta, valor, html}], descripcion, participantes, historial,
   *   puedeAvanzar, onAvanzar(estado, nota) -> Promise
   * }
   */
  function abrir(config) {
    var estados = config.estados || {};

    var cuerpo =
      '<div class="flex flex-wrap items-center gap-2">' +
        '<span class="codigo codigo-fuerte">' + utils.escapeHtml(config.codigo || "") + "</span>" +
        '<span class="insignia insignia-' + config.estado + '">' +
          utils.escapeHtml(estados[config.estado] || config.estado) + "</span>" +
      "</div>" +
      bloqueDatos(config.datos) +
      (config.descripcion
        ? '<div class="dato"><span class="dato-etiqueta">Descripción</span>' +
          '<p class="dato-valor whitespace-pre-line">' + utils.escapeHtml(config.descripcion) + "</p></div>"
        : "") +
      bloqueParticipantes(config.participantes) +
      '<div class="dato"><span class="dato-etiqueta">Línea de tiempo</span>' +
        bloqueHistorial(config.historial, estados) +
      "</div>" +
      (config.puedeAvanzar ? bloqueAvance(config) : "");

    return Eternum.components.modal.open({
      title: config.titulo || "Detalle",
      ancho: "grande",
      // Sin permiso para avanzar el estado, la ficha es solo de lectura.
      submitLabel: config.puedeAvanzar ? "Guardar avance" : null,
      bodyHtml: cuerpo,
      onSubmit: function (caja, cerrar) {
        var estado = caja.querySelector("#detalle-estado");
        var nota = caja.querySelector("#detalle-nota");
        utils.clearFormErrors(caja);

        if (!utils.validators.minLength(nota.value, 5)) {
          utils.setFieldError(nota, "Contá brevemente qué se hizo (mínimo 5 caracteres).");
          return;
        }

        var boton = caja.querySelector('[data-accion="confirmar"]');
        boton.disabled = true;
        boton.textContent = "Guardando...";

        config.onAvanzar(estado.value, nota.value.trim()).then(function () {
          cerrar();
        }).catch(function (err) {
          boton.disabled = false;
          boton.textContent = "Guardar avance";
          Eternum.components.toast.show(err.message, "error", 6000);
        });
      }
    });
  }

  return { abrir: abrir, fechaHora: fechaHora };
})();
