<?php
/**
 * Tickets de la mesa de ayuda.
 *
 * Quién ve qué: el personal del área (Root, Administrador, Técnico) ve todos
 * los tickets; el resto ve únicamente los que abrió y aquellos a los que lo
 * agregaron como participante, sin importar en qué estado estén.
 */

declare(strict_types=1);

final class ServicioTickets
{
    public const ESTADOS = ['pendiente', 'en_progreso', 'en_resolucion', 'resuelto'];

    /** Estados que cuentan como "todavía abierto" en los resúmenes. */
    public const ESTADOS_ABIERTOS = ['pendiente', 'en_progreso', 'en_resolucion'];

    private const ENTIDAD = 'ticket';

    private RepositorioTickets $tickets;
    private RepositorioUsuarios $usuarios;
    private ServicioInventario $inventario;
    private ServicioSeguimiento $seguimiento;
    private Auditoria $auditoria;

    public function __construct(
        ?RepositorioTickets $tickets = null,
        ?RepositorioUsuarios $usuarios = null,
        ?ServicioInventario $inventario = null,
        ?ServicioSeguimiento $seguimiento = null,
        ?Auditoria $auditoria = null
    ) {
        $this->tickets     = $tickets ?? new RepositorioTickets();
        $this->usuarios    = $usuarios ?? new RepositorioUsuarios();
        $this->inventario  = $inventario ?? new ServicioInventario();
        $this->seguimiento = $seguimiento ?? new ServicioSeguimiento();
        $this->auditoria   = $auditoria ?? new Auditoria();
    }

    public function listar(): array
    {
        $usuario = Sesion::requerir();

        return $this->tickets->listar(Permisos::alcanceVisible($usuario));
    }

    /** Ficha completa: datos, participantes y línea de tiempo. */
    public function detalle(int $id): array
    {
        $usuario = Sesion::requerir();
        $ticket  = $this->obtener($id);

        if (!$this->seguimiento->puedeVer(self::ENTIDAD, $ticket, $usuario)) {
            throw ErrorDeNegocio::sinPermiso('Este ticket no es tuyo y no te agregaron a él.');
        }

        return $this->conSeguimiento($ticket);
    }

    public function crear(array $cuerpo): array
    {
        $usuario = Sesion::requerir();
        $datos   = Validador::requeridos($cuerpo, ['titulo']);

        // El ticket queda a nombre de quien lo crea. El personal del área puede
        // abrirlo en nombre de otra persona (por ejemplo, cuando el pedido llega
        // por teléfono), pero un usuario final solo puede abrir los suyos.
        $solicitanteId = (int) $usuario['id'];
        if (Permisos::esPersonal($usuario) && !empty($cuerpo['solicitanteId'])) {
            $solicitanteId = (int) $cuerpo['solicitanteId'];
        }

        $solicitante = $this->usuarios->nombrePorId($solicitanteId);
        if ($solicitante === null) {
            throw ErrorDeNegocio::datosInvalidos('El solicitante indicado no existe.');
        }

        $equipoId    = $this->inventario->resolverEquipo($cuerpo['equipoId'] ?? null);
        $descripcion = Validador::opcional($cuerpo, 'descripcion');

        $emitido = Nomenclatura::emitir(
            'TK',
            fn(): ?string => $this->tickets->ultimoCodigoDelAnio(Nomenclatura::prefijoDelAnio('TK')),
            fn(string $codigo): int => $this->tickets->crear([
                'codigo'        => $codigo,
                'titulo'        => $datos['titulo'],
                'descripcion'   => $descripcion,
                'equipoId'      => $equipoId,
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
            'Ticket abierto por ' . $usuario['nombre'] . '.');

        $this->auditoria->registrar('ticket.crear', 'ticket', $emitido['codigo'], $datos['titulo']);

        return $this->conSeguimiento($this->obtener($id));
    }

    /**
     * Avanza el estado.
     *
     * Solo el personal del área lo puede hacer, y la nota es obligatoria: es
     * lo que después se lee en la línea de tiempo del ticket.
     */
    public function cambiarEstado(int $id, array $cuerpo): array
    {
        Sesion::requerirPersonal();

        $estado = Validador::enumerado($cuerpo['estado'] ?? null, self::ESTADOS, 'estado');
        $nota   = Validador::opcional($cuerpo, 'nota');

        if ($nota === null || Texto::largo($nota) < 5) {
            throw ErrorDeNegocio::datosInvalidos(
                'Contá en la nota qué se hizo (al menos 5 caracteres): queda en la línea de tiempo del ticket.'
            );
        }

        $actual = $this->obtener($id);

        $this->tickets->cambiarEstado($id, $estado);
        $this->seguimiento->registrar(self::ENTIDAD, $id, $estado, $nota);

        $this->auditoria->registrar('ticket.estado', 'ticket', $actual['codigo'],
            $actual['titulo'] . ' → ' . $estado);

        return $this->conSeguimiento($this->obtener($id));
    }

    /** Cuántos tiene esa persona, para el resumen del inicio. */
    public function resumenDeUsuario(int $usuarioId): array
    {
        return $this->tickets->contarDeUsuario($usuarioId, self::ESTADOS_ABIERTOS);
    }

    private function obtener(int $id): array
    {
        $ticket = $this->tickets->porId($id);
        if ($ticket === null) {
            throw ErrorDeNegocio::noEncontrado('El ticket indicado no existe.');
        }

        return $ticket;
    }

    private function conSeguimiento(array $ticket): array
    {
        $id = (int) $ticket['id'];

        $ticket['participantes'] = $this->seguimiento->participantes(self::ENTIDAD, $id);
        $ticket['historial']     = $this->seguimiento->historial(self::ENTIDAD, $id);

        return $ticket;
    }
}
