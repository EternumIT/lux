<?php
/**
 * Solicitudes de servicio.
 *
 * Mismo criterio que los tickets: el personal del área ve y mueve todas; el
 * usuario final ve las suyas y aquellas a las que lo agregaron.
 */

declare(strict_types=1);

final class ServicioSolicitudes
{
    public const ESTADOS = ['pendiente', 'aprobado', 'en_progreso', 'completado', 'rechazado'];

    /** Estados que cuentan como "todavía abierta" en los resúmenes. */
    public const ESTADOS_ABIERTOS = ['pendiente', 'aprobado', 'en_progreso'];

    private const ENTIDAD = 'solicitud';

    private RepositorioSolicitudes $solicitudes;
    private RepositorioUsuarios $usuarios;
    private ServicioSeguimiento $seguimiento;
    private Auditoria $auditoria;

    public function __construct(
        ?RepositorioSolicitudes $solicitudes = null,
        ?RepositorioUsuarios $usuarios = null,
        ?ServicioSeguimiento $seguimiento = null,
        ?Auditoria $auditoria = null
    ) {
        $this->solicitudes = $solicitudes ?? new RepositorioSolicitudes();
        $this->usuarios    = $usuarios ?? new RepositorioUsuarios();
        $this->seguimiento = $seguimiento ?? new ServicioSeguimiento();
        $this->auditoria   = $auditoria ?? new Auditoria();
    }

    public function listar(): array
    {
        $usuario = Sesion::requerir();

        return $this->solicitudes->listar(Permisos::alcanceVisible($usuario));
    }

    public function detalle(int $id): array
    {
        $usuario   = Sesion::requerir();
        $solicitud = $this->obtener($id);

        if (!$this->seguimiento->puedeVer(self::ENTIDAD, $solicitud, $usuario)) {
            throw ErrorDeNegocio::sinPermiso('Esta solicitud no es tuya y no te agregaron a ella.');
        }

        return $this->conSeguimiento($solicitud);
    }

    public function crear(array $cuerpo): array
    {
        $usuario = Sesion::requerir();
        $datos   = Validador::requeridos($cuerpo, ['titulo']);

        $solicitanteId = (int) $usuario['id'];
        if (Permisos::esPersonal($usuario) && !empty($cuerpo['solicitanteId'])) {
            $solicitanteId = (int) $cuerpo['solicitanteId'];
        }

        $solicitante = $this->usuarios->nombrePorId($solicitanteId);
        if ($solicitante === null) {
            throw ErrorDeNegocio::datosInvalidos('El solicitante indicado no existe.');
        }

        $detalle = Validador::opcional($cuerpo, 'detalle');

        $emitido = Nomenclatura::emitir(
            'SL',
            fn(): ?string => $this->solicitudes->ultimoCodigoDelAnio(Nomenclatura::prefijoDelAnio('SL')),
            fn(string $codigo): int => $this->solicitudes->crear([
                'codigo'        => $codigo,
                'titulo'        => $datos['titulo'],
                'detalle'       => $detalle,
                'solicitante'   => $solicitante,
                'solicitanteId' => $solicitanteId,
            ])
        );

        $id = $emitido['id'];

        $this->seguimiento->definirParticipantes(
            self::ENTIDAD,
            $id,
            (array) ($cuerpo['participantes'] ?? []),
            $solicitanteId
        );

        $this->seguimiento->registrar(self::ENTIDAD, $id, 'pendiente',
            'Solicitud enviada por ' . $usuario['nombre'] . '.');

        $this->auditoria->registrar('solicitud.crear', 'solicitud', $emitido['codigo'], $datos['titulo']);

        return $this->conSeguimiento($this->obtener($id));
    }

    public function cambiarEstado(int $id, array $cuerpo): array
    {
        Sesion::requerirPersonal();

        $estado = Validador::enumerado($cuerpo['estado'] ?? null, self::ESTADOS, 'estado');
        $nota   = Validador::opcional($cuerpo, 'nota');

        if ($nota === null || Texto::largo($nota) < 5) {
            throw ErrorDeNegocio::datosInvalidos(
                'Contá en la nota qué se resolvió (al menos 5 caracteres): queda en la línea de tiempo de la solicitud.'
            );
        }

        $actual = $this->obtener($id);

        $this->solicitudes->cambiarEstado($id, $estado);
        $this->seguimiento->registrar(self::ENTIDAD, $id, $estado, $nota);

        $this->auditoria->registrar('solicitud.estado', 'solicitud', $actual['codigo'],
            $actual['titulo'] . ' → ' . $estado);

        return $this->conSeguimiento($this->obtener($id));
    }

    public function resumenDeUsuario(int $usuarioId): array
    {
        return $this->solicitudes->contarDeUsuario($usuarioId, self::ESTADOS_ABIERTOS);
    }

    private function obtener(int $id): array
    {
        $solicitud = $this->solicitudes->porId($id);
        if ($solicitud === null) {
            throw ErrorDeNegocio::noEncontrado('La solicitud indicada no existe.');
        }

        return $solicitud;
    }

    private function conSeguimiento(array $solicitud): array
    {
        $id = (int) $solicitud['id'];

        $solicitud['participantes'] = $this->seguimiento->participantes(self::ENTIDAD, $id);
        $solicitud['historial']     = $this->seguimiento->historial(self::ENTIDAD, $id);

        return $solicitud;
    }
}
