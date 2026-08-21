<?php
/**
 * Matriz de permisos por rol (capa de negocio: services).
 *
 * Es la ÚNICA fuente de verdad: la usa el backend para autorizar y la pantalla
 * "Permisos por rol" la muestra tal cual, pidiéndola por la API. Así la tabla
 * que se ve nunca queda desfasada de lo que el sistema hace de verdad.
 */

declare(strict_types=1);

final class Permisos
{
    public const ROLES = ['Root', 'Administrador', 'Tecnico', 'Docente'];

    /** Personal del área: ve y opera todo el trabajo, no solo lo propio. */
    public const ROLES_PERSONAL = ['Root', 'Administrador', 'Tecnico'];

    /** Roles con acceso a la sección administrativa. */
    public const ROLES_ADMIN = ['Root', 'Administrador'];

    /** Usuarios finales: los que piden, no los que resuelven. */
    public const ROLES_USUARIO_FINAL = ['Docente'];

    /**
     * La cuenta de origen del sistema.
     *
     * Es una sola y no se administra desde la aplicación: no se puede crear
     * otra ni ascender a nadie a este rol, y tampoco se la puede bloquear.
     * La razón es que Root es la llave que abre todo, incluida la gestión de
     * los propios administradores: si se pudiera repartir, dejaría de ser
     * rastreable quién tiene el control; y si se pudiera bloquear, dos Root
     * enojados podrían dejarse afuera el uno al otro y nadie podría entrar a
     * arreglarlo. Los cambios sobre esta cuenta se hacen en la base.
     */
    public const ROL_RAIZ = 'Root';

    /** Cada permiso indica qué roles lo tienen, agrupados por módulo. */
    public const MATRIZ = [
        'Inicio' => [
            'inicio.verEquipos'     => ['clave' => 'Ver el estado de los equipos por ubicación', 'roles' => self::ROLES],
            'inicio.verCola'        => ['clave' => 'Ver la carga de trabajo del área',           'roles' => self::ROLES_PERSONAL],
        ],
        'Inventario' => [
            'inventario.ver'        => ['clave' => 'Entrar al inventario completo',   'roles' => self::ROLES_PERSONAL],
            'inventario.crear'      => ['clave' => 'Registrar equipos y componentes', 'roles' => self::ROLES_PERSONAL],
        ],
        'Tickets' => [
            'tickets.verPropios'    => ['clave' => 'Ver los tickets propios y en los que participa', 'roles' => self::ROLES],
            'tickets.verTodos'      => ['clave' => 'Ver los tickets de todo el sistema', 'roles' => self::ROLES_PERSONAL],
            'tickets.crear'         => ['clave' => 'Crear tickets',                      'roles' => self::ROLES],
            'tickets.participantes' => ['clave' => 'Sumar a otro usuario a un ticket',   'roles' => self::ROLES],
            'tickets.cambiarEstado' => ['clave' => 'Avanzar el estado dejando una nota', 'roles' => self::ROLES_PERSONAL],
        ],
        'Préstamos' => [
            'prestamos.ver'         => ['clave' => 'Ver préstamos',         'roles' => self::ROLES_PERSONAL],
            'prestamos.crear'       => ['clave' => 'Registrar préstamos',   'roles' => self::ROLES_PERSONAL],
            'prestamos.devolver'    => ['clave' => 'Marcar una devolución', 'roles' => self::ROLES_PERSONAL],
        ],
        'Solicitudes' => [
            'solicitudes.verPropias'    => ['clave' => 'Ver las solicitudes propias y en las que participa', 'roles' => self::ROLES],
            'solicitudes.verTodas'      => ['clave' => 'Ver las solicitudes de todo el sistema', 'roles' => self::ROLES_PERSONAL],
            'solicitudes.crear'         => ['clave' => 'Crear solicitudes',                      'roles' => self::ROLES],
            'solicitudes.cambiarEstado' => ['clave' => 'Cambiar el estado dejando una nota',     'roles' => self::ROLES_PERSONAL],
        ],
        'Administración' => [
            'usuarios.ver'             => ['clave' => 'Ver la lista de usuarios', 'roles' => self::ROLES_ADMIN],
            'usuarios.crear'           => ['clave' => 'Crear usuarios',           'roles' => self::ROLES_ADMIN],
            'usuarios.editar'          => ['clave' => 'Editar datos y rol',       'roles' => self::ROLES_ADMIN],
            'usuarios.bloquear'        => ['clave' => 'Bloquear y desbloquear',   'roles' => self::ROLES_ADMIN],
            'usuarios.gestionarAdmins' => ['clave' => 'Gestionar cuentas Root y Administrador', 'roles' => ['Root']],
            // Sin ningún rol: no es que falte permiso, es que el sistema no lo
            // hace. Se listan igual para que la tabla lo diga en voz alta.
            'usuarios.crearRoot'       => ['clave' => 'Crear una cuenta Root o ascender a alguien a Root', 'roles' => []],
            'usuarios.bloquearRoot'    => ['clave' => 'Bloquear una cuenta Root', 'roles' => []],
            'permisos.ver'             => ['clave' => 'Ver la matriz de permisos', 'roles' => self::ROLES_ADMIN],
        ],
    ];

