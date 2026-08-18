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
        'SELECT id, cedula, nombre, email, rol, iniciales, bloqueado, password_hash
           FROM usuarios
          WHERE cedula = ?
          LIMIT 1'
    );
    $stmt->execute([$datos['cedula']]);
    $usuario = $stmt->fetch();

    // Mismo mensaje para usuario inexistente y contraseña incorrecta, para no
    // revelar qué cédulas están registradas.
    if (!$usuario || !password_verify($datos['password'], $usuario['password_hash'])) {
        // Se deja constancia del intento fallido, sin decir si la cédula existe.
        auditar('sesion.rechazada', 'usuario', null,
            'Cédula ' . $datos['cedula'],
            ['id' => null, 'nombre' => 'Anónimo', 'rol' => '—']);
        json_error('Cédula o contraseña incorrecta.', 401);
    }

    // El bloqueo sí se informa: la persona existe y necesita saber por qué no entra.
    if ((int) $usuario['bloqueado'] === 1) {
        auditar('sesion.rechazada', 'usuario', (string) $usuario['id'],
            'Cuenta bloqueada', $usuario);
        json_error('Tu cuenta está bloqueada. Contactá a un administrador.', 403);
    }

    unset($usuario['password_hash']);
    sesion_guardar_usuario($usuario);
    auditar('sesion.iniciar', 'usuario', (string) $usuario['id'], null, $usuario);

    json_response(cast_row($usuario, [], ['bloqueado']));
}

/** GET /auth/sesion — quién está autenticado ahora mismo. */
function auth_sesion(): never
{
    $usuario = usuario_actual();
    if (!$usuario) {
        json_error('No hay ninguna sesión iniciada.', 401);
    }

    json_response($usuario);
}

/** POST /auth/logout */
function auth_logout(): never
{
    // Se audita antes de cerrar: después ya no se sabe quién era.
    auditar('sesion.cerrar');
    sesion_cerrar();
    json_response(['ok' => true]);
}
