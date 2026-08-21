<?php
/**
 * Autenticación: entrar, salir y cambiar la propia contraseña.
 */

declare(strict_types=1);

final class ServicioAuth
{
    private RepositorioUsuarios $usuarios;
    private Auditoria $auditoria;

    public function __construct(?RepositorioUsuarios $usuarios = null, ?Auditoria $auditoria = null)
    {
        $this->usuarios  = $usuarios ?? new RepositorioUsuarios();
        $this->auditoria = $auditoria ?? new Auditoria();
    }

    public function iniciarSesion(array $datos): array
    {
        $datos   = Validador::requeridos($datos, ['cedula', 'password']);
        $usuario = $this->usuarios->porCedulaConHash($datos['cedula']);

        // Mismo mensaje para usuario inexistente y contraseña incorrecta, para
        // no revelar qué cédulas están registradas.
        if ($usuario === null || !password_verify($datos['password'], $usuario['password_hash'])) {
            $this->auditoria->registrar(
                'sesion.rechazada',
                'usuario',
                null,
                'Cédula ' . $datos['cedula'],
                ['id' => null, 'nombre' => 'Anónimo', 'rol' => '—']
            );

            throw new ErrorDeNegocio('Cédula o contraseña incorrecta.', 401);
        }

        // El bloqueo sí se informa: la persona existe y necesita saber por qué no entra.
        if ((int) $usuario['bloqueado'] === 1) {
            $this->auditoria->registrar('sesion.rechazada', 'usuario', (string) $usuario['id'],
                'Cuenta bloqueada', $usuario);

            throw ErrorDeNegocio::sinPermiso('Tu cuenta está bloqueada. Contactá a un administrador.');
        }

        unset($usuario['password_hash']);
        $usuario['id']        = (string) $usuario['id'];
        $usuario['bloqueado'] = (bool) $usuario['bloqueado'];

        Sesion::guardar($usuario);
        $this->auditoria->registrar('sesion.iniciar', 'usuario', $usuario['id'], null, $usuario);

        return $usuario;
    }

    public function sesionActual(): array
    {
        $usuario = Sesion::usuario();
        if ($usuario === null) {
            throw ErrorDeNegocio::sinSesion('No hay ninguna sesión iniciada.');
        }

        return $usuario;
    }

    public function cerrarSesion(): array
    {
        // Se audita antes de cerrar: después ya no se sabe quién era.
        $this->auditoria->registrar('sesion.cerrar');
        Sesion::cerrar();

        return ['ok' => true];
    }

    /**
     * Cambio de contraseña por parte del propio dueño.
     *
     * Es distinto de que un administrador se la resetee a otra persona: acá se
     * exige la contraseña actual, porque si no, cualquiera que encuentre una
     * sesión abierta podría dejar al dueño afuera de su cuenta.
     */
    public function cambiarPassword(array $datos): array
    {
        $usuario = Sesion::requerir();
        $datos   = Validador::requeridos($datos, ['actual', 'nueva']);

        $hash = $this->usuarios->hashPorId((int) $usuario['id']);

        if ($hash === null || !password_verify($datos['actual'], $hash)) {
            $this->auditoria->registrar('usuario.password.rechazado', 'usuario',
                (string) $usuario['id'], 'Contraseña actual incorrecta');

            throw ErrorDeNegocio::sinPermiso('La contraseña actual no es correcta.');
        }

        Validador::largoMinimo($datos['nueva'], 6,
            'La nueva contraseña debe tener al menos 6 caracteres.');

        if ($datos['actual'] === $datos['nueva']) {
            throw ErrorDeNegocio::datosInvalidos('La nueva contraseña tiene que ser distinta de la actual.');
        }

        $this->usuarios->cambiarPassword(
            (int) $usuario['id'],
            password_hash($datos['nueva'], PASSWORD_BCRYPT)
        );

        // Si alguien había copiado el identificador de sesión, deja de servirle.
        Sesion::renovarId();

        $this->auditoria->registrar('usuario.password', 'usuario',
            (string) $usuario['id'], 'Cambio de contraseña propio');

        return ['ok' => true];
    }
}
