<?php
/**
 * Sesión y control de acceso.
 *
 * El control de permisos se hace ACÁ, en el servidor. Ocultar botones en el
 * navegador es solo comodidad visual: cualquiera puede llamar a la API a mano,
 * así que cada endpoint sensible tiene que volver a comprobar el rol.
 */

declare(strict_types=1);

/** Arranca la sesión de PHP una sola vez por petición. */
function sesion_iniciar(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'httponly' => true,   // el JavaScript no puede leer la cookie
        'samesite' => 'Lax',  // no viaja en peticiones desde otros sitios
        'path'     => '/',
    ]);
    session_start();
}

/** Guarda al usuario recién autenticado en la sesión. */
function sesion_guardar_usuario(array $usuario): void
{
    sesion_iniciar();
    // Se regenera el id al iniciar sesión para evitar fijación de sesión.
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $usuario['id'];
}

/** Cierra la sesión actual. */
function sesion_cerrar(): void
{
    sesion_iniciar();
    $_SESSION = [];
    session_destroy();
}

/**
 * Devuelve el usuario de la sesión actual, o null si no hay ninguna.
 *
 * Se relee de la base en cada petición a propósito: así, si a alguien le
 * cambian el rol o lo bloquean, el cambio tiene efecto de inmediato y no
 * cuando vuelva a iniciar sesión.
 */
function usuario_actual(): ?array
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }

    sesion_iniciar();
    if (empty($_SESSION['usuario_id'])) {
        return $cache = null;
    }

    $stmt = db()->prepare(
        'SELECT id, cedula, nombre, email, rol, iniciales, bloqueado
           FROM usuarios
          WHERE id = ?
          LIMIT 1'
    );
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario = $stmt->fetch();

    // Si lo borraron o lo bloquearon mientras tenía la sesión abierta, se corta.
    if (!$usuario || (int) $usuario['bloqueado'] === 1) {
        sesion_cerrar();
        return $cache = null;
    }

    return $cache = cast_row($usuario, [], ['bloqueado']);
}

/** Corta la petición con 401 si no hay sesión iniciada. */
function requerir_autenticacion(): array
{
    $usuario = usuario_actual();
    if (!$usuario) {
        json_error('Necesitás iniciar sesión para hacer esto.', 401);
    }

    return $usuario;
}

/** Corta la petición con 403 si el usuario no tiene alguno de los roles pedidos. */
function requerir_rol(array $roles): array
{
    $usuario = requerir_autenticacion();
    if (!in_array($usuario['rol'], $roles, true)) {
        json_error('Tu rol (' . $usuario['rol'] . ') no tiene permiso para hacer esto.', 403);
    }

    return $usuario;
}
