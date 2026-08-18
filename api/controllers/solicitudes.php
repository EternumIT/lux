<?php
/**
 * Solicitudes de servicio.
 */

declare(strict_types=1);

const SOLICITUD_ESTADOS = ['pendiente', 'aprobado', 'en_progreso', 'completado', 'rechazado'];

function solicitudes_listar(): never
{
    $filas = db()->query(
        'SELECT id, titulo, detalle, solicitante, estado, creado
           FROM solicitudes
          ORDER BY creado DESC, id DESC'
    )->fetchAll();

    json_response(array_map(static fn(array $f): array => cast_row($f), $filas));
}

function solicitudes_crear(): never
{
    $body = request_body();
    $datos = require_fields($body, ['titulo', 'solicitante']);

    $estado = isset($body['estado'])
        ? require_enum($body['estado'], SOLICITUD_ESTADOS, 'estado')
        : 'pendiente';

    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO solicitudes (titulo, detalle, solicitante, estado)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $datos['titulo'],
        optional_field($body, 'detalle'),
        $datos['solicitante'],
        $estado,
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT id, titulo, detalle, solicitante, estado, creado
           FROM solicitudes WHERE id = ?'
    );
    $stmt->execute([$id]);
    $solicitud = $stmt->fetch();

    auditar('solicitud.crear', 'solicitud', (string) $id, $solicitud['titulo']);

    json_response(cast_row($solicitud), 201);
}
