/*
 * CAPA DE NEGOCIO — reglas de la gestión de usuarios.
 *
 * Estas reglas son las mismas que aplica el servidor (api/services/
 * ServicioUsuarios.php). Acá están para poder dibujar la pantalla: ocultar el
 * botón que igual iba a dar 403 es mejor que ofrecerlo y que falle. Quien
 * autoriza sigue siendo el servidor.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.usuarios = (function () {
  var datos = Eternum.repositorios.usuarios;
  var sesion = Eternum.services.sesion;

  var ROLES = ["Root", "Administrador", "Tecnico", "Docente"];

  var ETIQUETA_ROL = {
    Root: "Root",
    Administrador: "Administrador",
    Tecnico: "Técnico",
    Docente: "Docente"
  };

  // Se reutilizan las insignias de estado que ya existen para el resto del sistema.
  var INSIGNIA_ROL = {
    Root: "insignia-vencido",
    Administrador: "insignia-en_progreso",
    Tecnico: "insignia-en_resolucion",
    Docente: "insignia-resuelto"
  };

  /** Cuentas que solo un Root puede crear o modificar. */
  var ROLES_PRIVILEGIADOS = ["Root", "Administrador"];

  /**
   * La cuenta de origen: única, no se crea otra y no se bloquea.
   * El servidor lo rechaza igual (Permisos::ROL_RAIZ); acá es para no
   * ofrecer un botón ni una opción que iba a terminar en un error.
   */
  var ROL_RAIZ = "Root";

  /** Solo Root puede tocar cuentas Root y Administrador. */
  function puedeGestionar(actor, objetivo) {
    if (!actor) return false;
    if (actor.rol === "Root") return true;

    return ROLES_PRIVILEGIADOS.indexOf(objetivo.rol) === -1;
  }

  /**
   * Qué roles puede asignar quien está gestionando.
   *
   * Root nunca está en la lista: no se crea otra cuenta Root ni se asciende a
   * nadie. La excepción es editar a un Root que ya existe, donde tiene que
   * seguir apareciendo su rol actual; si no, el desplegable arrancaría en otra
   * opción y guardar sin tocar nada lo degradaría sin querer.
   */
  function rolesAsignables(actor, objetivo) {
    var asignables = actor && actor.rol === ROL_RAIZ
      ? ["Administrador", "Tecnico", "Docente"]
      : ["Tecnico", "Docente"];

    if (objetivo && objetivo.rol === ROL_RAIZ) {
      return [ROL_RAIZ].concat(asignables);
    }

    return asignables;
  }

  /**
   * Nadie se bloquea a sí mismo ni bloquea la cuenta de origen, ni siendo Root.
   * Desbloquearla sí se ofrece: es la salida si quedó bloqueada desde la base.
   */
  function puedeBloquear(actor, objetivo) {
    if (objetivo.rol === ROL_RAIZ && !objetivo.bloqueado) return false;

    return puedeGestionar(actor, objetivo) && !sesion.esUnoMismo(actor, objetivo);
  }

  function filtrar(usuarios, filtros) {
    var texto = (filtros.texto || "").toLowerCase().trim();
    var rol = filtros.rol || "";
    var estado = filtros.estado || "";

    return usuarios.filter(function (u) {
      var coincideTexto = !texto ||
        (u.nombre + " " + u.cedula + " " + u.email).toLowerCase().indexOf(texto) !== -1;

      var coincideEstado = !estado || (estado === "bloqueado" ? u.bloqueado : !u.bloqueado);

      return coincideTexto && (!rol || u.rol === rol) && coincideEstado;
    });
  }

  /** Los números de la cabecera de la pantalla. */
  function metricas(usuarios) {
    return {
      total: usuarios.length,
      activos: usuarios.filter(function (u) { return !u.bloqueado; }).length,
      bloqueados: usuarios.filter(function (u) { return u.bloqueado; }).length,
      admins: usuarios.filter(function (u) {
        return ROLES_PRIVILEGIADOS.indexOf(u.rol) !== -1;
      }).length
    };
  }

  return {
    ROLES: ROLES,
    ROL_RAIZ: ROL_RAIZ,
    ETIQUETA_ROL: ETIQUETA_ROL,
    INSIGNIA_ROL: INSIGNIA_ROL,
    puedeGestionar: puedeGestionar,
    puedeBloquear: puedeBloquear,
    rolesAsignables: rolesAsignables,
    filtrar: filtrar,
    metricas: metricas,
    listar: function () { return datos.listar(); },
    crear: function (datosUsuario) { return datos.crear(datosUsuario); },
    actualizar: function (id, cambios) { return datos.actualizar(id, cambios); },
    cambiarBloqueo: function (id, bloqueado) { return datos.cambiarBloqueo(id, bloqueado); },
    directorio: function () { return datos.directorio(); }
  };
})();
