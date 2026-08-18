/* Lógica del formulario "Nuevo equipo". */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var form = utils.qs(".formulario");
    if (!form || !utils.qs("#tipo", form)) return;

    var errorGlobal = utils.qs(".error-global", form);

    utils.on(form, "submit", function (e) {
      e.preventDefault();
      utils.clearFormErrors(form);
      if (errorGlobal) errorGlobal.classList.remove("visible");

      var marca = utils.qs("#marca", form);
      var modelo = utils.qs("#modelo-equipo", form);
      var serie = utils.qs("#serie-equipo", form);

      var valido = true;
      [marca, modelo, serie].forEach(function (input) {
        if (!utils.validators.required(input.value)) {
          utils.setFieldError(input, "Este campo es obligatorio.");
          valido = false;
        }
      });
      if (!valido) return;

      var btn = utils.qs('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = "Guardando...";

      Eternum.services.inventario.createEquipo({
        tipo: utils.qs("#tipo", form).value,
        ubicacion: utils.qs("#ubicacion", form).value,
        marca: marca.value.trim(),
        modelo: modelo.value.trim(),
        serie: serie.value.trim(),
        partNumber: utils.qs("#part-number-equipo", form).value.trim(),
        fallas: utils.qs("#fallas", form).value.trim()
      }).then(function () {
        utils.storageSet("eternum:flash", { type: "exito", message: "Equipo agregado al inventario." });
        window.location.href = "../inventario/inventario.html";
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = "Guardar";
        if (errorGlobal) {
          errorGlobal.textContent = err.message;
          errorGlobal.classList.add("visible");
        }
      });
    });
  });
})();
