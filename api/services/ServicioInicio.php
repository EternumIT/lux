<?php
/**
 * Resumen de la pantalla de inicio.
 *
 * El inicio no es un tablero de métricas del sistema: es lo que la persona
 * que entró necesita para arrancar. Por eso la respuesta depende del rol.
 *
 *   Docente  → sus tickets y solicitudes abiertos, y nada más.
 *   Personal → la carga de trabajo del área (lo que está esperando a alguien).
 *
 * El listado de equipos del inicio no viaja acá: se pide a /equipos, que ya
 * sabe filtrar por ubicación.
 */

declare(strict_types=1);

final class ServicioInicio
{
    private RepositorioEquipos $equipos;
    private RepositorioTickets $tickets;
    private RepositorioSolicitudes $solicitudes;
    private RepositorioPrestamos $prestamos;

    public function __construct(
        ?RepositorioEquipos $equipos = null,
        ?RepositorioTickets $tickets = null,
        ?RepositorioSolicitudes $solicitudes = null,
        ?RepositorioPrestamos $prestamos = null
    ) {
        $this->equipos     = $equipos ?? new RepositorioEquipos();
        $this->tickets     = $tickets ?? new RepositorioTickets();
        $this->solicitudes = $solicitudes ?? new RepositorioSolicitudes();
        $this->prestamos   = $prestamos ?? new RepositorioPrestamos();
    }

    public function resumen(): array
    {
        $usuario = Sesion::requerir();
        $id      = (int) $usuario['id'];

        $this->prestamos->marcarVencidos();

        $resumen = [
            'rol'         => $usuario['rol'],
            'esPersonal'  => Permisos::esPersonal($usuario),
            // Ubicaciones reales del inventario, para armar el filtro de
            // laboratorios sin escribirlas a mano en el HTML.
            'ubicaciones' => $this->equipos->porUbicacion(),

            'misTickets'     => $this->tickets->contarDeUsuario($id, ServicioTickets::ESTADOS_ABIERTOS),
            'misSolicitudes' => $this->solicitudes->contarDeUsuario($id, ServicioSolicitudes::ESTADOS_ABIERTOS),
        ];

        if ($resumen['esPersonal']) {
            $resumen['cola'] = [
                'ticketsPendientes'     => $this->tickets->contarPorEstados(['pendiente']),
                'ticketsEnCurso'        => $this->tickets->contarPorEstados(['en_progreso', 'en_resolucion']),
                'solicitudesPendientes' => $this->solicitudes->contarPorEstado('pendiente'),
                'prestamosVencidos'     => $this->prestamos->contarPorEstado('vencido'),
                'equiposEnReparacion'   => $this->equipos->contarPorEstado('reparacion'),
            ];
        }

        return $resumen;
    }
}
