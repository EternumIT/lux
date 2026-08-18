<?php
/**
 * Registro de auditoría: deja constancia de quién hizo qué y cuándo.
 *
 * La función auditar() se llama desde los controladores después de que la
 * operación salió bien. Nunca interrumpe la petición: si por lo que sea no se
 * puede escribir el registro, se deja la queja en el log del servidor y la
 * operación del usuario sigue adelante. Es preferible perder una línea de
 * auditoría antes que hacer fallar un alta que ya se guardó.
 */

declare(strict_types=1);

/** Acciones que se registran, con su descripción para la pantalla. */
const ACCIONES_AUDITADAS = [
    'sesion.iniciar'      => 'Inició sesión',
    'sesion.cerrar'       => 'Cerró sesión',
    'sesion.rechazada'    => 'Intento de acceso fallido',
    'usuario.crear'       => 'Creó un usuario',
    'usuario.editar'      => 'Editó un usuario',
    'usuario.bloquear'    => 'Bloqueó un usuario',
    'usuario.desbloquear' => 'Desbloqueó un usuario',
    'equipo.crear'        => 'Registró un equipo',
    'componente.crear'    => 'Registró un componente',
    'ticket.crear'        => 'Creó un ticket',
    'ticket.estado'       => 'Cambió el estado de un ticket',
    'prestamo.crear'      => 'Registró un préstamo',
    'prestamo.estado'     => 'Cambió el estado de un préstamo',
    'solicitud.crear'     => 'Creó una solicitud',
];

/**
 * Escribe una línea de auditoría.
 *
 * @param string      $accion    Una de las claves de ACCIONES_AUDITADAS.
 * @param string|null $entidad   Sobre qué se actuó: 'usuario', 'equipo'...
 * @param string|null $entidadId Identificador de esa entidad.
 * @param string|null $detalle   Texto corto y legible con el contexto.
 * @param array|null  $actor     Quién lo hizo. Si no se pasa, se toma de la sesión.
 */
function auditar(
    string $accion,
    ?string $entidad = null,
    ?string $entidadId = null,
    ?string $detalle = null,
    ?array $actor = null
): void {
    try {
        $actor = $actor ?? usuario_actual();

        $stmt = db()->prepare(
            'INSERT INTO auditoria
                (usuario_id, usuario_nombre, usuario_rol, accion, entidad, entidad_id, detalle)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $actor['id'] ?? null,
            $actor['nombre'] ?? 'Anónimo',
            $actor['rol'] ?? '—',
            $accion,
            $entidad,
            $entidadId,
            $detalle !== null ? mb_substr_compat($detalle, 255) : null,
        ]);
    } catch (Throwable $e) {
        // La auditoría no puede tumbar la operación que la originó.
        error_log('Eternum auditoría: ' . $e->getMessage());
    }
}

/** Recorta un texto a N caracteres sin depender de mbstring. */
function mb_substr_compat(string $texto, int $largo): string
{
    if (texto_largo($texto) <= $largo) {
        return $texto;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($texto, 0, $largo, 'UTF-8');
    }

    preg_match('/^.{0,' . $largo . '}/us', $texto, $m);
    return $m[0] ?? '';
}
