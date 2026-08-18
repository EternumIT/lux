/* Lógica de la pantalla de inicio de sesión. */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var form = utils.qs(".login-form");
    if (!form) return;

    var cedula = utils.qs("#cedula", form);
    var pass = utils.qs("#contrasena", form);
    var toggle = utils.qs("#toggle-password", form);
    var errorGlobal = utils.qs(".error-global", form);
    var submit = utils.qs(".btn-ingresar", form);

    utils.on(toggle, "click", function () {
      var visible = pass.type === "text";
      pass.type = visible ? "password" : "text";
      toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
      toggle.setAttribute("aria-pressed", visible ? "false" : "true");
      // La clase decide cuál de los dos iconos se ve (ver assets/css/input.css).
      toggle.classList.toggle("mostrando", !visible);
      toggle.classList.toggle("text-primario", !visible);
    });

    function mostrarError(mensaje) {
      if (!errorGlobal) return;
      errorGlobal.textContent = mensaje || "";
      errorGlobal.classList.toggle("visible", !!mensaje);
    }

    utils.on(form, "submit", function (e) {
      e.preventDefault();
      mostrarError("");
      utils.clearFormErrors(form);

      var valido = true;
      if (!utils.validators.cedula(cedula.value)) {
        utils.setFieldError(cedula, "Ingresá un número de cédula válido (6 a 8 dígitos).");
        valido = false;
      }
      if (!utils.validators.required(pass.value)) {
        utils.setFieldError(pass, "La contraseña es obligatoria.");
        valido = false;
      }
      if (!valido) return;

      submit.disabled = true;
      submit.textContent = "Ingresando...";

      Eternum.services.auth.login(cedula.value.trim(), pass.value)
        .then(function () {
          utils.storageSet("eternum:flash", { type: "exito", message: "¡Bienvenido/a de nuevo!" });
          window.location.href = "../dashboard/dashboard.html";
        })
        .catch(function (err) {
          mostrarError(err.message || "No se pudo iniciar sesión.");
          submit.disabled = false;
          submit.textContent = "Ingresar";
        });
    });
  });
})();
