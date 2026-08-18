/*
 * Bootstrap común a todas las páginas internas (todo excepto login).
 * Inicializa preferencias visuales, sidebar, control de acceso y el mensaje
 * flash entre páginas. Cada página además carga su propio script en js/pages/
 * para su lógica particular.
 */
(function () {
  var utils = Eternum.utils;

  /** Páginas que solo pueden ver Root y Administrador. */
  var PAGINAS_ADMIN = ["administracion", "usuarios", "permisos", "auditoria"];

  /** Páginas que se ven sin sesión iniciada. */
  var PAGINAS_PUBLICAS = ["login"];

  function mostrarFlashSiHay() {
    var flash = utils.storageGet("eternum:flash", null);
    if (flash) {
      utils.storageRemove("eternum:flash");
      Eternum.components.toast.show(flash.message, flash.type || "info");
    }
  }

  /**
   * Redirige dejando un mensaje para la pantalla de destino.
   * Si ya se está en esa página no hace nada: es la red de seguridad contra
   * bucles de redirección, que en la práctica se ven como la pestaña
   * recargándose sin parar.
   */
  function redirigir(destino, mensaje, tipo) {
    var actual = window.location.pathname.split("/").pop();
    if (actual === destino.split("/").pop()) return;

    utils.storageSet("eternum:flash", { type: tipo || "aviso", message: mensaje });
    window.location.replace(destino);
  }

  /**
   * Muestra u oculta el acceso a Administración, que vive en el menú del
   * usuario (arriba a la derecha), igual que "Ver perfil".
   */
  function mostrarSeccionAdmin(visible) {
    utils.qsa(".enlace-admin").forEach(function (enlace) {
      enlace.classList.toggle("hidden", !visible);
      enlace.classList.toggle("flex", visible);
    });
  }

  /**
   * Control de acceso del lado del navegador.
   *
   * Esto es solo comodidad visual: evita mostrar opciones que no se pueden usar.
   * La seguridad real está en el servidor, que vuelve a comprobar el rol en cada
   * endpoint (api/sesion.php). Aunque alguien edite el localStorage y entre a la
   * página a mano, la API le va a responder 403 y no verá ningún dato.
   */
  function aplicarControlDeAcceso() {
    var pagina = document.body.getAttribute("data-page");

    // El login es público y no se comprueba. Sin esta salida se entra en un
    // bucle: la comprobación falla, redirige al login, y ahí vuelve a fallar.
    if (PAGINAS_PUBLICAS.indexOf(pagina) !== -1) {
      return Promise.resolve(null);
    }

    var esPaginaAdmin = PAGINAS_ADMIN.indexOf(pagina) !== -1;

    // Primero se pinta con lo que haya en localStorage, para no parpadear.
    var sesionLocal = Eternum.services.auth.getSession();
    mostrarSeccionAdmin(Eternum.services.esAdmin(sesionLocal));

    // Y después se confirma contra el servidor.
    return Eternum.services.auth.verificarSesion().then(function (usuario) {
      var admin = Eternum.services.esAdmin(usuario);
      mostrarSeccionAdmin(admin);

      if (!usuario) {
        redirigir("../auth/login.html", "Iniciá sesión para continuar.", "aviso");
        return null;
      }

      if (esPaginaAdmin && !admin) {
        redirigir(
          "../dashboard/dashboard.html",
          "No tenés permiso para entrar a la sección de administración.",
          "error"
        );
        return null;
      }

      return usuario;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    Eternum.components.preferences.init();
    Eternum.components.sidebar.init();
    mostrarFlashSiHay();
    aplicarControlDeAcceso();

    // Recién ahora se habilitan las transiciones de color (ver input.css).
    // Antes de este punto un cambio de tema se vería como un fundido raro
    // durante la carga; después, hace que el botón de tema se sienta suave.
    document.documentElement.setAttribute("data-listo", "true");
  });
})();
