-- =====================================================================
-- Actualizaciones del esquema
--
-- Este archivo se ejecuta en CADA arranque de "npm run main", después de
-- comprobar el esquema. Por eso todas las sentencias tienen que ser
-- idempotentes: correrlas dos veces no debe cambiar nada ni fallar.
--
-- Sirve para que quien ya tenía la base creada reciba los cambios sin
-- perder sus datos, en vez de tener que borrar database/datos/.
--
-- NOTA: "IF NOT EXISTS" en ALTER TABLE es una extensión de MariaDB.
-- =====================================================================

-- --- v2.3.0 · gestión de usuarios --------------------------------------

-- El rol Root existe por encima de Administrador.
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('Root', 'Administrador', 'Tecnico', 'Docente')
  NOT NULL DEFAULT 'Docente';

-- Un usuario bloqueado no puede iniciar sesión, pero conserva su historial.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS bloqueado TINYINT(1) NOT NULL DEFAULT 0 AFTER iniciales;

-- Usuario Root inicial. INSERT IGNORE lo deja pasar si ya existe, así que no
-- pisa la contraseña si alguien ya la cambió.
INSERT IGNORE INTO usuarios (cedula, nombre, email, rol, password_hash, iniciales) VALUES
  ('00000000', 'Root del sistema', 'root@iti.edu.uy', 'Root',
   '$2y$12$0p7Qv7aNX.aIDXeDDT2MG.eQ1tPMbWzigbW9Md5aHptQ6/.eZJXT2', 'RT');

-- --- v2.4.0 · registro de auditoría --------------------------------------

