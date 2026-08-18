/* Utilidades generales compartidas por toda la aplicación. */
window.Eternum = window.Eternum || {};

Eternum.utils = (function () {
  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function qsa(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function on(el, evt, handler, opts) {
    if (el) el.addEventListener(evt, handler, opts);
  }

  function debounce(fn, wait) {
    wait = wait || 250;
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function formatDate(iso, opts) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-UY", opts || { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value === null || value === undefined ? "" : String(value);
    return div.innerHTML;
  }

  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* almacenamiento no disponible (modo privado, cuota excedida, etc.) */
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* noop */
    }
  }

  function mockDelay(value, ms) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(value);
      }, ms === undefined ? 220 : ms);
    });
  }

  /* ---------- Validación de formularios ---------- */
  var validators = {
    required: function (value) {
      return value !== undefined && value !== null && String(value).trim() !== "";
    },
    minLength: function (value, min) {
      return String(value || "").trim().length >= min;
    },
    cedula: function (value) {
      return /^[0-9]{6,8}$/.test(String(value || "").trim());
    },
    email: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    }
  };

  function setFieldError(input, message) {
    if (!input) return;
    var campo = input.closest(".campo");
    if (!campo) return;
    campo.classList.add("invalido");
    var errorEl = campo.querySelector(".campo-error");
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "campo-error";
      campo.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  function clearFieldError(input) {
    if (!input) return;
    var campo = input.closest(".campo");
    if (!campo) return;
    campo.classList.remove("invalido");
  }

  function clearFormErrors(form) {
    if (!form) return;
    qsa(".campo.invalido", form).forEach(function (campo) {
      campo.classList.remove("invalido");
    });
  }

  return {
    qs: qs,
    qsa: qsa,
    on: on,
    debounce: debounce,
    uid: uid,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    storageGet: storageGet,
    storageSet: storageSet,
    storageRemove: storageRemove,
    mockDelay: mockDelay,
    validators: validators,
    setFieldError: setFieldError,
    clearFieldError: clearFieldError,
    clearFormErrors: clearFormErrors
  };
})();
