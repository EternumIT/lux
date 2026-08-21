/* Componentes de interfaz compartidos: preferencias, sidebar, modal, avisos. */
window.Eternum = window.Eternum || {};

Eternum.components = (function () {
  var utils = Eternum.utils;
  var PREFS_KEY = "eternum:prefs";
  var COLLAPSED_KEY = "eternum:sidebarCollapsed";

  /* ============ PREFERENCIAS (tema / fuente / contraste / dislexia) ============ */
  var preferences = (function () {
    /** Tamaños de letra disponibles. */
    var TAMANIOS = ["small", "medium", "large"];

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
      var prefs = Object.assign(getDefaults(), utils.storageGet(PREFS_KEY, null) || {});

      // El tamaño "xl" se sacó: agrandaba tanto que rompía las tablas y la
      // barra superior. A quien lo tuviera elegido se le pasa al más grande
      // de los que quedan, en vez de dejarlo en un tamaño sin botón que lo
      // represente (no podría volver atrás).
      if (TAMANIOS.indexOf(prefs.fontSize) === -1) {
        prefs.fontSize = "large";
      }

      return prefs;
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
        var oscuro = prefs.theme === "dark";
        btn.setAttribute("aria-pressed", oscuro ? "true" : "false");
        // El icono lo intercambia el CSS mirando data-theme; acá solo se
        // mantiene la etiqueta accesible al día. Escribir el contenido del
        // botón borraría los SVG que lleva dentro.
        btn.setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
      });

      utils.qsa("[data-size]").forEach(function (btn) {
        var activo = btn.getAttribute("data-size") === prefs.fontSize;
        btn.classList.toggle("activo", activo);
        // Los botones de la topbar no usan .btn-icono, se resaltan con utilidades.
        btn.classList.toggle("bg-primario-suave", activo);
        btn.classList.toggle("text-primario", activo);
        btn.classList.toggle("font-bold", activo);
      });

      // Alto contraste y OpenDyslexic usan el mismo tipo de control: un
      // interruptor de encendido/apagado.
      utils.qsa("#switch-alto-contraste").forEach(function (input) {
        input.checked = !!prefs.highContrast;
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

    function toggleHighContrast(forzar) {
      return update({ highContrast: forzar !== undefined ? forzar : !get().highContrast });
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
      utils.qsa("#switch-alto-contraste").forEach(function (input) {
        utils.on(input, "change", function () {
          toggleHighContrast(input.checked);
        });
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

    /**
     * Contraer y expandir el menú lateral.
     *
     * El estado vive en un atributo del <html> (`data-sidebar`) y todo lo
     * visual lo resuelve el CSS. El atributo ya viene puesto por el <script>
     * del <head>, que lo lee del navegador antes del primer pintado: por eso
     * al cambiar de página el menú aparece ya contraído, en vez de mostrarse
     * ancho y encogerse a la vista.
     *
     * Acá solo queda alternarlo, guardarlo y mantener al día lo que anuncian
     * los lectores de pantalla.
     */
    function initColapsar() {
      var btn = utils.qs("#btn-colapsar");
      if (!btn) return;

      var raiz = document.documentElement;

      function estaContraida() {
        return raiz.getAttribute("data-sidebar") === "contraida";
      }

      function aplicar(contraida) {
        raiz.setAttribute("data-sidebar", contraida ? "contraida" : "abierta");
        btn.setAttribute("aria-expanded", contraida ? "false" : "true");
      }

      aplicar(estaContraida());

      utils.on(btn, "click", function () {
        var contraida = !estaContraida();
        aplicar(contraida);
        utils.storageSet(COLLAPSED_KEY, contraida);
      });
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

      // El menú vive dentro del disparador, así que un clic adentro llegaría
      // hasta él y lo cerraría. Ahora que tiene controles propios (el tamaño
      // de letra), eso haría imposible usarlos: al primer clic se cerraría.
      utils.on(menu, "click", function (e) {
        e.stopPropagation();
      });

      function mostrarMenu(abrir) {
        menu.classList.toggle("hidden", !abrir);
        menu.classList.toggle("flex", abrir);
      }

      // Se pinta con lo que haya guardado, que puede ser de la sesión anterior.
      // Cuando el servidor confirma quién entró, js/app.js vuelve a llamar a
      // pintarUsuario con la respuesta real.
      pintarUsuario(Eternum.services.sesion.actual());

      var salir = menu.querySelector(".salir");
      if (salir) {
        utils.on(salir, "click", function (e) {
          e.preventDefault();
          Eternum.services.sesion.salir();
          utils.storageSet("eternum:flash", { type: "info", message: "Sesión cerrada correctamente." });
          window.location.href = salir.getAttribute("href");
        });
      }
    }

    /**
     * Escribe (o borra) el usuario de la barra superior.
     *
     * Se llama con null a propósito cuando no hay sesión confirmada: si no
     * borrara los campos, quedaría en pantalla el usuario anterior, y quien
     * entre después vería el nombre y el rol de otra persona.
     */
    function pintarUsuario(usuario) {
      var disparador = utils.qs(".topbar-usuario");
      if (!disparador) return;

      var nombre = disparador.querySelector(".usuario-nombre");
      var rol = disparador.querySelector(".usuario-rol");
      var avatar = disparador.querySelector(".usuario-avatar");

      if (nombre) nombre.textContent = usuario ? String(usuario.nombre || "").split(" ")[0] : "";
      if (rol) rol.textContent = usuario ? (usuario.rol || "") : "";
      if (avatar) avatar.textContent = usuario ? (usuario.iniciales || "") : "";
    }

    /**
     * El menú como cajón, en pantallas chicas.
     *
     * Es el mismo <aside> de siempre: no hay un menú de escritorio y otro de
     * teléfono, hay uno solo que el CSS acomoda. Acá únicamente se enciende y
     * se apaga un atributo del <html> (`data-menu`), igual que con el tema o
     * con el menú contraído.
     *
     * Ese estado NO se guarda a propósito. Contraer el menú es una preferencia
     * ("lo quiero angosto siempre"); abrir el cajón es un gesto del momento
     * ("mostrame las secciones ahora"). Si se guardara, cada pantalla nueva
     * abriría con el cajón tapando el contenido.
     */
    function initMenuMovil() {
      var raiz = document.documentElement;
      var boton = utils.qs("#btn-menu");

      function mostrar(abrir) {
        raiz.setAttribute("data-menu", abrir ? "abierto" : "cerrado");
        if (boton) boton.setAttribute("aria-expanded", abrir ? "true" : "false");
      }

      mostrar(false);

      if (boton) {
        utils.on(boton, "click", function () {
          mostrar(raiz.getAttribute("data-menu") !== "abierto");
        });
      }

      // Se cierra tocando el fondo, la cruz, o al elegir una sección: si no,
      // el cajón quedaría abierto tapando la pantalla que se acaba de pedir.
      utils.qsa("[data-cerrar-menu]").forEach(function (el) {
        utils.on(el, "click", function () { mostrar(false); });
      });
      utils.qsa(".nav-link").forEach(function (link) {
        utils.on(link, "click", function () { mostrar(false); });
      });

      utils.on(document, "keydown", function (e) {
        if (e.key === "Escape") mostrar(false);
      });

      /* Si la ventana se agranda hasta el tamaño de escritorio, el cajón deja
         de existir como tal. Sin esto el fondo oscuro se quedaría puesto. */
      if (window.matchMedia) {
        var ancho = window.matchMedia("(min-width: 48.0625rem)");
        var alCambiar = function (e) { if (e.matches) mostrar(false); };
        if (ancho.addEventListener) {
          ancho.addEventListener("change", alCambiar);
        } else if (ancho.addListener) {
          ancho.addListener(alCambiar);
        }
      }
    }

    function init() {
      marcarEnlaceActivo();
      initColapsar();
      initMenuUsuario();
      initMenuMovil();
    }

    return { init: init, pintarUsuario: pintarUsuario };
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

    /**
     * Abre un modal.
     *
     * opts.submitLabel === null deja el modal en modo lectura: no dibuja el
     * botón de confirmar y el otro pasa a decir "Cerrar". Es lo que usan las
     * fichas de detalle cuando quien mira no puede cambiar nada.
     */
    function open(opts) {
      close();

      var soloLectura = opts.submitLabel === null;

      var fondo = document.createElement("div");
      fondo.className = "modal-fondo";

      var caja = document.createElement("div");
      caja.className = "modal" + (opts.ancho === "grande" ? " modal-ancho" : "");
      caja.setAttribute("role", "dialog");
      caja.setAttribute("aria-modal", "true");

      caja.innerHTML =
        '<div class="modal-cabecera">' +
          '<h2 class="min-w-0 text-base font-bold text-texto">' + utils.escapeHtml(opts.title || "") + "</h2>" +
          '<button type="button" class="modal-cerrar btn-icono" aria-label="Cerrar">' +
            Eternum.iconos.svg("cerrar", "icono-btn") +
          "</button>" +
        "</div>" +
        '<div class="modal-cuerpo">' + (opts.bodyHtml || "") + "</div>" +
        '<div class="modal-pie">' +
          '<button type="button" class="btn-secundario" data-accion="cancelar">' +
            (soloLectura ? "Cerrar" : "Cancelar") +
          "</button>" +
          (soloLectura ? "" :
            '<button type="button" class="btn-primario" data-accion="confirmar">' +
              utils.escapeHtml(opts.submitLabel || "Guardar") +
            "</button>") +
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

      // Enganche para lo que necesite el modal ya dibujado: es donde los
      // controles compuestos (los buscadores con índice, por ejemplo) se
      // conectan a sus elementos, que hasta acá no existían.
      if (typeof opts.onAbrir === "function") {
        opts.onAbrir(caja);
      }

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
