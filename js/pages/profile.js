/* Lógica de la pantalla de Perfil. */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var formPass = utils.qs(".form-password");
    if (!formPass) return;

    // Vuelca los datos de la sesión activa en la vista.
    var sesion = Eternum.services.auth.getSession();
    if (sesion) {
      var textos = {
        "#nombre-grande": sesion.nombre,
        "#avatar-grande": sesion.iniciales,
        "#badge-rol": sesion.rol,
        "#email-inline": sesion.email,
        '[data-dato="nombre"]': sesion.nombre,
        '[data-dato="cedula"]': sesion.cedula,
        '[data-dato="email"]': sesion.email,
        '[data-dato="rol"]': sesion.rol
      };
      Object.keys(textos).forEach(function (sel) {
        var el = utils.qs(sel);
        if (el && textos[sel]) el.textContent = textos[sel];
      });
    }

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

      // NOTA: el cambio de contraseña todavía no tiene endpoint en la API.
      // Falta agregar PATCH /usuarios/{id}/password en api/controllers/auth.php.
      formPass.reset();
      Eternum.components.toast.show(
        "Validación correcta. Falta conectar el endpoint de cambio de contraseña.",
        "aviso",
        5000
      );
    });
  });
})();