CREATE TABLE IF NOT EXISTS auditoria (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_hora     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Se guarda el id, pero también una copia del nombre y el rol: si más
  -- adelante se borra el usuario, el registro sigue diciendo quién fue.
  usuario_id     INT UNSIGNED DEFAULT NULL,
  usuario_nombre VARCHAR(120) NOT NULL,
  usuario_rol    VARCHAR(20)  NOT NULL,

  accion         VARCHAR(40)  NOT NULL,   -- 'sesion.iniciar', 'usuario.crear'...
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

-- --- v3.0.0 · códigos únicos, línea de tiempo y participantes -------------

-- Nomenclatura de equipos y componentes: acrónimo de ubicación + serie
-- (L1-SN-88213). Se agrega como NULL, se completa para lo que ya existía y
-- recién ahí se vuelve obligatoria y única.
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(40) DEFAULT NULL AFTER id;

ALTER TABLE componentes
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(40) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(80) NOT NULL DEFAULT 'Depósito' AFTER fabricante;

-- Mismo criterio que api/nomenclatura.php: si la ubicación tiene números,
-- inicial + números ("Laboratorio 1" → L1); si no, sus tres primeras letras
-- ("Administración" → ADM).
UPDATE equipos
   SET codigo = CONCAT(
         CASE WHEN ubicacion REGEXP '[0-9]'
              THEN CONCAT(UPPER(LEFT(ubicacion, 1)), REGEXP_REPLACE(ubicacion, '[^0-9]', ''))
              ELSE UPPER(LEFT(ubicacion, 3))
         END, '-', serie)
 WHERE codigo IS NULL OR codigo = '';

UPDATE componentes
   SET codigo = CONCAT(
         CASE WHEN ubicacion REGEXP '[0-9]'
              THEN CONCAT(UPPER(LEFT(ubicacion, 1)), REGEXP_REPLACE(ubicacion, '[^0-9]', ''))
              ELSE UPPER(LEFT(ubicacion, 3))
         END, '-',
         -- Un componente puede no tener serie: en ese caso se usa su id.
         COALESCE(NULLIF(serie, ''), CONCAT('C', LPAD(id, 4, '0'))))
 WHERE codigo IS NULL OR codigo = '';

ALTER TABLE equipos
  MODIFY COLUMN codigo VARCHAR(40) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_equipos_codigo (codigo);

ALTER TABLE componentes
  MODIFY COLUMN codigo VARCHAR(40) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_componentes_codigo (codigo);

-- Identificador único de tickets, préstamos y solicitudes (TK-2026-0001).
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS solicitante_id INT UNSIGNED DEFAULT NULL AFTER solicitante;

ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS solicitante_id INT UNSIGNED DEFAULT NULL AFTER solicitante;

ALTER TABLE solicitudes
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS solicitante_id INT UNSIGNED DEFAULT NULL AFTER solicitante;

UPDATE tickets     SET codigo = CONCAT('TK-', YEAR(creado),       '-', LPAD(id, 4, '0')) WHERE codigo IS NULL OR codigo = '';
UPDATE solicitudes SET codigo = CONCAT('SL-', YEAR(creado),       '-', LPAD(id, 4, '0')) WHERE codigo IS NULL OR codigo = '';
UPDATE prestamos   SET codigo = CONCAT('PR-', YEAR(fecha_inicio), '-', LPAD(id, 4, '0')) WHERE codigo IS NULL OR codigo = '';

-- Se enlaza cada registro con la cuenta de quien lo pidió, que es lo que
-- permite mostrarle a cada usuario solamente lo suyo. Los nombres que no
-- coinciden con ninguna cuenta quedan en NULL: los ve el personal técnico.
UPDATE tickets     t JOIN usuarios u ON u.nombre = t.solicitante SET t.solicitante_id = u.id WHERE t.solicitante_id IS NULL;
UPDATE solicitudes s JOIN usuarios u ON u.nombre = s.solicitante SET s.solicitante_id = u.id WHERE s.solicitante_id IS NULL;
UPDATE prestamos   p JOIN usuarios u ON u.nombre = p.solicitante SET p.solicitante_id = u.id WHERE p.solicitante_id IS NULL;

ALTER TABLE tickets
  MODIFY COLUMN codigo VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_tickets_codigo (codigo),
  ADD KEY IF NOT EXISTS idx_tickets_solicitante (solicitante_id);

ALTER TABLE solicitudes
  MODIFY COLUMN codigo VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_solicitudes_codigo (codigo),
  ADD KEY IF NOT EXISTS idx_solicitudes_solicitante (solicitante_id);

ALTER TABLE prestamos
  MODIFY COLUMN codigo VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY IF NOT EXISTS uq_prestamos_codigo (codigo),
  ADD KEY IF NOT EXISTS idx_prestamos_solicitante (solicitante_id);

-- Línea de tiempo: un renglón por cambio de estado, con la nota del técnico.
CREATE TABLE IF NOT EXISTS historial (
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

-- Usuarios agregados a un ticket o solicitud además del solicitante.
CREATE TABLE IF NOT EXISTS participantes (
  entidad    ENUM('ticket', 'solicitud', 'prestamo') NOT NULL,
  entidad_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (entidad, entidad_id, usuario_id),
  KEY idx_participantes_usuario (usuario_id),
  CONSTRAINT fk_participantes_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Los tickets y solicitudes que ya existían arrancan su línea de tiempo con
-- un renglón de apertura, para que el detalle nunca se vea vacío.
INSERT INTO historial (entidad, entidad_id, estado, nota, usuario_id, usuario_nombre, usuario_rol, fecha_hora)
SELECT 'ticket', t.id, t.estado, 'Registro anterior a la línea de tiempo.',
       t.solicitante_id, t.solicitante, COALESCE(u.rol, 'Docente'), t.creado
  FROM tickets t
  LEFT JOIN usuarios u ON u.id = t.solicitante_id
 WHERE NOT EXISTS (SELECT 1 FROM historial h WHERE h.entidad = 'ticket' AND h.entidad_id = t.id);

INSERT INTO historial (entidad, entidad_id, estado, nota, usuario_id, usuario_nombre, usuario_rol, fecha_hora)
SELECT 'solicitud', s.id, s.estado, 'Registro anterior a la línea de tiempo.',
       s.solicitante_id, s.solicitante, COALESCE(u.rol, 'Docente'), s.creado
  FROM solicitudes s
  LEFT JOIN usuarios u ON u.id = s.solicitante_id
 WHERE NOT EXISTS (SELECT 1 FROM historial h WHERE h.entidad = 'solicitud' AND h.entidad_id = s.id);
