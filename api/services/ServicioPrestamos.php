<?php
/**
 * Préstamos de equipos.
 *
 * Los administra el personal del área: el usuario final no tiene esta sección
 * (pide lo que necesita por una solicitud de servicio).
 */

declare(strict_types=1);

final class ServicioPrestamos
{
    public const ESTADOS = ['pendiente', 'aprobado', 'activo', 'vencido', 'devuelto'];

    private const ENTIDAD = 'prestamo';

    private RepositorioPrestamos $prestamos;
    private RepositorioUsuarios $usuarios;
    private ServicioInventario $inventario;
    private ServicioSeguimiento $seguimiento;
    private Auditoria $auditoria;

    public function __construct(
        ?RepositorioPrestamos $prestamos = null,
        ?RepositorioUsuarios $usuarios = null,
        ?ServicioInventario $inventario = null,
        ?ServicioSeguimiento $seguimiento = null,
        ?Auditoria $auditoria = null
    ) {
        $this->prestamos   = $prestamos ?? new RepositorioPrestamos();
        $this->usuarios    = $usuarios ?? new RepositorioUsuarios();
        $this->inventario  = $inventario ?? new ServicioInventario();
        $this->seguimiento = $seguimiento ?? new ServicioSeguimiento();
        $this->auditoria   = $auditoria ?? new Auditoria();
    }

    public function listar(): array
    {
        Sesion::requerirPersonal();
        $this->prestamos->marcarVencidos();

        return $this->prestamos->listar();
    }

    public function detalle(int $id): array
    {
        Sesion::requerirPersonal();

        $prestamo = $this->obtener($id);
        $prestamo['historial'] = $this->seguimiento->historial(self::ENTIDAD, $id);

        return $prestamo;
    }

    public function crear(array $cuerpo): array
    {
        $usuario     = Sesion::requerirPersonal();
        $fechaLimite = Validador::fecha($cuerpo['fechaLimite'] ?? null, 'fechaLimite');

        // El préstamo puede quedar a nombre de una cuenta del sistema o, si no
        // existe, del nombre escrito a mano (por ejemplo alguien de otra área).
        $solicitanteId = !empty($cuerpo['solicitanteId']) ? (int) $cuerpo['solicitanteId'] : null;
        $solicitante   = Validador::opcional($cuerpo, 'solicitante');

        if ($solicitanteId !== null) {
            $nombre = $this->usuarios->nombrePorId($solicitanteId);
            if ($nombre === null) {
                throw ErrorDeNegocio::datosInvalidos('El solicitante indicado no existe.');
            }
            $solicitante = $nombre;
        }

        if ($solicitante === null) {
            throw ErrorDeNegocio::datosInvalidos('Faltan campos obligatorios: solicitante');
        }

        $equipoId = $this->inventario->resolverEquipo($cuerpo['equipoId'] ?? null);
        $estado   = isset($cuerpo['estado'])
            ? Validador::enumerado($cuerpo['estado'], self::ESTADOS, 'estado')
            : 'activo';

        $emitido = Nomenclatura::emitir(
            'PR',
            fn(): ?string => $this->prestamos->ultimoCodigoDelAnio(Nomenclatura::prefijoDelAnio('PR')),
            fn(string $codigo): int => $this->prestamos->crear([
                'codigo'        => $codigo,
                'equipoId'      => $equipoId,
                'solicitante'   => $solicitante,
                'solicitanteId' => $solicitanteId,
                'fechaLimite'   => $fechaLimite,
                'estado'        => $estado,
            ])
        );

        $id = $emitido['id'];

        $this->seguimiento->registrar(self::ENTIDAD, $id, $estado,
            'Préstamo registrado por ' . $usuario['nombre'] . ', con devolución el ' . $fechaLimite . '.');

        $this->auditoria->registrar('prestamo.crear', 'prestamo', $emitido['codigo'],
            'Para ' . $solicitante . ' hasta ' . $fechaLimite);

        return $this->obtener($id);
    }

    public function cambiarEstado(int $id, array $cuerpo): array
    {
        Sesion::requerirPersonal();

        $estado = Validador::enumerado($cuerpo['estado'] ?? null, self::ESTADOS, 'estado');
        $nota   = Validador::opcional($cuerpo, 'nota');

        $actual = $this->obtener($id);

        $this->prestamos->cambiarEstado($id, $estado);
        $this->seguimiento->registrar(self::ENTIDAD, $id, $estado,
            $nota ?? ('Estado cambiado a ' . $estado . '.'));

        $this->auditoria->registrar('prestamo.estado', 'prestamo', $actual['codigo'],
            $actual['solicitante'] . ' → ' . $estado);

        return $this->obtener($id);
    }

    /** Deja al día los vencimientos sin listar nada (lo usa el resumen del inicio). */
    public function actualizarVencimientos(): void
    {
        $this->prestamos->marcarVencidos();
    }

    private function obtener(int $id): array
    {
        $prestamo = $this->prestamos->porId($id);
        if ($prestamo === null) {
            throw ErrorDeNegocio::noEncontrado('El préstamo indicado no existe.');
        }

        return $prestamo;
    }
}
