<?php
/**
 * Gestión de usuarios (sección administrativa).
 *
 * Reglas de quién puede tocar a quién:
 *   · Root          → todos, incluidos otros Root y Administradores.
 *   · Administrador → solo cuentas Técnico y Docente.
 *   · El resto      → nada (no llegan hasta acá: requerir_rol los frena).
 *
 * Además, nadie puede bloquearse ni cambiarse el rol a sí mismo, para que no
 * quede el sistema sin ningún administrador por un descuido.
 */

declare(strict_types=1);

require_once __DIR__ . '/../permisos.php';

/** Roles que solo Root puede crear o modificar. */
const ROLES_PRIVILEGIADOS = ['Root', 'Administrador'];

const CAMPOS_USUARIO =
    'id, cedula, nombre, email, rol, iniciales, bloqueado, creado';

/**
 * Comprueba que quien hace la petición pueda administrar una cuenta con ese rol.
 * Un Administrador no puede crear otro Administrador ni tocar al Root.
 */
function usuarios_verificar_alcance(array $actor, string $rolObjetivo, string $accion): void
{
    if (in_array($rolObjetivo, ROLES_PRIVILEGIADOS, true)
        && !rol_puede($actor['rol'], 'usuarios.gestionarAdmins')) {
        json_error(
            'Solo un usuario Root puede ' . $accion . ' cuentas con rol ' . $rolObjetivo . '.',
            403
        );
    }
}

/** Busca un usuario por id o corta con 404. */
function usuarios_obtener(int $id): array
{
    $stmt = db()->prepare('SELECT ' . CAMPOS_USUARIO . ' FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        json_error('El usuario indicado no existe.', 404);
    }

    return $usuario;
}

/** Genera las iniciales a partir del nombre: "Ana Gómez" → "AG". */
function usuarios_iniciales(string $nombre): string
{
    $partes = preg_split('/\s+/u', trim($nombre)) ?: [];
    $iniciales = '';
    foreach (array_slice($partes, 0, 2) as $parte) {
        if ($parte !== '') {
            $iniciales .= texto_mayusculas(texto_primer_caracter($parte));
        }
    }

    return $iniciales !== '' ? $iniciales : '?';
}

/** Normaliza una fila para el frontend. */
function usuarios_formato(array $fila): array
{
    return cast_row($fila, [], ['bloqueado']);
}

/* ------------------------------------------------------------------ */

/** GET /usuarios */
function usuarios_listar(): never
{
    requerir_rol(['Root', 'Administrador']);

    $filas = db()->query(
        'SELECT ' . CAMPOS_USUARIO . ' FROM usuarios ORDER BY FIELD(rol, ' .
        "'Root', 'Administrador', 'Tecnico', 'Docente'), nombre"
    )->fetchAll();

    json_response(array_map('usuarios_formato', $filas));
}

/** POST /usuarios */
function usuarios_crear(): never
{
    $actor = requerir_rol(['Root', 'Administrador']);

    $body = request_body();
    $datos = require_fields($body, ['cedula', 'nombre', 'email', 'password']);
    $rol = require_enum($body['rol'] ?? 'Docente', ROLES, 'rol');

    usuarios_verificar_alcance($actor, $rol, 'crear');

    if (!preg_match('/^\d{6,8}$/', $datos['cedula'])) {
        json_error('La cédula debe tener entre 6 y 8 dígitos.', 422);
    }
    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        json_error('El email no tiene un formato válido.', 422);
    }
    if (texto_largo($datos['password']) < 6) {
        json_error('La contraseña debe tener al menos 6 caracteres.', 422);
    }

    $pdo = db();

    $repetido = $pdo->prepare('SELECT cedula, email FROM usuarios WHERE cedula = ? OR email = ? LIMIT 1');
    $repetido->execute([$datos['cedula'], $datos['email']]);
    if ($fila = $repetido->fetch()) {
        $campo = $fila['cedula'] === $datos['cedula'] ? 'cédula' : 'email';
        json_error('Ya existe un usuario con esa ' . $campo . '.', 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO usuarios (cedula, nombre, email, rol, password_hash, iniciales)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $datos['cedula'],
        $datos['nombre'],
        $datos['email'],
        $rol,
        password_hash($datos['password'], PASSWORD_BCRYPT),
        usuarios_iniciales($datos['nombre']),
    ]);

    $nuevo = usuarios_obtener((int) $pdo->lastInsertId());
    auditar('usuario.crear', 'usuario', (string) $nuevo['id'],
        $nuevo['nombre'] . ' (' . $nuevo['rol'] . ')');

    json_response(usuarios_formato($nuevo), 201);
}

