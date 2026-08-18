<?php
/**
 * Métricas agregadas para el panel principal.
 * Se calculan con COUNT en la base de datos en lugar de traer todas las filas.
 */

declare(strict_types=1);

require_once __DIR__ . '/tickets.php';
require_once __DIR__ . '/prestamos.php';

function dashboard_resumen(): never
{
    prestamos_marcar_vencidos();

    $pdo = db();

    $equiposTotales = (int) $pdo->query('SELECT COUNT(*) FROM equipos')->fetchColumn();

    $ticketsAbiertos = (int) $pdo->query(
        "SELECT COUNT(*) FROM tickets WHERE estado <> 'resuelto'"
    )->fetchColumn();

    $prestamosActivos = (int) $pdo->query(
        "SELECT COUNT(*) FROM prestamos WHERE estado = 'activo'"
    )->fetchColumn();

    $solicitudesPendientes = (int) $pdo->query(
        "SELECT COUNT(*) FROM solicitudes WHERE estado = 'pendiente'"
    )->fetchColumn();

    // Conteo de tickets por estado, con todos los estados presentes en 0.
    $porEstadoTickets = array_fill_keys(TICKET_ESTADOS, 0);
    $filas = $pdo->query('SELECT estado, COUNT(*) AS total FROM tickets GROUP BY estado')->fetchAll();
    foreach ($filas as $fila) {
        if (array_key_exists($fila['estado'], $porEstadoTickets)) {
            $porEstadoTickets[$fila['estado']] = (int) $fila['total'];
        }
    }

    // Actividad de los últimos 7 días (tickets + solicitudes creados por fecha).
    $actividad = [];
    for ($i = 6; $i >= 0; $i--) {
        $actividad[date('Y-m-d', strtotime("-{$i} days"))] = 0;
    }
    $desde = array_key_first($actividad);

    $stmt = $pdo->prepare(
        'SELECT creado, COUNT(*) AS total FROM (
             SELECT creado FROM tickets     WHERE creado >= ?
             UNION ALL
             SELECT creado FROM solicitudes WHERE creado >= ?
         ) AS eventos
         GROUP BY creado'
    );
    $stmt->execute([$desde, $desde]);
    foreach ($stmt->fetchAll() as $fila) {
        $fecha = substr((string) $fila['creado'], 0, 10);
        if (array_key_exists($fecha, $actividad)) {
            $actividad[$fecha] = (int) $fila['total'];
        }
    }

    // Equipos e incidentes agrupados por categoría de ubicación.
    $porUbicacion = ['Laboratorios' => 0, 'Salones' => 0, 'Administración' => 0, 'Otros' => 0];
    $incidentesPorUbicacion = $porUbicacion;

    $filas = $pdo->query('SELECT ubicacion, fallas FROM equipos')->fetchAll();
    foreach ($filas as $fila) {
        $categoria = dashboard_categoria_ubicacion((string) $fila['ubicacion']);
        $porUbicacion[$categoria]++;
        if (trim((string) ($fila['fallas'] ?? '')) !== '') {
            $incidentesPorUbicacion[$categoria]++;
        }
    }

    json_response([
        'equiposTotales'         => $equiposTotales,
        'ticketsAbiertos'        => $ticketsAbiertos,
        'prestamosActivos'       => $prestamosActivos,
        'solicitudesPendientes'  => $solicitudesPendientes,
        'porEstadoTickets'       => $porEstadoTickets,
        'actividad'              => $actividad,
        'porUbicacion'           => $porUbicacion,
        'incidentesPorUbicacion' => $incidentesPorUbicacion,
    ]);
}

/** Agrupa una ubicación libre en una de las cuatro categorías del panel. */
function dashboard_categoria_ubicacion(string $ubicacion): string
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
