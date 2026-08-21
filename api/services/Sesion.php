<?php
/**
 * Sesión y control de acceso (capa de negocio: services).
 *
 * El control de permisos se decide ACÁ, en el servidor. Ocultar botones en el
 * navegador es solo comodidad visual: cualquiera puede llamar a la API a mano,
 * así que cada operación sensible vuelve a comprobar el rol.
 */

declare(strict_types=1);

final class Sesion
{
    /** Cache por petición: evita releer el usuario en cada comprobación. */
    private static ?array $usuario = null;
    private static bool $leido = false;

    /** Arranca la sesión de PHP una sola vez por petición. */
    public static function iniciar(): void
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

    /** Guarda al usuario recién autenticado. */
    public static function guardar(array $usuario): void
    {
        self::iniciar();
        // Se regenera el id al iniciar sesión para evitar fijación de sesión.
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = (int) $usuario['id'];

        self::$usuario = $usuario;
        self::$leido   = true;
    }

    /**
     * Renueva el identificador conservando la sesión.
     * Se usa al cambiar la contraseña: si alguien había copiado el id anterior,
     * deja de servirle en ese mismo momento.
     */
    public static function renovarId(): void
    {
        self::iniciar();
        session_regenerate_id(true);
    }

    public static function cerrar(): void
    {
        self::iniciar();
        $_SESSION = [];
        session_destroy();

        self::$usuario = null;
        self::$leido   = true;
    }

    /**
     * Usuario de la sesión actual, o null si no hay ninguna.
     *
     * Se relee de la base en cada petición a propósito: así, si a alguien le
     * cambian el rol o lo bloquean, el cambio tiene efecto de inmediato y no
     * cuando vuelva a iniciar sesión.
     */
    public static function usuario(): ?array
    {
        if (self::$leido) {
            return self::$usuario;
        }

        self::$leido = true;
        self::iniciar();

        if (empty($_SESSION['usuario_id'])) {
            return self::$usuario = null;
        }

        $usuario = (new RepositorioUsuarios())->porId((int) $_SESSION['usuario_id']);

        // Si lo borraron o lo bloquearon mientras tenía la sesión abierta, se corta.
        if ($usuario === null || $usuario['bloqueado'] === true) {
            self::cerrar();
            return self::$usuario = null;
        }

        return self::$usuario = $usuario;
    }

    /** Corta la operación si no hay sesión iniciada. */
    public static function requerir(): array
    {
        $usuario = self::usuario();
        if ($usuario === null) {
            throw ErrorDeNegocio::sinSesion();
        }

        return $usuario;
    }

    /** Corta la operación si el usuario no tiene alguno de los roles pedidos. */
    public static function requerirRol(array $roles): array
    {
        $usuario = self::requerir();

        if (!in_array($usuario['rol'], $roles, true)) {
            throw ErrorDeNegocio::sinPermiso(
                'Tu rol (' . $usuario['rol'] . ') no tiene permiso para hacer esto.'
            );
        }

        return $usuario;
    }

    /** Atajo para las operaciones del personal del área. */
    public static function requerirPersonal(): array
    {
        return self::requerirRol(Permisos::ROLES_PERSONAL);
    }

    /** Atajo para la sección administrativa. */
    public static function requerirAdmin(): array
    {
        return self::requerirRol(Permisos::ROLES_ADMIN);
    }
}
