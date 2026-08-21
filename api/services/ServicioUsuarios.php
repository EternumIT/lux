<?php
/**
 * Gestión de usuarios (sección administrativa).
 *
 * Reglas de quién puede tocar a quién:
 *   · Root          → todos, incluidos otros Root y Administradores.
 *   · Administrador → solo cuentas Técnico y Docente.
 *   · El resto      → nada (no llegan hasta acá: el rol se comprueba antes).
 *
 * Además, nadie puede bloquearse ni cambiarse el rol a sí mismo, para que no
 * quede el sistema sin ningún administrador por un descuido.
 *
 * Y por encima de todo eso, la cuenta Root queda fuera de alcance: nadie
 * la crea, nadie asciende a nadie a Root y nadie la bloquea, ni siquiera otro
 * Root. El motivo está en Permisos::ROL_RAIZ.
 */

declare(strict_types=1);

final class ServicioUsuarios
{
    private RepositorioUsuarios $usuarios;
    private Auditoria $auditoria;

    public function __construct(?RepositorioUsuarios $usuarios = null, ?Auditoria $auditoria = null)
    {
        $this->usuarios  = $usuarios ?? new RepositorioUsuarios();
        $this->auditoria = $auditoria ?? new Auditoria();
    }

    public function listar(): array
    {
        Sesion::requerirAdmin();

        return $this->usuarios->listar();
    }

    /**
     * Nombres para el buscador de participantes.
     *
     * Lo puede pedir cualquiera con sesión, pero no todos ven lo mismo: un
     * usuario final solo puede sumar a otros usuarios finales, así que solo
     * se le manda esa parte del directorio. Es la misma regla que aplica
     * ServicioSeguimiento al guardar, acá para no ofrecer lo que después se
     * va a rechazar (y de paso, para no repartir cédulas de más).
     */
    public function directorio(): array
    {
        $usuario = Sesion::requerir();

        $roles = Permisos::esPersonal($usuario) ? null : Permisos::ROLES_USUARIO_FINAL;

        return $this->usuarios->directorio($roles);
    }

    public function crear(array $cuerpo): array
    {
        $actor = Sesion::requerirAdmin();

        $datos = Validador::requeridos($cuerpo, ['cedula', 'nombre', 'email', 'password']);
        $rol   = Validador::enumerado($cuerpo['rol'] ?? 'Docente', Permisos::ROLES, 'rol');

        $this->verificarAlcance($actor, $rol, 'crear');
        $this->verificarRolRaiz($rol, 'crear otra cuenta con ese rol');

        Validador::cedula($datos['cedula']);
        Validador::email($datos['email']);
        Validador::largoMinimo($datos['password'], 6, 'La contraseña debe tener al menos 6 caracteres.');

        $duplicado = $this->usuarios->campoDuplicado($datos['cedula'], $datos['email']);
        if ($duplicado !== null) {
            throw ErrorDeNegocio::conflicto(
                'Ya existe un usuario con esa ' . ($duplicado === 'cedula' ? 'cédula' : 'email') . '.'
            );
        }

        $id = $this->usuarios->crear([
            'cedula'        => $datos['cedula'],
            'nombre'        => $datos['nombre'],
            'email'         => $datos['email'],
            'rol'           => $rol,
            'password_hash' => password_hash($datos['password'], PASSWORD_BCRYPT),
            'iniciales'     => self::iniciales($datos['nombre']),
        ]);

        $nuevo = $this->usuarios->porId($id);
        $this->auditoria->registrar('usuario.crear', 'usuario', (string) $id,
            $nuevo['nombre'] . ' (' . $nuevo['rol'] . ')');

        return $nuevo;
    }

