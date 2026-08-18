/*
 * Bootstrap común a todas las páginas internas (todo excepto login).
 * Inicializa preferencias visuales, sidebar y el mensaje flash entre páginas.
 * Cada página además carga su propio script en js/pages/ para su lógica particular.
 */
(function () {
  function showFlashIfAny() {
    var utils = Eternum.utils;
    var flash = utils.storageGet("eternum:flash", null);
    if (flash) {
      utils.storageRemove("eternum:flash");
      Eternum.components.toast.show(flash.message, flash.type || "info");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    Eternum.components.preferences.init();
    Eternum.components.sidebar.init();
    showFlashIfAny();
  });
})();
