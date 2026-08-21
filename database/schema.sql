-- =====================================================================
-- SGRSI / Eternum — Esquema de base de datos (MariaDB)
--
-- Cómo importarlo:
--   "npm run main" lo importa solo la primera vez. A mano, desde la consola:
--       mariadb -u root -P 3307 < database/schema.sql
--
-- Este script es idempotente: se puede volver a ejecutar para reiniciar
-- los datos de ejemplo desde cero.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS eternum
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eternum;

-- Se eliminan en orden inverso a las dependencias (claves foráneas).
DROP TABLE IF EXISTS participantes;
DROP TABLE IF EXISTS historial;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS prestamos;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS componentes;
DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS usuarios;

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cedula        VARCHAR(8)   NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  rol           ENUM('Root', 'Administrador', 'Tecnico', 'Docente') NOT NULL DEFAULT 'Docente',
  password_hash VARCHAR(255) NOT NULL,
  iniciales     VARCHAR(4)   NOT NULL,
  -- Un usuario bloqueado sigue existiendo (y conserva su historial), pero no
  -- puede iniciar sesión. Se prefiere esto a borrarlo, porque los tickets y
  -- préstamos guardan el nombre de quien los pidió.
  bloqueado     TINYINT(1)   NOT NULL DEFAULT 0,
  creado        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_cedula (cedula),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- EQUIPOS
--
-- "codigo" es el identificador con el que se nombra al equipo por escrito:
-- acrónimo de la ubicación + número de serie (por ejemplo L1-SN-88213).
-- Lo arma el servidor al registrar el equipo (ver api/nomenclatura.php), así
-- que todos siguen la misma nomenclatura y se pueden buscar y mencionar en
-- tickets y préstamos.
-- ---------------------------------------------------------------------
CREATE TABLE equipos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(40)  NOT NULL,
  tipo        VARCHAR(40)  NOT NULL,
  ubicacion   VARCHAR(80)  NOT NULL,
  marca       VARCHAR(80)  NOT NULL,
  modelo      VARCHAR(80)  NOT NULL,
  serie       VARCHAR(60)  NOT NULL,
  part_number VARCHAR(60)  DEFAULT NULL,
  estado      ENUM('operativo', 'reparacion', 'baja') NOT NULL DEFAULT 'operativo',
  fallas      TEXT         DEFAULT NULL,
  creado      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipos_codigo (codigo),
  UNIQUE KEY uq_equipos_serie (serie),
  KEY idx_equipos_estado (estado),
  KEY idx_equipos_ubicacion (ubicacion)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- COMPONENTES
-- Mismo criterio de código que los equipos. Los componentes que están en
-- depósito y todavía no se montaron en ningún equipo usan la ubicación
-- "Depósito" (DEP-...).
-- ---------------------------------------------------------------------
CREATE TABLE componentes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(40)  NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  modelo      VARCHAR(80)  NOT NULL,
  fabricante  VARCHAR(80)  NOT NULL,
  ubicacion   VARCHAR(80)  NOT NULL DEFAULT 'Depósito',
  serie       VARCHAR(60)  DEFAULT NULL,
  part_number VARCHAR(60)  DEFAULT NULL,
  es_fabrica  TINYINT(1)   NOT NULL DEFAULT 1,
  funcionando TINYINT(1)   NOT NULL DEFAULT 1,
  creado      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_componentes_codigo (codigo),
  KEY idx_componentes_funcionando (funcionando)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- TICKETS
