<?php
/**
 * Autenticación de usuarios.
 */

declare(strict_types=1);

function auth_login(): never
{
    $body = request_body();
    $datos = require_fields($body, ['cedula', 'password']);

    $stmt = db()->prepare(
        'SELECT id, cedula, nombre, email, rol, iniciales, password_hash
           FROM usuarios
          WHERE cedula = ?
          LIMIT 1'
    );
    $stmt->execute([$datos['cedula']]);
    $usuario = $stmt->fetch();

    // Mismo mensaje para usuario inexistente y contraseña incorrecta, para no
    // revelar qué cédulas están registradas.
    if (!$usuario || !password_verify($datos['password'], $usuario['password_hash'])) {
        json_error('Cédula o contraseña incorrecta.', 401);
    }

    unset($usuario['password_hash']);

    json_response(cast_row($usuario));
}
