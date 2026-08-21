/*
 * CAPA DE NEGOCIO — quién entró y qué alcance tiene.
 *
 * Las pantallas preguntan acá, nunca al almacenamiento del navegador ni a la
 * API directamente. Eso permite que el día que cambie de dónde sale la sesión
 * (o qué significa "personal del área") haya un solo lugar que tocar.
 *
 * Ojo con el alcance de esto: sirve para DIBUJAR la pantalla. Quien autoriza
 * de verdad es el servidor, que vuelve a comprobar el rol en cada operación.
 */
window.Eternum = window.Eternum || {};
Eternum.services = Eternum.services || {};

Eternum.services.sesion = (function () {
  var datos = Eternum.repositorios.auth;

  /** Roles con acceso a la sección administrativa. */
  var ROLES_ADMIN = ["Root", "Administrador"];

  /**
   * Personal del área: ve y opera todo el trabajo del sistema.
   * El resto (Docente) ve únicamente lo suyo y no entra a inventario, estado
   * de equipos ni préstamos.
   */
  var ROLES_PERSONAL = ["Root", "Administrador", "Tecnico"];

  function esAdmin(usuario) {
    return !!usuario && ROLES_ADMIN.indexOf(usuario.rol) !== -1;
  }

  function esPersonal(usuario) {
    return !!usuario && ROLES_PERSONAL.indexOf(usuario.rol) !== -1;
  }

  /** La sesión guardada: sirve para pintar sin esperar a la red. */
  function actual() {
    return datos.guardada();
  }

  /** La sesión confirmada por el servidor, que es la que vale. */
  function verificar() {
    return datos.verificar();
  }

  function entrar(cedula, password) {
    return datos.login(cedula, password);
  }

  function salir() {
    return datos.logout();
  }

  function cambiarPassword(actualPass, nueva) {
    return datos.cambiarPassword(actualPass, nueva);
  }

  /** ¿Es esta misma persona? Se compara como texto: los ids viajan así. */
  function esUnoMismo(usuario, otro) {
    return !!usuario && !!otro && String(usuario.id) === String(otro.id);
  }

  return {
    ROLES_ADMIN: ROLES_ADMIN,
    ROLES_PERSONAL: ROLES_PERSONAL,
    esAdmin: esAdmin,
    esPersonal: esPersonal,
    esUnoMismo: esUnoMismo,
    actual: actual,
    verificar: verificar,
    entrar: entrar,
    salir: salir,
    cambiarPassword: cambiarPassword
  };
})();