/** PATCH /usuarios/{id} — datos, rol y/o contraseña. */
function usuarios_actualizar(int $id): never
{
    $actor = requerir_rol(['Root', 'Administrador']);
    $objetivo = usuarios_obtener($id);
    $body = request_body();

    $esUnoMismo = (int) $objetivo['id'] === (int) $actor['id'];

    // Para tocar una cuenta privilegiada ajena hay que ser Root. La cuenta
    // propia se exceptúa: si no, un Administrador no podría ni corregirse el
    // nombre. Cambiarse el rol a uno mismo igual queda prohibido más abajo.
    if (!$esUnoMismo) {
        usuarios_verificar_alcance($actor, $objetivo['rol'], 'modificar');
    }

    $campos = [];
    $valores = [];

    if (isset($body['nombre'])) {
        $nombre = trim((string) $body['nombre']);
        if ($nombre === '') {
            json_error('El nombre no puede quedar vacío.', 422);
        }
        $campos[] = 'nombre = ?';
        $valores[] = $nombre;
        $campos[] = 'iniciales = ?';
        $valores[] = usuarios_iniciales($nombre);
    }

    if (isset($body['email'])) {
        $email = trim((string) $body['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('El email no tiene un formato válido.', 422);
        }
        $campos[] = 'email = ?';
        $valores[] = $email;
    }

    if (isset($body['rol'])) {
        $rol = require_enum($body['rol'], ROLES, 'rol');

        if ($esUnoMismo && $rol !== $actor['rol']) {
            json_error('No podés cambiarte el rol a vos mismo.', 409);
        }
        // También hace falta ser Root para ascender a alguien a Root/Administrador.
        usuarios_verificar_alcance($actor, $rol, 'asignar');

        $campos[] = 'rol = ?';
        $valores[] = $rol;
    }

    if (isset($body['password']) && $body['password'] !== '') {
        if (texto_largo((string) $body['password']) < 6) {
            json_error('La contraseña debe tener al menos 6 caracteres.', 422);
        }
        $campos[] = 'password_hash = ?';
        $valores[] = password_hash((string) $body['password'], PASSWORD_BCRYPT);
    }

    if (!$campos) {
        json_error('No se indicó ningún cambio.', 422);
    }

    $valores[] = $id;
    $stmt = db()->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ' WHERE id = ?');
    $stmt->execute($valores);

    $actualizado = usuarios_obtener($id);
    $cambios = [];
    if (isset($body['nombre']))   { $cambios[] = 'nombre'; }
    if (isset($body['email']))    { $cambios[] = 'email'; }
    if (isset($body['rol']))      { $cambios[] = 'rol → ' . $actualizado['rol']; }
    if (!empty($body['password'])) { $cambios[] = 'contraseña'; }
    auditar('usuario.editar', 'usuario', (string) $id,
        $actualizado['nombre'] . ': ' . implode(', ', $cambios));

    json_response(usuarios_formato($actualizado));
}

/** PATCH /usuarios/{id}/bloqueo — bloquea o desbloquea. */
function usuarios_cambiar_bloqueo(int $id): never
{
    $actor = requerir_rol(['Root', 'Administrador']);
    $objetivo = usuarios_obtener($id);
    $body = request_body();

    if (!array_key_exists('bloqueado', $body)) {
        json_error('Falta indicar el campo "bloqueado".', 422);
    }
    $bloqueado = filter_var($body['bloqueado'], FILTER_VALIDATE_BOOLEAN);

    if ((int) $objetivo['id'] === (int) $actor['id']) {
        json_error('No podés bloquearte a vos mismo.', 409);
    }
    usuarios_verificar_alcance($actor, $objetivo['rol'], 'bloquear');

    // Salvaguarda: el sistema no puede quedarse sin ningún Root activo.
    if ($bloqueado && $objetivo['rol'] === 'Root') {
        $activos = (int) db()->query(
            "SELECT COUNT(*) FROM usuarios WHERE rol = 'Root' AND bloqueado = 0"
        )->fetchColumn();
        if ($activos <= 1) {
            json_error('No se puede bloquear al último usuario Root activo.', 409);
        }
    }

    $stmt = db()->prepare('UPDATE usuarios SET bloqueado = ? WHERE id = ?');
    $stmt->execute([$bloqueado ? 1 : 0, $id]);

    auditar($bloqueado ? 'usuario.bloquear' : 'usuario.desbloquear',
        'usuario', (string) $id, $objetivo['nombre']);

    json_response(usuarios_formato(usuarios_obtener($id)));
}
