/*
 * Bootstrap común a todas las páginas internas (todo excepto login).
 * Inicializa preferencias visuales, sidebar, control de acceso y el mensaje
 * flash entre páginas. Cada página además carga su propio script en js/pages/
 * para su lógica particular.
 */
(function () {
  var utils = Eternum.utils;

  /** Páginas que solo pueden ver Root y Administrador. */
  var PAGINAS_ADMIN = ["admin", "usuarios", "permisos", "auditoria"];

  /**
   * Páginas del personal del área (Root, Administrador, Técnico).
   * El usuario final no las ve en el menú y tampoco puede entrar escribiendo
   * la dirección: se lo devuelve al inicio. Los datos, igual, los protege la
   * API por su cuenta.
   */
  var PAGINAS_PERSONAL = [
    "inventario",
    "estado",
    "prestamos",
    "nuevo-equipo",
    "nuevo-componente"
  ];

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
   * Marca el rol en el documento.
   *
   * De acá salen dos cosas: el menú lateral, que se recorta por CSS
   * (`[data-perfil="usuario"] [data-solo-personal]` en input.css), y las
   * pantallas que se dibujan distinto según quién entró.
   *
   * El atributo ya viene puesto por el <script> del <head>, que lo resuelve
   * con la sesión guardada antes del primer pintado para que el menú no
   * parpadee. Acá solo se corrige si el servidor dice otra cosa.
   */
  function marcarRol(usuario) {
    var perfil = Eternum.services.sesion.esPersonal(usuario) ? "personal" : "usuario";
    var rol = usuario ? usuario.rol : "";

    document.documentElement.setAttribute("data-perfil", perfil);
    document.body.setAttribute("data-perfil", perfil);
    document.body.setAttribute("data-rol", rol);
  }

  /**
   * Deja la pantalla mostrando a quien el servidor dice que entró.
   *
   * Es el único punto donde se aplica la sesión confirmada: la barra superior,
   * el menú y el rol del <body>. Además avisa a la pantalla que esté abierta,
   * por si muestra datos del usuario (el perfil, por ejemplo).
   */
  function aplicarSesion(usuario) {
    mostrarSeccionAdmin(Eternum.services.sesion.esAdmin(usuario));
    marcarRol(usuario);
    Eternum.components.sidebar.pintarUsuario(usuario);

    document.dispatchEvent(new CustomEvent("eternum:sesion", { detail: usuario }));
  }

  /**
   * Control de acceso del lado del navegador.
   *
   * Esto es solo comodidad visual: evita mostrar opciones que no se pueden usar.
   * La seguridad real está en el servidor, que vuelve a comprobar el rol en cada
   * endpoint (api/services/Sesion.php). Aunque alguien edite el localStorage y entre a la
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
    var esPaginaPersonal = PAGINAS_PERSONAL.indexOf(pagina) !== -1;

    // Primero se pinta con lo que haya en localStorage, para no parpadear.
    marcarRol(Eternum.services.sesion.actual());

    // Y después se confirma contra el servidor, que es lo que vale: si la
    // sesión guardada era de otra persona (o ya no existe), acá se corrige.
    return Eternum.services.sesion.verificar().then(function (usuario) {
      aplicarSesion(usuario);

      if (!usuario) {
        redirigir("/login/", "Iniciá sesión para continuar.", "aviso");
        return null;
      }

      if (esPaginaAdmin && !Eternum.services.sesion.esAdmin(usuario)) {
        redirigir(
          "/dashboard/",
          "No tenés permiso para entrar a la sección de administración.",
          "error"
        );
        return null;
      }

      if (esPaginaPersonal && !Eternum.services.sesion.esPersonal(usuario)) {
        redirigir(
          "/dashboard/",
          "Esa sección es del equipo técnico. Desde el inicio podés ver el estado de los equipos.",
          "aviso"
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
