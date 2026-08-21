/*
 * CAPA DE NEGOCIO — reglas de los tickets.
 *
 * Acá viven las decisiones que antes estaban repartidas por la pantalla: qué
 * estados existen y cómo se llaman, cuál sigue a cuál, quién puede moverlos y
 * por qué campos se busca. La pantalla queda solo con el dibujo.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.tickets = (function () {
  var datos = Eternum.repositorios.tickets;
  var sesion = Eternum.services.sesion;

  /** Estados con su etiqueta para la pantalla. */
  var ESTADOS = {
    pendiente: "Pendiente",
    en_progreso: "En progreso",
    en_resolucion: "En resolución",
    resuelto: "Resuelto"
  };

  /** El camino normal de un ticket, de abierto a cerrado. */
  var ORDEN = ["pendiente", "en_progreso", "en_resolucion", "resuelto"];

  /** Largo mínimo de la nota, el mismo que exige el servidor. */
  var NOTA_MINIMA = 5;

  function siguienteEstado(estado) {
    return ORDEN[Math.min(ORDEN.indexOf(estado) + 1, ORDEN.length - 1)];
  }

  function estaCerrado(ticket) {
    return ticket.estado === "resuelto";
  }

  /** Solo el personal del área mueve el estado, y nunca uno ya resuelto. */
  function puedeAvanzar(usuario, ticket) {
    return sesion.esPersonal(usuario) && !estaCerrado(ticket);
  }

  /** ¿Esta persona puede cambiar estados en general? (para armar la ficha) */
  function puedeGestionar(usuario) {
    return sesion.esPersonal(usuario);
  }

  /**
   * Filtra por texto y estado.
   * La búsqueda mira el código, el título, el solicitante y el equipo: son los
   * cuatro datos por los que alguien busca un ticket que ya conoce.
   */
  function filtrar(tickets, filtros) {
    var texto = (filtros.texto || "").toLowerCase().trim();
    var estado = filtros.estado || "";

    return tickets.filter(function (t) {
      var coincideTexto = !texto ||
        (t.codigo + " " + t.titulo + " " + t.solicitante + " " + (t.equipoCodigo || ""))
          .toLowerCase().indexOf(texto) !== -1;

      return coincideTexto && (!estado || t.estado === estado);
    });
  }

  /** ¿La nota alcanza para registrar el avance? */
  function notaValida(nota) {
    return String(nota || "").trim().length >= NOTA_MINIMA;
  }

  /* ----- Operaciones (delegan en la capa de datos) ----- */

  function listar() {
    return datos.listar();
  }

  function detalle(id) {
    return datos.porId(id);
  }

  function crear(datosTicket) {
    return datos.crear(datosTicket);
  }

  function avanzar(id, estado, nota) {
    return datos.cambiarEstado(id, estado, nota);
  }

  return {
    ESTADOS: ESTADOS,
    ORDEN: ORDEN,
    NOTA_MINIMA: NOTA_MINIMA,
    siguienteEstado: siguienteEstado,
    estaCerrado: estaCerrado,
    puedeAvanzar: puedeAvanzar,
    puedeGestionar: puedeGestionar,
    filtrar: filtrar,
    notaValida: notaValida,
    listar: listar,
    detalle: detalle,
    crear: crear,
    avanzar: avanzar
  };
})();
