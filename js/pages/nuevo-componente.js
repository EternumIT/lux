/* Lógica del formulario "Nuevo componente". */
(function () {
  var utils = Eternum.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var form = utils.qs(".formulario");
    if (!form || !utils.qs("#nombre-componente", form)) return;

    var errorGlobal = utils.qs(".error-global", form);

    utils.on(form, "submit", function (e) {
      e.preventDefault();
      utils.clearFormErrors(form);
      if (errorGlobal) errorGlobal.classList.remove("visible");

      var nombre = utils.qs("#nombre-componente", form);
      var modelo = utils.qs("#modelo", form);
      var fabricante = utils.qs("#fabricante", form);

      var valido = true;
      [nombre, modelo, fabricante].forEach(function (input) {
        if (!utils.validators.required(input.value)) {
          utils.setFieldError(input, "Este campo es obligatorio.");
          valido = false;
        }
      });
      if (!valido) return;

      var btn = utils.qs('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = "Guardando...";

      Eternum.services.inventario.createComponente({
        nombre: nombre.value.trim(),
        modelo: modelo.value.trim(),
        fabricante: fabricante.value.trim(),
        serie: utils.qs("#serie", form).value.trim(),
        partNumber: utils.qs("#part-number", form).value.trim(),
        esFabrica: utils.qs('[name="es_fabrica"]', form).checked,
        funcionando: utils.qs('[name="funcionando"]', form).checked
      }).then(function () {
        utils.storageSet("eternum:flash", { type: "exito", message: "Componente agregado al inventario." });
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
