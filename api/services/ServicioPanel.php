<?php
/**
 * Métricas agregadas de la pantalla "Estado de Equipos".
 *
 * Todo se calcula con COUNT en la base y no trayendo las filas al navegador:
 * el sistema tiene que seguir andando igual con mil equipos cargados.
 */

declare(strict_types=1);

final class ServicioPanel
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
        // Solo la usa "Estado de Equipos", que es del personal del área.
        Sesion::requerirPersonal();

        $this->prestamos->marcarVencidos();

        return [
            'equiposTotales'         => $this->equipos->contar(),
            'ticketsAbiertos'        => $this->tickets->contarPorEstados(ServicioTickets::ESTADOS_ABIERTOS),
            'prestamosActivos'       => $this->prestamos->contarPorEstado('activo'),
            'solicitudesPendientes'  => $this->solicitudes->contarPorEstado('pendiente'),
            'porEstadoTickets'       => $this->tickets->contarPorEstado(ServicioTickets::ESTADOS),
            'actividad'              => $this->actividadUltimaSemana(),
            'porUbicacion'           => $this->porCategoria()['equipos'],
            'incidentesPorUbicacion' => $this->porCategoria()['incidentes'],
        ];
    }

    /** Tickets y solicitudes creados por día en los últimos 7 días. */
    private function actividadUltimaSemana(): array
    {
        $actividad = [];
        for ($i = 6; $i >= 0; $i--) {
            $actividad[date('Y-m-d', strtotime("-{$i} days"))] = 0;
        }

        $desde = array_key_first($actividad);

        $eventos = array_merge(
            $this->tickets->creadosDesde($desde),
            $this->solicitudes->creadasDesde($desde)
        );

        foreach ($eventos as $fila) {
            $fecha = substr((string) $fila['creado'], 0, 10);
            if (array_key_exists($fecha, $actividad)) {
                $actividad[$fecha] += (int) $fila['total'];
            }
        }

        return $actividad;
    }

    /** Equipos e incidentes agrupados en las cuatro categorías del panel. */
    private function porCategoria(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }

        $vacio      = ['Laboratorios' => 0, 'Salones' => 0, 'Administración' => 0, 'Otros' => 0];
        $equipos    = $vacio;
        $incidentes = $vacio;

        foreach ($this->equipos->ubicacionesYFallas() as $fila) {
            $categoria = self::categoria((string) $fila['ubicacion']);
            $equipos[$categoria]++;

            if (trim((string) ($fila['fallas'] ?? '')) !== '') {
                $incidentes[$categoria]++;
            }
        }

        return $cache = ['equipos' => $equipos, 'incidentes' => $incidentes];
    }

    /** Agrupa una ubicación libre en una de las cuatro categorías del panel. */
    private static function categoria(string $ubicacion): string
    {
        if (preg_match('/laboratorio/iu', $ubicacion)) {
            return 'Laboratorios';
        }
        if (preg_match('/sal[oó]n/iu', $ubicacion)) {
            return 'Salones';
        }
        if (preg_match('/administraci[oó]n/iu', $ubicacion)) {
            return 'Administración';
        }

        return 'Otros';
    }
}
