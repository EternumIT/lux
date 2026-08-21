/* Lógica de la pantalla de Perfil. */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var formPass = utils.qs(".form-password");
    if (!formPass) return;

    /**
     * Vuelca los datos de la sesión en la vista.
     *
     * Se escribe siempre, también cuando no hay sesión: si no, quedarían en
     * pantalla los datos de quien entró antes, que en una pantalla de perfil
     * es lo peor que puede pasar.
     */
    function volcarSesion(sesion) {
      var textos = {
        "#nombre-grande": sesion && sesion.nombre,
        "#avatar-grande": sesion && sesion.iniciales,
        "#badge-rol": sesion && sesion.rol,
        "#email-inline": sesion && sesion.email,
        '[data-dato="nombre"]': sesion && sesion.nombre,
        '[data-dato="cedula"]': sesion && sesion.cedula,
        '[data-dato="email"]': sesion && sesion.email,
        '[data-dato="rol"]': sesion && sesion.rol
      };
      Object.keys(textos).forEach(function (sel) {
        var el = utils.qs(sel);
        if (el) el.textContent = textos[sel] || "";
      });
    }

    // Primero lo guardado, para no mostrar la pantalla vacía...
    volcarSesion(Eternum.services.sesion.actual());

    // ...y después lo que confirma el servidor, que es lo que vale.
    // El aviso lo emite js/app.js cuando termina de verificar la sesión.
    document.addEventListener("eternum:sesion", function (e) {
      volcarSesion(e.detail);
    });

    utils.on(formPass, "submit", function (e) {
      e.preventDefault();
      utils.clearFormErrors(formPass);

      var actual = utils.qs("#pass-actual", formPass);
      var nueva = utils.qs("#pass-nueva", formPass);
      var confirmar = utils.qs("#pass-confirmar", formPass);

      var valido = true;
      if (!utils.validators.required(actual.value)) {
        utils.setFieldError(actual, "Ingresá tu contraseña actual.");
        valido = false;
      }
      if (!utils.validators.minLength(nueva.value, 6)) {
        utils.setFieldError(nueva, "La nueva contraseña debe tener al menos 6 caracteres.");
        valido = false;
      }
      if (nueva.value !== confirmar.value) {
        utils.setFieldError(confirmar, "Las contraseñas no coinciden.");
        valido = false;
      }
      if (!valido) return;

      var boton = utils.qs('button[type="submit"]', formPass);
      boton.disabled = true;
      boton.textContent = "Guardando...";

      Eternum.services.sesion.cambiarPassword(actual.value, nueva.value).then(function () {
        formPass.reset();
        Eternum.components.toast.show("Listo: tu contraseña quedó actualizada.", "exito");
      }).catch(function (err) {
        // 403 es siempre la contraseña actual equivocada: el mensaje va en el
        // campo, que es donde la persona lo está por corregir.
        if (err.status === 403) {
          utils.setFieldError(actual, err.message);
        } else {
          Eternum.components.toast.show(err.message, "error", 6000);
        }
      }).then(function () {
        boton.disabled = false;
        boton.textContent = "Actualizar contraseña";
      });
    });
  });
})();
