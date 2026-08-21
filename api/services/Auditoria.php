<?php
/**
 * Registro de auditoría: deja constancia de quién hizo qué y cuándo.
 *
 * Se llama desde los servicios después de que la operación salió bien. Nunca
 * interrumpe la petición: si por lo que sea no se puede escribir el registro,
 * queda la queja en el log del servidor y la operación sigue adelante. Es
 * preferible perder una línea de auditoría antes que hacer fallar un alta que
 * ya se guardó.
 */

declare(strict_types=1);

final class Auditoria
{
    /** Acciones que se registran, con su descripción para la pantalla. */
    public const ACCIONES = [
        'sesion.iniciar'            => 'Inició sesión',
        'sesion.cerrar'             => 'Cerró sesión',
        'sesion.rechazada'          => 'Intento de acceso fallido',
        'usuario.crear'             => 'Creó un usuario',
        'usuario.editar'            => 'Editó un usuario',
        'usuario.bloquear'          => 'Bloqueó un usuario',
        'usuario.desbloquear'       => 'Desbloqueó un usuario',
        'usuario.password'          => 'Cambió su contraseña',
        'usuario.password.rechazado' => 'Intento fallido de cambio de contraseña',
        'equipo.crear'              => 'Registró un equipo',
        'componente.crear'          => 'Registró un componente',
        'ticket.crear'              => 'Creó un ticket',
        'ticket.estado'             => 'Cambió el estado de un ticket',
        'prestamo.crear'            => 'Registró un préstamo',
        'prestamo.estado'           => 'Cambió el estado de un préstamo',
        'solicitud.crear'           => 'Creó una solicitud',
        'solicitud.estado'          => 'Cambió el estado de una solicitud',
    ];

    private const LARGO_DETALLE = 255;

    private RepositorioAuditoria $repositorio;

    public function __construct(?RepositorioAuditoria $repositorio = null)
    {
        $this->repositorio = $repositorio ?? new RepositorioAuditoria();
    }

    /**
     * Escribe una línea de auditoría.
     *
     * @param array|null $actor Quién lo hizo. Si no se pasa, se toma de la sesión.
     */
    public function registrar(
        string $accion,
        ?string $entidad = null,
        ?string $entidadId = null,
        ?string $detalle = null,
        ?array $actor = null
    ): void {
        try {
            $actor = $actor ?? Sesion::usuario();

            $this->repositorio->registrar(
                isset($actor['id']) ? (int) $actor['id'] : null,
                $actor['nombre'] ?? 'Anónimo',
                $actor['rol'] ?? '—',
                $accion,
                $entidad,
                $entidadId,
                $detalle !== null ? self::recortar($detalle, self::LARGO_DETALLE) : null
            );
        } catch (Throwable $e) {
            // La auditoría no puede tumbar la operación que la originó.
            error_log('Eternum auditoría: ' . $e->getMessage());
        }
    }

    /** Recorta un texto a N caracteres sin depender de mbstring. */
    private static function recortar(string $texto, int $largo): string
    {
        if (Texto::largo($texto) <= $largo) {
            return $texto;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($texto, 0, $largo, 'UTF-8');
        }

        preg_match('/^.{0,' . $largo . '}/us', $texto, $m);

        return $m[0] ?? '';
    }
}