--
-- "codigo" (TK-2026-0001) es el identificador único visible: es el que se
-- menciona por escrito y por el que se busca. "solicitante_id" apunta al
-- usuario dueño del ticket: es lo que permite que cada uno vea los suyos.
-- Se conserva además "solicitante" (el nombre) para que el historial siga
-- siendo legible aunque más adelante se borre la cuenta.
-- ---------------------------------------------------------------------
CREATE TABLE tickets (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(20)  NOT NULL,
  titulo         VARCHAR(150) NOT NULL,
  descripcion    TEXT         DEFAULT NULL,
  equipo_id      INT UNSIGNED DEFAULT NULL,
  solicitante    VARCHAR(120) NOT NULL,
  solicitante_id INT UNSIGNED DEFAULT NULL,
  estado         ENUM('pendiente', 'en_progreso', 'en_resolucion', 'resuelto') NOT NULL DEFAULT 'pendiente',
  creado         DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_codigo (codigo),
  KEY idx_tickets_estado (estado),
  KEY idx_tickets_solicitante (solicitante_id),
  CONSTRAINT fk_tickets_equipo FOREIGN KEY (equipo_id)
    REFERENCES equipos (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_solicitante FOREIGN KEY (solicitante_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PRÉSTAMOS
-- ---------------------------------------------------------------------
CREATE TABLE prestamos (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(20)  NOT NULL,
  equipo_id      INT UNSIGNED DEFAULT NULL,
  solicitante    VARCHAR(120) NOT NULL,
  solicitante_id INT UNSIGNED DEFAULT NULL,
  fecha_inicio   DATE         NOT NULL DEFAULT (CURRENT_DATE),
  fecha_limite   DATE         NOT NULL,
  estado         ENUM('pendiente', 'aprobado', 'activo', 'vencido', 'devuelto') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (id),
  UNIQUE KEY uq_prestamos_codigo (codigo),
  KEY idx_prestamos_estado (estado),
  KEY idx_prestamos_solicitante (solicitante_id),
  CONSTRAINT fk_prestamos_equipo FOREIGN KEY (equipo_id)
    REFERENCES equipos (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_prestamos_solicitante FOREIGN KEY (solicitante_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- SOLICITUDES DE SERVICIO
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(20)  NOT NULL,
  titulo         VARCHAR(150) NOT NULL,
  detalle        TEXT         DEFAULT NULL,
  solicitante    VARCHAR(120) NOT NULL,
  solicitante_id INT UNSIGNED DEFAULT NULL,
  estado         ENUM('pendiente', 'aprobado', 'en_progreso', 'completado', 'rechazado') NOT NULL DEFAULT 'pendiente',
  creado         DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitudes_codigo (codigo),
  KEY idx_solicitudes_estado (estado),
  KEY idx_solicitudes_solicitante (solicitante_id),
  CONSTRAINT fk_solicitudes_solicitante FOREIGN KEY (solicitante_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- HISTORIAL (línea de tiempo de tickets, solicitudes y préstamos)
--
-- Cada cambio de estado deja una fila con la nota que escribió el técnico.
-- Es lo que se muestra como línea de tiempo en el detalle: por eso la nota
-- es obligatoria al avanzar un estado, para que quede registrado el "qué se
-- hizo" y no solamente el "de qué estado a qué estado".
--
-- Igual que en auditoría, se guarda una copia del nombre del autor para que
-- el historial siga siendo legible si la cuenta desaparece.
-- ---------------------------------------------------------------------
CREATE TABLE historial (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entidad        ENUM('ticket', 'solicitud', 'prestamo') NOT NULL,
  entidad_id     INT UNSIGNED NOT NULL,
  estado         VARCHAR(20)  NOT NULL,
  nota           TEXT         DEFAULT NULL,
  usuario_id     INT UNSIGNED DEFAULT NULL,
  usuario_nombre VARCHAR(120) NOT NULL,
  usuario_rol    VARCHAR(20)  NOT NULL,
  fecha_hora     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_historial_entidad (entidad, entidad_id, fecha_hora),
  CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PARTICIPANTES
--
-- Usuarios agregados a un ticket o solicitud además del solicitante: lo ven
-- y lo siguen como si fuera propio. Es lo que permite que un técnico o un
-- docente sume a otra persona al crear el ticket.
-- ---------------------------------------------------------------------
CREATE TABLE participantes (
  entidad    ENUM('ticket', 'solicitud', 'prestamo') NOT NULL,
  entidad_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (entidad, entidad_id, usuario_id),
  KEY idx_participantes_usuario (usuario_id),
  CONSTRAINT fk_participantes_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- AUDITORÍA
-- Deja constancia de quién hizo qué y cuándo. Es solo de lectura desde la
-- aplicación: se escribe automáticamente y no se edita ni se borra.
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_hora     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Se guarda el id, pero también una copia del nombre y el rol: si más
  -- adelante se borra el usuario, el registro sigue diciendo quién fue.
  usuario_id     INT UNSIGNED DEFAULT NULL,
  usuario_nombre VARCHAR(120) NOT NULL,
  usuario_rol    VARCHAR(20)  NOT NULL,

  accion         VARCHAR(40)  NOT NULL,
  entidad        VARCHAR(40)  DEFAULT NULL,
  entidad_id     VARCHAR(40)  DEFAULT NULL,
  detalle        VARCHAR(255) DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_auditoria_fecha (fecha_hora),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_accion (accion),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================================
-- DATOS DE EJEMPLO
--
-- Contraseñas (hash bcrypt generado con password_hash de PHP):
--   00000000 → root2026      (Root del sistema  · Root)
--   12345678 → admin123      (Marcela Rodríguez · Administrador)
--   87654321 → tecnico123    (Julián Pérez      · Técnico)
--   11223344 → docente123    (Ana Gómez         · Docente)
-- =====================================================================

INSERT INTO usuarios (cedula, nombre, email, rol, password_hash, iniciales) VALUES
  ('00000000', 'Root del sistema',  'root@iti.edu.uy',       'Root',          '$2y$12$0p7Qv7aNX.aIDXeDDT2MG.eQ1tPMbWzigbW9Md5aHptQ6/.eZJXT2', 'RT'),
  ('12345678', 'Marcela Rodríguez', 'mrodriguez@iti.edu.uy', 'Administrador', '$2y$12$U7ht1I7MEZ6YW9Y88afwjOSNj26Wct1J7FOiGkcoK54DkGNvoSqc2', 'MR'),
  ('87654321', 'Julián Pérez',      'jperez@iti.edu.uy',     'Tecnico',       '$2y$12$qfc/Y9dgNMvzsIdljo6ZfO6B7HdIxBUWijIvirB35KCa3JcR5Z6wK', 'JP'),
  ('11223344', 'Ana Gómez',         'agomez@iti.edu.uy',     'Docente',       '$2y$12$aKiydVLNorGzqwp0hqwBiesxm2pOmSYeA5cMrJfmBTC/mqcQD.ZXi', 'AG');

INSERT INTO equipos (codigo, tipo, ubicacion, marca, modelo, serie, part_number, estado, fallas, creado) VALUES
  ('L1-SN-88213',  'Desktop',   'Laboratorio 1',  'Dell',    'OptiPlex 3080',  'SN-88213', 'OP3080',  'operativo',  NULL,                                  CURDATE() - INTERVAL 76 DAY),
  ('ADM-SN-40221', 'Laptop',    'Administración', 'Lenovo',  'ThinkPad E14',   'SN-40221', 'TPE14',   'operativo',  NULL,                                  CURDATE() - INTERVAL 68 DAY),
  ('SAL-SN-77120', 'Proyector', 'Salones',        'Epson',   'PowerLite X49',  'SN-77120', 'PLX49',   'reparacion', 'No enciende la lámpara',              CURDATE() - INTERVAL 89 DAY),
  ('L2-SN-55871',  'AIO',       'Laboratorio 2',  'HP',      'ProOne 440',     'SN-55871', 'PO440',   'operativo',  NULL,                                  CURDATE() - INTERVAL 124 DAY),
  ('ADM-SN-99012', 'Impresora', 'Administración', 'Brother', 'HL-L2390DW',     'SN-99012', 'HLL2390', 'baja',       'Rodillo dañado, fuera de servicio',   CURDATE() - INTERVAL 169 DAY),
  ('L1-SN-88214',  'Desktop',   'Laboratorio 1',  'Dell',    'OptiPlex 3080',  'SN-88214', 'OP3080',  'operativo',  NULL,                                  CURDATE() - INTERVAL 76 DAY),
  ('OTR-SN-12309', 'Laptop',    'Otros',          'Acer',    'Aspire 5',       'SN-12309', 'AS5',     'operativo',  NULL,                                  CURDATE() - INTERVAL 47 DAY);

INSERT INTO componentes (codigo, nombre, modelo, fabricante, ubicacion, serie, part_number, es_fabrica, funcionando, creado) VALUES
  ('DEP-KS-2201', 'Memoria RAM',     '8GB DDR4', 'Kingston', 'Depósito',      'KS-2201', 'KVR26N19S8', 1, 1, CURDATE() - INTERVAL 76 DAY),
  ('DEP-KS-5541', 'Disco SSD',       '480GB',    'Kingston', 'Depósito',      'KS-5541', 'A400',       0, 1, CURDATE() - INTERVAL 67 DAY),
  ('L1-EV-9081',  'Fuente de poder', '500W',     'EVGA',     'Laboratorio 1', 'EV-9081', '500W1',      1, 0, CURDATE() - INTERVAL 91 DAY);

INSERT INTO tickets (codigo, titulo, descripcion, equipo_id, solicitante, solicitante_id, estado, creado) VALUES
  ('TK-2026-0001', 'PC no enciende',       'El equipo del laboratorio 1 no enciende tras corte de luz.', 1, 'Ana Gómez',         4, 'pendiente',     CURDATE() - INTERVAL 1 DAY),
  ('TK-2026-0002', 'Proyector sin imagen', 'El proyector del salón 4 no muestra imagen.',                3, 'Julián Pérez',      3, 'en_progreso',   CURDATE() - INTERVAL 2 DAY),
  ('TK-2026-0003', 'Impresora atascada',   'Se atascan las hojas al imprimir.',                          5, 'Marcela Rodríguez', 2, 'en_resolucion', CURDATE() - INTERVAL 4 DAY),
  ('TK-2026-0004', 'Actualizar antivirus', 'Solicitud de actualización en equipos de administración.',   2, 'Marcela Rodríguez', 2, 'resuelto',      CURDATE() - INTERVAL 6 DAY),
  ('TK-2026-0005', 'Mouse no responde',    'Mouse óptico del laboratorio 2 no responde.',                4, 'Ana Gómez',         4, 'resuelto',      CURDATE() - INTERVAL 9 DAY);

-- Ana (docente) además sigue el ticket 2, que abrió el técnico: así se ve el
-- caso de "agregar a otro usuario" funcionando con los datos de ejemplo.
INSERT INTO participantes (entidad, entidad_id, usuario_id) VALUES
  ('ticket', 2, 4);

INSERT INTO prestamos (codigo, equipo_id, solicitante, solicitante_id, fecha_inicio, fecha_limite, estado) VALUES
  ('PR-2026-0001', 7, 'Ana Gómez',         4, CURDATE() - INTERVAL 5 DAY,  CURDATE() + INTERVAL 10 DAY, 'activo'),
  ('PR-2026-0002', 2, 'Julián Pérez',      3, CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 15 DAY, 'vencido'),
  ('PR-2026-0003', 4, 'Marcela Rodríguez', 2, CURDATE() - INTERVAL 60 DAY, CURDATE() - INTERVAL 45 DAY, 'devuelto');

INSERT INTO solicitudes (codigo, titulo, detalle, solicitante, solicitante_id, estado, creado) VALUES
  ('SL-2026-0001', 'Solicitud de 2 laptops',   'Para taller de robótica de 3er año.',            'Ana Gómez',         4, 'pendiente',   CURDATE() - INTERVAL 2 DAY),
  ('SL-2026-0002', 'Instalación de software',  'Instalar suite de diseño en laboratorio 2.',     'Julián Pérez',      3, 'en_progreso', CURDATE() - INTERVAL 3 DAY),
  ('SL-2026-0003', 'Mantenimiento preventivo', 'Limpieza general de equipos de administración.', 'Marcela Rodríguez', 2, 'completado',  CURDATE() - INTERVAL 20 DAY);

-- Línea de tiempo de ejemplo: la apertura de cada ticket y los avances que
-- ya tienen registrados, con la nota del técnico que los movió.
INSERT INTO historial (entidad, entidad_id, estado, nota, usuario_id, usuario_nombre, usuario_rol, fecha_hora) VALUES
  ('ticket', 1, 'pendiente',     'Ticket creado por Ana Gómez.',                                  4, 'Ana Gómez',         'Docente', NOW() - INTERVAL 1 DAY),
  ('ticket', 2, 'pendiente',     'Ticket creado por Julián Pérez.',                               3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 2 DAY),
  ('ticket', 2, 'en_progreso',   'Se revisó el cableado HDMI, falta probar con otra notebook.',    3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 1 DAY),
  ('ticket', 3, 'pendiente',     'Ticket creado por Marcela Rodríguez.',                          2, 'Marcela Rodríguez', 'Administrador', NOW() - INTERVAL 4 DAY),
  ('ticket', 3, 'en_progreso',   'Se retiró la impresora para revisarla en taller.',              3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 3 DAY),
  ('ticket', 3, 'en_resolucion', 'Rodillo pedido al proveedor, a la espera del repuesto.',        3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 2 DAY),
  ('ticket', 4, 'pendiente',     'Ticket creado por Marcela Rodríguez.',                          2, 'Marcela Rodríguez', 'Administrador', NOW() - INTERVAL 6 DAY),
  ('ticket', 4, 'resuelto',      'Antivirus actualizado en los seis equipos de administración.',  3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 5 DAY),
  ('ticket', 5, 'pendiente',     'Ticket creado por Ana Gómez.',                                  4, 'Ana Gómez',         'Docente', NOW() - INTERVAL 9 DAY),
  ('ticket', 5, 'resuelto',      'Se cambió el mouse por uno del depósito.',                      3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 8 DAY),
  ('solicitud', 1, 'pendiente',   'Solicitud creada por Ana Gómez.',                              4, 'Ana Gómez',         'Docente', NOW() - INTERVAL 2 DAY),
  ('solicitud', 2, 'pendiente',   'Solicitud creada por Julián Pérez.',                           3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 3 DAY),
  ('solicitud', 2, 'en_progreso', 'Descargando los instaladores de la suite.',                    3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 2 DAY),
  ('solicitud', 3, 'pendiente',   'Solicitud creada por Marcela Rodríguez.',                      2, 'Marcela Rodríguez', 'Administrador', NOW() - INTERVAL 20 DAY),
  ('solicitud', 3, 'completado',  'Limpieza realizada en las seis máquinas de administración.',   3, 'Julián Pérez',      'Tecnico', NOW() - INTERVAL 18 DAY);
