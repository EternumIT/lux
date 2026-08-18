/* Componentes de interfaz compartidos: preferencias, sidebar, modal, avisos. */
window.Eternum = window.Eternum || {};

Eternum.components = (function () {
  var utils = Eternum.utils;
  var PREFS_KEY = "eternum:prefs";
  var COLLAPSED_KEY = "eternum:sidebarCollapsed";

  /* ============ PREFERENCIAS (tema / fuente / contraste / dislexia) ============ */
  var preferences = (function () {
    function getDefaults() {
      var prefiereOscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return {
        theme: prefiereOscuro ? "dark" : "light",
        fontSize: "medium",
        highContrast: false,
        dyslexic: false
      };
    }

    function get() {
      return Object.assign(getDefaults(), utils.storageGet(PREFS_KEY, null) || {});
    }

    function apply(prefs) {
      var root = document.documentElement;
      root.setAttribute("data-theme", prefs.theme);
      root.setAttribute("data-font-size", prefs.fontSize);
      root.setAttribute("data-contrast", prefs.highContrast ? "high" : "normal");
      root.setAttribute("data-dyslexic", prefs.dyslexic ? "true" : "false");
      syncControls(prefs);
    }

    /** Refleja el estado actual en todos los controles visibles. */
    function syncControls(prefs) {
      utils.qsa(".ctrl-tema").forEach(function (btn) {
        btn.setAttribute("aria-pressed", prefs.theme === "dark" ? "true" : "false");
        btn.textContent = prefs.theme === "dark" ? "☀" : "🌙";
      });

      utils.qsa("[data-size]").forEach(function (btn) {
        var activo = btn.getAttribute("data-size") === prefs.fontSize;
        btn.classList.toggle("activo", activo);
        // Los botones de la topbar no usan .btn-icono, se resaltan con utilidades.
        btn.classList.toggle("bg-primario-suave", activo);
        btn.classList.toggle("text-primario", activo);
        btn.classList.toggle("font-bold", activo);
      });

      utils.qsa("#btn-alto-contraste").forEach(function (btn) {
        btn.setAttribute("aria-pressed", prefs.highContrast ? "true" : "false");
        btn.classList.toggle("activo", prefs.highContrast);
      });

      utils.qsa("#switch-opendyslexic").forEach(function (input) {
        input.checked = !!prefs.dyslexic;
      });
    }

    function update(parcial) {
      var prefs = Object.assign(get(), parcial);
      utils.storageSet(PREFS_KEY, prefs);
      apply(prefs);
      return prefs;
    }

    function toggleTheme() {
      return update({ theme: get().theme === "dark" ? "light" : "dark" });
    }

    function setFontSize(size) {
      return update({ fontSize: size });
    }

    function toggleHighContrast() {
      return update({ highContrast: !get().highContrast });
    }

    function toggleDyslexic(forzar) {
      return update({ dyslexic: forzar !== undefined ? forzar : !get().dyslexic });
    }

    function init() {
      apply(get());

      utils.qsa(".ctrl-tema").forEach(function (btn) {
        utils.on(btn, "click", toggleTheme);
      });
      utils.qsa("[data-size]").forEach(function (btn) {
        utils.on(btn, "click", function () {
          setFontSize(btn.getAttribute("data-size"));
        });
      });
      utils.qsa("#btn-alto-contraste").forEach(function (btn) {
        utils.on(btn, "click", toggleHighContrast);
      });
      utils.qsa("#switch-opendyslexic").forEach(function (input) {
        utils.on(input, "change", function () {
          toggleDyslexic(input.checked);
        });
      });
    }

    return {
      init: init, get: get, update: update,
      toggleTheme: toggleTheme, setFontSize: setFontSize,
      toggleHighContrast: toggleHighContrast, toggleDyslexic: toggleDyslexic
    };
  })();

  /* ============ SIDEBAR ============ */
  var sidebar = (function () {
    /** Marca el enlace de la sección actual según data-page del <body>. */
    function marcarEnlaceActivo() {
      var pagina = document.body.getAttribute("data-page");
      if (!pagina) return;

      utils.qsa(".nav-link").forEach(function (link) {
        var esActivo = link.getAttribute("data-page") === pagina;
        link.classList.toggle("activo", esActivo);
        if (esActivo) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    function initColapsar() {
      var barra = utils.qs("#sidebar");
      var btn = utils.qs("#btn-colapsar");
      if (!barra || !btn) return;

      aplicar(utils.storageGet(COLLAPSED_KEY, false));

      utils.on(btn, "click", function () {
        var contraida = !barra.classList.contains("contraida");
        aplicar(contraida);
        utils.storageSet(COLLAPSED_KEY, contraida);
      });

      function aplicar(contraida) {
        barra.classList.toggle("contraida", contraida);
        btn.setAttribute("aria-expanded", contraida ? "false" : "true");

        var texto = btn.querySelector(".btn-colapsar-texto");
        if (texto) texto.classList.toggle("hidden", contraida);

        var icono = btn.querySelector("[data-icono-colapsar]");
        if (icono) icono.classList.toggle("rotate-180", contraida);
      }
    }

    function initMenuUsuario() {
      var disparador = utils.qs(".topbar-usuario");
      if (!disparador) return;

      var menu = disparador.querySelector(".usuario-menu");
      if (!menu) return;

      utils.on(disparador, "click", function (e) {
        e.stopPropagation();
        var abierto = !menu.classList.contains("hidden");
        mostrarMenu(!abierto);
      });
      utils.on(document, "click", function () {
        mostrarMenu(false);
      });

      function mostrarMenu(abrir) {
        menu.classList.toggle("hidden", !abrir);
        menu.classList.toggle("flex", abrir);
      }

      // Refleja el usuario de la sesión activa en la barra superior.
      var sesion = Eternum.services.auth.getSession();
      if (sesion) {
        var nombre = disparador.querySelector(".usuario-nombre");
        var rol = disparador.querySelector(".usuario-rol");
        var avatar = disparador.querySelector(".usuario-avatar");
        if (nombre) nombre.textContent = String(sesion.nombre || "").split(" ")[0];
        if (rol) rol.textContent = sesion.rol || "";
        if (avatar) avatar.textContent = sesion.iniciales || "";
      }

      var salir = menu.querySelector(".salir");
      if (salir) {
        utils.on(salir, "click", function (e) {
          e.preventDefault();
          Eternum.services.auth.logout();
          utils.storageSet("eternum:flash", { type: "info", message: "Sesión cerrada correctamente." });
          window.location.href = salir.getAttribute("href");
        });
      }
    }

    function init() {
      marcarEnlaceActivo();
      initColapsar();
      initMenuUsuario();
    }

    return { init: init };
  })();

  /* ============ MODAL ============ */
  var modal = (function () {
    var actual = null;

    function close() {
      if (!actual) return;
      actual.fondo.remove();
      document.removeEventListener("keydown", onKeydown);
      actual = null;
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    function open(opts) {
      close();

      var fondo = document.createElement("div");
      fondo.className = "modal-fondo";

      var caja = document.createElement("div");
      caja.className = "modal";
      caja.setAttribute("role", "dialog");
      caja.setAttribute("aria-modal", "true");

      caja.innerHTML =
        '<div class="modal-cabecera">' +
          '<h2 class="text-base font-bold text-texto">' + utils.escapeHtml(opts.title || "") + "</h2>" +
          '<button type="button" class="modal-cerrar btn-icono" aria-label="Cerrar">✕</button>' +
        "</div>" +
        '<div class="modal-cuerpo">' + (opts.bodyHtml || "") + "</div>" +
        '<div class="modal-pie">' +
          '<button type="button" class="btn-secundario" data-accion="cancelar">Cancelar</button>' +
          '<button type="button" class="btn-primario" data-accion="confirmar">' +
            utils.escapeHtml(opts.submitLabel || "Guardar") +
          "</button>" +
        "</div>";

      fondo.appendChild(caja);
      document.body.appendChild(fondo);
      actual = { fondo: fondo, caja: caja };

      utils.on(fondo, "click", function (e) {
        if (e.target === fondo) close();
      });
      utils.on(caja.querySelector(".modal-cerrar"), "click", close);
      utils.on(caja.querySelector('[data-accion="cancelar"]'), "click", close);
      utils.on(caja.querySelector('[data-accion="confirmar"]'), "click", function () {
        if (typeof opts.onSubmit === "function") {
          opts.onSubmit(caja, close);
        } else {
          close();
        }
      });

      document.addEventListener("keydown", onKeydown);

      var primerCampo = caja.querySelector("input, select, textarea");
      if (primerCampo) primerCampo.focus();

      return { box: caja, close: close };
    }

    return { open: open, close: close };
  })();

  /* ============ AVISOS FLOTANTES (toasts) ============ */
  var toast = (function () {
    function contenedor() {
      var el = utils.qs("#contenedor-avisos");
      if (!el) {
        el = document.createElement("div");
        el.id = "contenedor-avisos";
        el.className = "contenedor-avisos";
        document.body.appendChild(el);
      }
      return el;
    }

    function show(mensaje, tipo, duracion) {
      tipo = tipo || "info";
      duracion = duracion === undefined ? 3200 : duracion;

      var el = document.createElement("div");
      el.className = "aviso " + (tipo === "aviso" ? "aviso-atencion" : tipo);
      el.setAttribute("role", "status");
      el.textContent = mensaje;
      contenedor().appendChild(el);

      setTimeout(function () {
        el.classList.add("saliendo");
        setTimeout(function () { el.remove(); }, 200);
      }, duracion);
    }

    return { show: show };
  })();

  return { preferences: preferences, sidebar: sidebar, modal: modal, toast: toast };
})();
