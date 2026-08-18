<?php
/**
 * Matriz de permisos por rol.
 *
 * Es la ÚNICA fuente de verdad: la usa el backend para autorizar y la pantalla
 * "Permisos por rol" la muestra tal cual, pidiéndola por la API. Así la tabla
 * que se ve en pantalla no puede quedar desactualizada respecto a lo que el
 * sistema hace de verdad.
 */

declare(strict_types=1);

const ROLES = ['Root', 'Administrador', 'Tecnico', 'Docente'];

/**
 * Cada permiso indica qué roles lo tienen.
 * Agrupados por módulo para poder mostrarlos ordenados.
 */
const PERMISOS = [
    'Inventario' => [
        'inventario.ver'        => ['clave' => 'Ver equipos y componentes',   'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
        'inventario.crear'      => ['clave' => 'Registrar equipos y componentes', 'roles' => ['Root', 'Administrador', 'Tecnico']],
    ],
    'Tickets' => [
        'tickets.ver'           => ['clave' => 'Ver tickets',                 'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
        'tickets.crear'         => ['clave' => 'Crear tickets',               'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
        'tickets.cambiarEstado' => ['clave' => 'Cambiar el estado de un ticket', 'roles' => ['Root', 'Administrador', 'Tecnico']],
    ],
    'Préstamos' => [
        'prestamos.ver'         => ['clave' => 'Ver préstamos',               'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
        'prestamos.crear'       => ['clave' => 'Registrar préstamos',         'roles' => ['Root', 'Administrador', 'Tecnico']],
        'prestamos.devolver'    => ['clave' => 'Marcar una devolución',       'roles' => ['Root', 'Administrador', 'Tecnico']],
    ],
    'Solicitudes' => [
        'solicitudes.ver'       => ['clave' => 'Ver solicitudes',             'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
        'solicitudes.crear'     => ['clave' => 'Crear solicitudes',           'roles' => ['Root', 'Administrador', 'Tecnico', 'Docente']],
    ],
    'Administración' => [
        'usuarios.ver'          => ['clave' => 'Ver la lista de usuarios',    'roles' => ['Root', 'Administrador']],
        'usuarios.crear'        => ['clave' => 'Crear usuarios',              'roles' => ['Root', 'Administrador']],
        'usuarios.editar'       => ['clave' => 'Editar datos y rol',          'roles' => ['Root', 'Administrador']],
        'usuarios.bloquear'     => ['clave' => 'Bloquear y desbloquear',      'roles' => ['Root', 'Administrador']],
        'usuarios.gestionarAdmins' => ['clave' => 'Gestionar cuentas Root y Administrador', 'roles' => ['Root']],
        'permisos.ver'          => ['clave' => 'Ver la matriz de permisos',   'roles' => ['Root', 'Administrador']],
    ],
];

/** ¿Este rol tiene ese permiso? */
function rol_puede(string $rol, string $permiso): bool
{
    foreach (PERMISOS as $modulo) {
        if (isset($modulo[$permiso])) {
            return in_array($rol, $modulo[$permiso]['roles'], true);
        }
    }

    return false;
}

/** GET /permisos — devuelve la matriz para que la pantalla la dibuje. */
function permisos_listar(): never
{
    requerir_rol(['Root', 'Administrador']);

    $modulos = [];
    foreach (PERMISOS as $nombreModulo => $lista) {
        $acciones = [];
        foreach ($lista as $id => $info) {
            $acciones[] = [
                'id'          => $id,
                'descripcion' => $info['clave'],
                // Un booleano por rol: la pantalla solo dibuja tildes o guiones.
                'roles'       => array_combine(
                    ROLES,
                    array_map(
                        static fn(string $rol): bool => in_array($rol, $info['roles'], true),
                        ROLES
                    )
                ),
            ];
        }
        $modulos[] = ['modulo' => $nombreModulo, 'acciones' => $acciones];
    }

    json_response([
        'roles'    => ROLES,
        'modulos'  => $modulos,
        'notas'    => [
            'Root' => 'Control total. Es el único que puede crear o modificar cuentas Root y Administrador.',
            'Administrador' => 'Gestiona el sistema y a los usuarios Técnico y Docente.',
            'Tecnico' => 'Opera el día a día: inventario, tickets y préstamos.',
            'Docente' => 'Consulta información y pide tickets o solicitudes.',
        ],
    ]);
}