    public function actualizar(int $id, array $cuerpo): array
    {
        $actor    = Sesion::requerirAdmin();
        $objetivo = $this->obtener($id);

        $esUnoMismo = (int) $objetivo['id'] === (int) $actor['id'];

        // Para tocar una cuenta privilegiada ajena hay que ser Root. La cuenta
        // propia se exceptúa: si no, un Administrador no podría ni corregirse
        // el nombre. Cambiarse el rol a uno mismo igual queda prohibido abajo.
        if (!$esUnoMismo) {
            $this->verificarAlcance($actor, $objetivo['rol'], 'modificar');
        }

        $campos  = [];
        $cambios = [];

        if (isset($cuerpo['nombre'])) {
            $nombre = trim((string) $cuerpo['nombre']);
            if ($nombre === '') {
                throw ErrorDeNegocio::datosInvalidos('El nombre no puede quedar vacío.');
            }
            $campos['nombre']    = $nombre;
            $campos['iniciales'] = self::iniciales($nombre);
            $cambios[] = 'nombre';
        }

        if (isset($cuerpo['email'])) {
            $campos['email'] = Validador::email(trim((string) $cuerpo['email']));
            $cambios[] = 'email';
        }

        if (isset($cuerpo['rol'])) {
            $rol = Validador::enumerado($cuerpo['rol'], Permisos::ROLES, 'rol');

            if ($esUnoMismo && $rol !== $actor['rol']) {
                throw ErrorDeNegocio::conflicto('No podés cambiarte el rol a vos mismo.');
            }
            // También hace falta ser Root para ascender a alguien a Administrador.
            $this->verificarAlcance($actor, $rol, 'asignar');

            // Dejar el rol como estaba no es un ascenso: solo se corta si la
            // cuenta no era Root y se la quiere volver Root.
            if (!Permisos::esRolRaiz($objetivo['rol'])) {
                $this->verificarRolRaiz($rol, 'ascender a nadie a ese rol');
            }

            $campos['rol'] = $rol;
            $cambios[] = 'rol → ' . $rol;
        }

        if (isset($cuerpo['password']) && $cuerpo['password'] !== '') {
            $password = (string) $cuerpo['password'];
            Validador::largoMinimo($password, 6, 'La contraseña debe tener al menos 6 caracteres.');
            $campos['password_hash'] = password_hash($password, PASSWORD_BCRYPT);
            $cambios[] = 'contraseña';
        }

        if (!$campos) {
            throw ErrorDeNegocio::datosInvalidos('No se indicó ningún cambio.');
        }

        $this->usuarios->actualizar($id, $campos);

        $actualizado = $this->obtener($id);
        $this->auditoria->registrar('usuario.editar', 'usuario', (string) $id,
            $actualizado['nombre'] . ': ' . implode(', ', $cambios));

        return $actualizado;
    }

    public function cambiarBloqueo(int $id, array $cuerpo): array
    {
        $actor    = Sesion::requerirAdmin();
        $objetivo = $this->obtener($id);

        if (!array_key_exists('bloqueado', $cuerpo)) {
            throw ErrorDeNegocio::datosInvalidos('Falta indicar el campo "bloqueado".');
        }
        $bloqueado = filter_var($cuerpo['bloqueado'], FILTER_VALIDATE_BOOLEAN);

        if ((int) $objetivo['id'] === (int) $actor['id']) {
            throw ErrorDeNegocio::conflicto('No podés bloquearte a vos mismo.');
        }

        $this->verificarAlcance($actor, $objetivo['rol'], 'bloquear');

        // La cuenta de origen no se bloquea, la pida quien la pida. Desbloquearla
        // sí se permite: es la salida si quedó bloqueada desde la base.
        if ($bloqueado && Permisos::esRolRaiz($objetivo['rol'])) {
            throw ErrorDeNegocio::conflicto('La cuenta Root no se puede bloquear, ni siquiera desde otra cuenta Root.');
        }

        $this->usuarios->cambiarBloqueo($id, $bloqueado);

        $this->auditoria->registrar(
            $bloqueado ? 'usuario.bloquear' : 'usuario.desbloquear',
            'usuario',
            (string) $id,
            $objetivo['nombre']
        );

        return $this->obtener($id);
    }

    /** Busca un usuario o corta con 404. */
    private function obtener(int $id): array
    {
        $usuario = $this->usuarios->porId($id);
        if ($usuario === null) {
            throw ErrorDeNegocio::noEncontrado('El usuario indicado no existe.');
        }

        return $usuario;
    }

    /**
     * Comprueba que quien hace la petición pueda administrar una cuenta con
     * ese rol. Un Administrador no puede crear otro Administrador ni tocar al Root.
     */
    private function verificarAlcance(array $actor, string $rolObjetivo, string $accion): void
    {
        if (in_array($rolObjetivo, Permisos::ROLES_ADMIN, true)
            && !Permisos::rolPuede($actor['rol'], 'usuarios.gestionarAdmins')) {
            throw ErrorDeNegocio::sinPermiso(
                'Solo un usuario Root puede ' . $accion . ' cuentas con rol ' . $rolObjetivo . '.'
            );
        }
    }

    /**
     * Corta cualquier intento de repartir el rol Root.
     *
     * No mira quién lo pide a propósito: no es una cuestión de jerarquía sino
     * una cuenta que el sistema no administra. Un Root que necesite otro lo
     * hace en la base, dejando rastro fuera de la aplicación.
     */
    private function verificarRolRaiz(string $rolPedido, string $accion): void
    {
        if (Permisos::esRolRaiz($rolPedido)) {
            throw ErrorDeNegocio::conflicto(
                'El rol Root es único del sistema: no se puede ' . $accion . '.'
            );
        }
    }

    /** Iniciales a partir del nombre: "Ana Gómez" → "AG". */
    private static function iniciales(string $nombre): string
    {
        $partes    = preg_split('/\s+/u', trim($nombre)) ?: [];
        $iniciales = '';

        foreach (array_slice($partes, 0, 2) as $parte) {
            if ($parte !== '') {
                $iniciales .= Texto::mayusculas(Texto::primerCaracter($parte));
            }
        }

        return $iniciales !== '' ? $iniciales : '?';
    }
}
