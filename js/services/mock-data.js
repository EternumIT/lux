/*
 * Datos de ejemplo (mock) usados mientras no hay backend conectado.
 * Cada colección se persiste en localStorage bajo el prefijo "eternum:" para
 * que los cambios (altas, edición de estado, etc.) sobrevivan a un refresh.
 * Cuando exista una API real, basta con reemplazar la lectura/escritura de
 * este archivo por llamadas a `Eternum.services.apiClient` en services.js.
 */
window.Eternum = window.Eternum || {};

Eternum.mockData = (function () {
  var utils = Eternum.utils;
  var PREFIX = "eternum:";

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function daysFromNow(n) {
    return daysAgo(-n);
  }

  var seeds = {
    usuarios: [
      { id: "u1", cedula: "12345678", nombre: "Marcela Rodríguez", email: "mrodriguez@iti.edu.uy", rol: "Administrador", iniciales: "MR" },
      { id: "u2", cedula: "87654321", nombre: "Julián Pérez", email: "jperez@iti.edu.uy", rol: "Técnico", iniciales: "JP" },
      { id: "u3", cedula: "11223344", nombre: "Ana Gómez", email: "agomez@iti.edu.uy", rol: "Docente", iniciales: "AG" }
    ],
    equipos: [
      { id: "eq1", tipo: "Desktop", ubicacion: "Laboratorio 1", marca: "Dell", modelo: "OptiPlex 3080", serie: "SN-88213", partNumber: "OP3080", estado: "operativo", fallas: "", creado: "2026-06-02" },
      { id: "eq2", tipo: "Laptop", ubicacion: "Administración", marca: "Lenovo", modelo: "ThinkPad E14", serie: "SN-40221", partNumber: "TPE14", estado: "operativo", fallas: "", creado: "2026-06-10" },
      { id: "eq3", tipo: "Proyector", ubicacion: "Salones", marca: "Epson", modelo: "PowerLite X49", serie: "SN-77120", partNumber: "PLX49", estado: "reparacion", fallas: "No enciende la lámpara", creado: "2026-05-20" },
      { id: "eq4", tipo: "AIO", ubicacion: "Laboratorio 2", marca: "HP", modelo: "ProOne 440", serie: "SN-55871", partNumber: "PO440", estado: "operativo", fallas: "", creado: "2026-04-15" },
      { id: "eq5", tipo: "Impresora", ubicacion: "Administración", marca: "Brother", modelo: "HL-L2390DW", serie: "SN-99012", partNumber: "HLL2390", estado: "baja", fallas: "Rodillo dañado, fuera de servicio", creado: "2026-03-01" },
      { id: "eq6", tipo: "Desktop", ubicacion: "Laboratorio 1", marca: "Dell", modelo: "OptiPlex 3080", serie: "SN-88214", partNumber: "OP3080", estado: "operativo", fallas: "", creado: "2026-06-02" },
      { id: "eq7", tipo: "Laptop", ubicacion: "Otros", marca: "Acer", modelo: "Aspire 5", serie: "SN-12309", partNumber: "AS5", estado: "operativo", fallas: "", creado: "2026-07-01" }
    ],
    componentes: [
      { id: "co1", nombre: "Memoria RAM", modelo: "8GB DDR4", fabricante: "Kingston", serie: "KS-2201", partNumber: "KVR26N19S8", esFabrica: true, funcionando: true, creado: "2026-06-02" },
      { id: "co2", nombre: "Disco SSD", modelo: "480GB", fabricante: "Kingston", serie: "KS-5541", partNumber: "A400", esFabrica: false, funcionando: true, creado: "2026-06-11" },
      { id: "co3", nombre: "Fuente de poder", modelo: "500W", fabricante: "EVGA", serie: "EV-9081", partNumber: "500W1", esFabrica: true, funcionando: false, creado: "2026-05-18" }
    ],
    tickets: [
      { id: "tk1", titulo: "PC no enciende", descripcion: "El equipo del laboratorio 1 no enciende tras corte de luz.", equipoId: "eq1", solicitante: "Ana Gómez", estado: "pendiente", creado: daysAgo(1) },
      { id: "tk2", titulo: "Proyector sin imagen", descripcion: "El proyector del salón 4 no muestra imagen.", equipoId: "eq3", solicitante: "Julián Pérez", estado: "en_progreso", creado: daysAgo(2) },
      { id: "tk3", titulo: "Impresora atascada", descripcion: "Se atascan las hojas al imprimir.", equipoId: "eq5", solicitante: "Marcela Rodríguez", estado: "en_resolucion", creado: daysAgo(4) },
      { id: "tk4", titulo: "Actualizar antivirus", descripcion: "Solicitud de actualización en equipos de administración.", equipoId: "eq2", solicitante: "Marcela Rodríguez", estado: "resuelto", creado: daysAgo(6) },
      { id: "tk5", titulo: "Mouse no responde", descripcion: "Mouse óptico del laboratorio 2 no responde.", equipoId: "eq4", solicitante: "Ana Gómez", estado: "resuelto", creado: daysAgo(9) }
    ],
    prestamos: [
      { id: "pr1", equipoId: "eq7", solicitante: "Ana Gómez", fechaInicio: daysAgo(5), fechaLimite: daysFromNow(10), estado: "activo" },
      { id: "pr2", equipoId: "eq2", solicitante: "Julián Pérez", fechaInicio: daysAgo(30), fechaLimite: daysAgo(15), estado: "vencido" },
      { id: "pr3", equipoId: "eq4", solicitante: "Marcela Rodríguez", fechaInicio: daysAgo(60), fechaLimite: daysAgo(45), estado: "devuelto" }
    ],
    solicitudes: [
      { id: "so1", titulo: "Solicitud de 2 laptops", detalle: "Para taller de robótica de 3er año.", solicitante: "Ana Gómez", estado: "pendiente", creado: daysAgo(2) },
      { id: "so2", titulo: "Instalación de software", detalle: "Instalar suite de diseño en laboratorio 2.", solicitante: "Julián Pérez", estado: "en_progreso", creado: daysAgo(3) },
      { id: "so3", titulo: "Mantenimiento preventivo", detalle: "Limpieza general de equipos de administración.", solicitante: "Marcela Rodríguez", estado: "completado", creado: daysAgo(20) }
    ]
  };

  function load(collection) {
    var stored = utils.storageGet(PREFIX + collection, null);
    if (stored === null) {
      stored = seeds[collection] ? JSON.parse(JSON.stringify(seeds[collection])) : [];
      utils.storageSet(PREFIX + collection, stored);
    }
    return stored;
  }

  function save(collection, data) {
    utils.storageSet(PREFIX + collection, data);
    return data;
  }

  return { load: load, save: save, seeds: seeds };
})();