    /** ¿Este rol tiene ese permiso? */
    public static function rolPuede(string $rol, string $permiso): bool
    {
        foreach (self::MATRIZ as $modulo) {
            if (isset($modulo[$permiso])) {
                return in_array($rol, $modulo[$permiso]['roles'], true);
            }
        }

        return false;
    }

    /** ¿Es el rol de la cuenta de origen? */
    public static function esRolRaiz(string $rol): bool
    {
        return $rol === self::ROL_RAIZ;
    }

    /** ¿Es personal del área (ve y opera todo) o usuario final (ve lo suyo)? */
    public static function esPersonal(?array $usuario): bool
    {
        return $usuario !== null && in_array($usuario['rol'], self::ROLES_PERSONAL, true);
    }

    public static function esAdmin(?array $usuario): bool
    {
        return $usuario !== null && in_array($usuario['rol'], self::ROLES_ADMIN, true);
    }

    /**
     * Hasta dónde llega la vista de este usuario en tickets y solicitudes.
     *
     * El personal del área ve todo. El resto ve lo que pidió y aquello a lo
     * que lo agregaron. Devuelve una descripción del alcance, no una consulta:
     * traducirlo a SQL es tarea de la capa de datos, que es la única que sabe
     * cómo están guardados los participantes.
     *
     * IMPORTANTE: el recorte termina ocurriendo en la base. Ocultar filas en
     * el navegador no alcanzaría, porque cualquiera puede pedirle la lista
     * completa a la API.
     *
     * @return array{alcance: string, usuarioId?: int}
     */
    public static function alcanceVisible(array $usuario): array
    {
        if (self::esPersonal($usuario)) {
            return ['alcance' => 'todo'];
        }

        return ['alcance' => 'propios', 'usuarioId' => (int) $usuario['id']];
    }

    /** La matriz en el formato que dibuja la pantalla: un booleano por rol. */
    public static function paraPantalla(): array
    {
        $modulos = [];

        foreach (self::MATRIZ as $nombreModulo => $lista) {
            $acciones = [];
            foreach ($lista as $id => $info) {
                $acciones[] = [
                    'id'          => $id,
                    'descripcion' => $info['clave'],
                    'roles'       => array_combine(
                        self::ROLES,
                        array_map(
                            static fn(string $rol): bool => in_array($rol, $info['roles'], true),
                            self::ROLES
                        )
                    ),
                ];
            }
            $modulos[] = ['modulo' => $nombreModulo, 'acciones' => $acciones];
        }

        return [
            'roles'   => self::ROLES,
            'modulos' => $modulos,
            'notas'   => [
                'Root'          => 'Control total. Es el único que puede gestionar cuentas Administrador. Su propia cuenta es única: no se crea otra ni se bloquea desde el sistema.',
                'Administrador' => 'Gestiona el sistema y a los usuarios Técnico y Docente.',
                'Tecnico'       => 'Opera el día a día: inventario, tickets, solicitudes y préstamos.',
                'Docente'       => 'Ve el estado de los equipos, abre tickets y solicitudes, y sigue únicamente los suyos.',
            ],
        ];
    }
}
