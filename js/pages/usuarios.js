/* Sección administrativa: gestión de usuarios. */
(function () {
  var utils = Eternum.utils;

  // Quién puede gestionar a quién, qué roles se pueden asignar y cómo se
  // filtra son reglas: viven en la capa de negocio.
  var negocio = Eternum.services.usuarios;
  var ETIQUETA_ROL = negocio.ETIQUETA_ROL;
  var INSIGNIA_ROL = negocio.INSIGNIA_ROL;

  document.addEventListener("DOMContentLoaded", function () {
    var lista = utils.qs("#lista");
    if (!lista) return;

    var buscador = utils.qs("#buscador");
    var selRol = utils.qs('select[name="rol"]');
    var selEstado = utils.qs('select[name="estado"]');
    var btnNuevo = utils.qs("#btn-nuevo");

    var usuarios = [];
    var yo = null;

    function puedeGestionar(usuario) {
      return negocio.puedeGestionar(yo, usuario);
    }

    // "objetivo" es la cuenta que se está editando, o null si es una alta:
    // según cuál sea cambia qué roles se pueden elegir.
    function opcionesRol(seleccionado, objetivo) {
      return negocio.rolesAsignables(yo, objetivo).map(function (rol) {
        return '<option value="' + rol + '"' + (rol === seleccionado ? " selected" : "") + ">" +
          ETIQUETA_ROL[rol] + "</option>";
      }).join("");
    }

    function actualizarMetricas() {
      var m = negocio.metricas(usuarios);

      Object.keys(m).forEach(function (clave) {
        var el = utils.qs('[data-metrica="' + clave + '"]');
        if (el) el.textContent = m[clave];
      });
    }

    function filtrar() {
      return negocio.filtrar(usuarios, {
        texto: buscador.value,
        rol: selRol.value,
        estado: selEstado.value
      });
    }

    function render() {
      var filtrados = filtrar();

      Eternum.components.listado.render({
        contenedor: lista,
        items: filtrados,
        vacio: { icono: "usuarios", mensaje: "No se encontraron usuarios" },
        contenido: function (visibles) {
          return '<div class="flex flex-col">' + visibles.map(function (u) {
            var gestionable = puedeGestionar(u);
            var bloqueable = negocio.puedeBloquear(yo, u);
            var soyYo = Eternum.services.sesion.esUnoMismo(yo, u);

            return (
              '<article class="item-lista' + (u.bloqueado ? " opacity-60" : "") + '">' +
                '<div class="flex min-w-0 flex-1 items-center gap-4">' +
                  '<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
                       (u.bloqueado ? "bg-debil" : "bg-primario") + ' text-xs font-bold text-white">' +
                    utils.escapeHtml(u.iniciales) +
                  "</div>" +
                  '<div class="flex min-w-0 flex-col gap-1">' +
                    '<div class="item-titulo">' + utils.escapeHtml(u.nombre) +
                      ' <span class="insignia ' + INSIGNIA_ROL[u.rol] + '">' + ETIQUETA_ROL[u.rol] + "</span>" +
                      (u.bloqueado ? ' <span class="insignia insignia-baja">Bloqueado</span>' : "") +
                      (soyYo ? ' <span class="text-xs text-tenue">(vos)</span>' : "") +
                    "</div>" +
                    '<div class="item-meta">' +
                      "<span>" + Eternum.iconos.svg("cedula", "icono-meta") + " " + utils.escapeHtml(u.cedula) + "</span>" +
                      "<span>" + Eternum.iconos.svg("email", "icono-meta") + " " + utils.escapeHtml(u.email) + "</span>" +
                    "</div>" +
                  "</div>" +
                "</div>" +
                '<div class="flex shrink-0 flex-wrap items-center gap-2">' +
                  (gestionable
                    ? '<button type="button" class="btn-secundario" data-editar="' + u.id + '">Editar</button>'
                    : "") +
                  (bloqueable
                    ? '<button type="button" class="' + (u.bloqueado ? "btn-secundario" : "btn-peligro") +
                      '" data-bloqueo="' + u.id + '">' + (u.bloqueado ? "Desbloquear" : "Bloquear") + "</button>"
                    : "") +
                  (!gestionable
                    ? '<span class="text-xs text-tenue">Solo Root puede gestionarlo</span>'
                    : "") +
                  // Se dice por qué falta el botón: si no, parece que la
                  // pantalla se olvidó de dibujarlo.
                  (gestionable && !bloqueable && !soyYo && u.rol === negocio.ROL_RAIZ
                    ? '<span class="text-xs text-tenue">La cuenta Root no se bloquea</span>'
                    : "") +
                "</div>" +
              "</article>"
            );
          }).join("") + "</div>";
        }
      });
    }

    /* ---------------- Alta ---------------- */
    function abrirAlta() {
      Eternum.components.modal.open({
        title: "Nuevo usuario",
        submitLabel: "Crear usuario",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="us-nombre">Nombre completo</label>' +
            '<input type="text" id="us-nombre" class="control" placeholder="Ej: Ana Gómez">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="us-cedula">Cédula</label>' +
            '<input type="text" id="us-cedula" class="control" placeholder="Ej: 12345678" maxlength="8" inputmode="numeric">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="us-email">Email</label>' +
            '<input type="email" id="us-email" class="control" placeholder="nombre@iti.edu.uy">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="us-rol">Rol</label>' +
            '<select id="us-rol" class="control">' + opcionesRol("Docente") + "</select></div>" +
          '<div class="campo"><label class="etiqueta" for="us-password">Contraseña inicial</label>' +
            '<input type="text" id="us-password" class="control" placeholder="Mínimo 6 caracteres">' +
            '<p class="campo-error"></p></div>',
        onSubmit: function (caja, cerrar) {
          utils.clearFormErrors(caja);

          var nombre = caja.querySelector("#us-nombre");
          var cedula = caja.querySelector("#us-cedula");
          var email = caja.querySelector("#us-email");
          var password = caja.querySelector("#us-password");

          var valido = true;
          if (!utils.validators.required(nombre.value)) {
            utils.setFieldError(nombre, "El nombre es obligatorio.");
            valido = false;
          }
          if (!utils.validators.cedula(cedula.value)) {
            utils.setFieldError(cedula, "Ingresá una cédula válida (6 a 8 dígitos).");
            valido = false;
          }
          if (!utils.validators.email(email.value)) {
            utils.setFieldError(email, "Ingresá un email válido.");
            valido = false;
          }
          if (!utils.validators.minLength(password.value, 6)) {
            utils.setFieldError(password, "La contraseña debe tener al menos 6 caracteres.");
            valido = false;
          }
          if (!valido) return;

          negocio.crear({
            nombre: nombre.value.trim(),
            cedula: cedula.value.trim(),
            email: email.value.trim(),
            rol: caja.querySelector("#us-rol").value,
            password: password.value
          }).then(function (nuevo) {
            usuarios.push(nuevo);
            render();
            actualizarMetricas();
            cerrar();
            Eternum.components.toast.show("Usuario creado correctamente.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    }

    /* ---------------- Edición ---------------- */
    function abrirEdicion(usuario) {
      var soyYo = yo && String(usuario.id) === String(yo.id);

      Eternum.components.modal.open({
        title: "Editar usuario",
        submitLabel: "Guardar cambios",
        bodyHtml:
          '<div class="campo"><label class="etiqueta" for="ed-nombre">Nombre completo</label>' +
            '<input type="text" id="ed-nombre" class="control" value="' + utils.escapeHtml(usuario.nombre) + '">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="ed-email">Email</label>' +
            '<input type="email" id="ed-email" class="control" value="' + utils.escapeHtml(usuario.email) + '">' +
            '<p class="campo-error"></p></div>' +
          '<div class="campo"><label class="etiqueta" for="ed-rol">Rol</label>' +
            '<select id="ed-rol" class="control"' + (soyYo ? " disabled" : "") + ">" +
              opcionesRol(usuario.rol, usuario) + "</select>" +
            (soyYo ? '<p class="text-xs text-tenue">No podés cambiarte el rol a vos mismo.</p>' : "") +
          "</div>" +
          '<div class="campo"><label class="etiqueta" for="ed-password">Nueva contraseña</label>' +
            '<input type="text" id="ed-password" class="control" placeholder="Dejalo vacío para no cambiarla">' +
            '<p class="campo-error"></p></div>' +
          '<p class="text-xs text-tenue">La cédula (' + utils.escapeHtml(usuario.cedula) +
            ") no se puede modificar.</p>",
        onSubmit: function (caja, cerrar) {
          utils.clearFormErrors(caja);

          var nombre = caja.querySelector("#ed-nombre");
          var email = caja.querySelector("#ed-email");
          var password = caja.querySelector("#ed-password");

          var valido = true;
          if (!utils.validators.required(nombre.value)) {
            utils.setFieldError(nombre, "El nombre es obligatorio.");
            valido = false;
          }
          if (!utils.validators.email(email.value)) {
            utils.setFieldError(email, "Ingresá un email válido.");
            valido = false;
          }
          if (password.value && !utils.validators.minLength(password.value, 6)) {
            utils.setFieldError(password, "La contraseña debe tener al menos 6 caracteres.");
            valido = false;
          }
          if (!valido) return;

          var cambios = {
            nombre: nombre.value.trim(),
            email: email.value.trim()
          };
          if (!soyYo) cambios.rol = caja.querySelector("#ed-rol").value;
          if (password.value) cambios.password = password.value;

          negocio.actualizar(usuario.id, cambios).then(function (actualizado) {
            var i = usuarios.findIndex(function (u) { return String(u.id) === String(actualizado.id); });
            if (i !== -1) usuarios[i] = actualizado;
            render();
            actualizarMetricas();
            cerrar();
            Eternum.components.toast.show("Usuario actualizado.", "exito");
          }).catch(function (err) {
            Eternum.components.toast.show(err.message, "error", 6000);
          });
        }
      });
    }

    /* ---------------- Eventos ---------------- */
    utils.on(lista, "click", function (e) {
      var btnEditar = e.target.closest("[data-editar]");
      if (btnEditar) {
        var u = usuarios.find(function (x) { return String(x.id) === btnEditar.getAttribute("data-editar"); });
        if (u) abrirEdicion(u);
        return;
      }

      var btnBloqueo = e.target.closest("[data-bloqueo]");
      if (!btnBloqueo) return;

      var id = btnBloqueo.getAttribute("data-bloqueo");
      var usuario = usuarios.find(function (x) { return String(x.id) === id; });
      if (!usuario) return;

      btnBloqueo.disabled = true;
      negocio.cambiarBloqueo(id, !usuario.bloqueado).then(function (actualizado) {
        var i = usuarios.findIndex(function (x) { return String(x.id) === String(actualizado.id); });
        if (i !== -1) usuarios[i] = actualizado;
        render();
        actualizarMetricas();
        Eternum.components.toast.show(
          actualizado.bloqueado
            ? "Usuario bloqueado: ya no puede iniciar sesión."
            : "Usuario desbloqueado.",
          "exito"
        );
      }).catch(function (err) {
        btnBloqueo.disabled = false;
        Eternum.components.toast.show(err.message, "error", 6000);
      });
    });

    /** Un filtro nuevo empieza desde la primera página. */
    function renderDesdeFiltro() {
      Eternum.components.listado.reiniciar(lista);
      render();
    }

    utils.on(buscador, "input", utils.debounce(renderDesdeFiltro, 200));
    utils.on(selRol, "change", renderDesdeFiltro);
    utils.on(selEstado, "change", renderDesdeFiltro);
    utils.on(btnNuevo, "click", abrirAlta);

    /* ---------------- Carga inicial ---------------- */
    Eternum.services.sesion.verificar().then(function (usuario) {
      // Si no hay permiso, app.js ya redirige; acá solo se evita seguir.
      if (!Eternum.services.sesion.esAdmin(usuario)) return;
      yo = usuario;

      return negocio.listar().then(function (data) {
        usuarios = data;
        render();
        actualizarMetricas();
      });
    }).catch(function (err) {
      lista.innerHTML = '<p class="mensaje-vacio">' + utils.escapeHtml(err.message) + "</p>";
      Eternum.components.toast.show(err.message, "error", 8000);
    });
  });
})();
