-- =====================================================================
-- SGRSI / Eternum — Esquema de base de datos (MariaDB / XAMPP)
--
-- Cómo importarlo:
--   Opción A (phpMyAdmin): http://localhost/phpmyadmin → pestaña "Importar"
--                          → elegir este archivo → Continuar.
--   Opción B (consola):    mysql -u root < database/schema.sql
--
-- Este script es idempotente: se puede volver a ejecutar para reiniciar
-- los datos de ejemplo desde cero.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS eternum
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eternum;

-- Se eliminan en orden inverso a las dependencias (claves foráneas).
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
-- ---------------------------------------------------------------------
CREATE TABLE equipos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
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
  UNIQUE KEY uq_equipos_serie (serie),
  KEY idx_equipos_estado (estado),
  KEY idx_equipos_ubicacion (ubicacion)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- COMPONENTES
-- ---------------------------------------------------------------------
CREATE TABLE componentes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120) NOT NULL,
  modelo      VARCHAR(80)  NOT NULL,
  fabricante  VARCHAR(80)  NOT NULL,
  serie       VARCHAR(60)  DEFAULT NULL,
  part_number VARCHAR(60)  DEFAULT NULL,
  es_fabrica  TINYINT(1)   NOT NULL DEFAULT 1,
  funcionando TINYINT(1)   NOT NULL DEFAULT 1,
  creado      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  KEY idx_componentes_funcionando (funcionando)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- TICKETS
-- ---------------------------------------------------------------------
CREATE TABLE tickets (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(150) NOT NULL,
  descripcion TEXT         DEFAULT NULL,
  equipo_id   INT UNSIGNED DEFAULT NULL,
  solicitante VARCHAR(120) NOT NULL,
  estado      ENUM('pendiente', 'en_progreso', 'en_resolucion', 'resuelto') NOT NULL DEFAULT 'pendiente',
  creado      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  KEY idx_tickets_estado (estado),
  CONSTRAINT fk_tickets_equipo FOREIGN KEY (equipo_id)
    REFERENCES equipos (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PRÉSTAMOS
-- ---------------------------------------------------------------------
CREATE TABLE prestamos (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  equipo_id    INT UNSIGNED DEFAULT NULL,
  solicitante  VARCHAR(120) NOT NULL,
  fecha_inicio DATE         NOT NULL DEFAULT (CURRENT_DATE),
  fecha_limite DATE         NOT NULL,
  estado       ENUM('pendiente', 'aprobado', 'activo', 'vencido', 'devuelto') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (id),
  KEY idx_prestamos_estado (estado),
  CONSTRAINT fk_prestamos_equipo FOREIGN KEY (equipo_id)
    REFERENCES equipos (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- SOLICITUDES DE SERVICIO
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(150) NOT NULL,
  detalle     TEXT         DEFAULT NULL,
  solicitante VARCHAR(120) NOT NULL,
  estado      ENUM('pendiente', 'aprobado', 'en_progreso', 'completado', 'rechazado') NOT NULL DEFAULT 'pendiente',
  creado      DATE         NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  KEY idx_solicitudes_estado (estado)
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

INSERT INTO equipos (tipo, ubicacion, marca, modelo, serie, part_number, estado, fallas, creado) VALUES
  ('Desktop',   'Laboratorio 1',  'Dell',    'OptiPlex 3080',  'SN-88213', 'OP3080',  'operativo',  NULL,                                  CURDATE() - INTERVAL 76 DAY),
  ('Laptop',    'Administración', 'Lenovo',  'ThinkPad E14',   'SN-40221', 'TPE14',   'operativo',  NULL,                                  CURDATE() - INTERVAL 68 DAY),
  ('Proyector', 'Salones',        'Epson',   'PowerLite X49',  'SN-77120', 'PLX49',   'reparacion', 'No enciende la lámpara',              CURDATE() - INTERVAL 89 DAY),
  ('AIO',       'Laboratorio 2',  'HP',      'ProOne 440',     'SN-55871', 'PO440',   'operativo',  NULL,                                  CURDATE() - INTERVAL 124 DAY),
  ('Impresora', 'Administración', 'Brother', 'HL-L2390DW',     'SN-99012', 'HLL2390', 'baja',       'Rodillo dañado, fuera de servicio',   CURDATE() - INTERVAL 169 DAY),
  ('Desktop',   'Laboratorio 1',  'Dell',    'OptiPlex 3080',  'SN-88214', 'OP3080',  'operativo',  NULL,                                  CURDATE() - INTERVAL 76 DAY),
  ('Laptop',    'Otros',          'Acer',    'Aspire 5',       'SN-12309', 'AS5',     'operativo',  NULL,                                  CURDATE() - INTERVAL 47 DAY);

INSERT INTO componentes (nombre, modelo, fabricante, serie, part_number, es_fabrica, funcionando, creado) VALUES
  ('Memoria RAM',      '8GB DDR4', 'Kingston', 'KS-2201', 'KVR26N19S8', 1, 1, CURDATE() - INTERVAL 76 DAY),
  ('Disco SSD',        '480GB',    'Kingston', 'KS-5541', 'A400',       0, 1, CURDATE() - INTERVAL 67 DAY),
  ('Fuente de poder',  '500W',     'EVGA',     'EV-9081', '500W1',      1, 0, CURDATE() - INTERVAL 91 DAY);

INSERT INTO tickets (titulo, descripcion, equipo_id, solicitante, estado, creado) VALUES
  ('PC no enciende',      'El equipo del laboratorio 1 no enciende tras corte de luz.',   1, 'Ana Gómez',         'pendiente',     CURDATE() - INTERVAL 1 DAY),
  ('Proyector sin imagen','El proyector del salón 4 no muestra imagen.',                  3, 'Julián Pérez',      'en_progreso',   CURDATE() - INTERVAL 2 DAY),
  ('Impresora atascada',  'Se atascan las hojas al imprimir.',                            5, 'Marcela Rodríguez', 'en_resolucion', CURDATE() - INTERVAL 4 DAY),
  ('Actualizar antivirus','Solicitud de actualización en equipos de administración.',     2, 'Marcela Rodríguez', 'resuelto',      CURDATE() - INTERVAL 6 DAY),
  ('Mouse no responde',   'Mouse óptico del laboratorio 2 no responde.',                  4, 'Ana Gómez',         'resuelto',      CURDATE() - INTERVAL 9 DAY);

INSERT INTO prestamos (equipo_id, solicitante, fecha_inicio, fecha_limite, estado) VALUES
  (7, 'Ana Gómez',         CURDATE() - INTERVAL 5 DAY,  CURDATE() + INTERVAL 10 DAY, 'activo'),
  (2, 'Julián Pérez',      CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 15 DAY, 'vencido'),
  (4, 'Marcela Rodríguez', CURDATE() - INTERVAL 60 DAY, CURDATE() - INTERVAL 45 DAY, 'devuelto');

INSERT INTO solicitudes (titulo, detalle, solicitante, estado, creado) VALUES
  ('Solicitud de 2 laptops',   'Para taller de robótica de 3er año.',              'Ana Gómez',         'pendiente',   CURDATE() - INTERVAL 2 DAY),
  ('Instalación de software',  'Instalar suite de diseño en laboratorio 2.',       'Julián Pérez',      'en_progreso', CURDATE() - INTERVAL 3 DAY),
  ('Mantenimiento preventivo', 'Limpieza general de equipos de administración.',   'Marcela Rodríguez', 'completado',  CURDATE() - INTERVAL 20 DAY);
