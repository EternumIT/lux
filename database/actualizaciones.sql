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
