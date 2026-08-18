<?php
/**
 * Préstamos de equipos.
 */

declare(strict_types=1);

const PRESTAMO_ESTADOS = ['pendiente', 'aprobado', 'activo', 'vencido', 'devuelto'];

/**
 * Marca como "vencido" todo préstamo activo cuya fecha límite ya pasó.
 * Se ejecuta antes de listar para que el estado siempre refleje la realidad.
 */
function prestamos_marcar_vencidos(): void
{
    db()->exec(
        "UPDATE prestamos
            SET estado = 'vencido'
          WHERE estado = 'activo' AND fecha_limite < CURRENT_DATE"
    );
}

function prestamos_listar(): never
{
    prestamos_marcar_vencidos();

    $filas = db()->query(
        'SELECT id, equipo_id AS equipoId, solicitante,
                fecha_inicio AS fechaInicio, fecha_limite AS fechaLimite, estado
           FROM prestamos
          ORDER BY id DESC'
    )->fetchAll();

    json_response(array_map(static function (array $f): array {
        $f['equipoId'] = $f['equipoId'] === null ? null : (string) $f['equipoId'];
        return cast_row($f);
    }, $filas));
}

function prestamos_crear(): never
{
    $body = request_body();
    $datos = require_fields($body, ['solicitante']);
    $fechaLimite = require_date($body['fechaLimite'] ?? null, 'fechaLimite');

    $equipoId = isset($body['equipoId']) && $body['equipoId'] !== ''
        ? (int) $body['equipoId']
        : null;

    $pdo = db();

    if ($equipoId !== null) {
        $existe = $pdo->prepare('SELECT 1 FROM equipos WHERE id = ? LIMIT 1');
        $existe->execute([$equipoId]);
        if (!$existe->fetchColumn()) {
            json_error('El equipo indicado no existe.', 422);
        }
    }

    $stmt = $pdo->prepare(
        'INSERT INTO prestamos (equipo_id, solicitante, fecha_limite, estado)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $equipoId,
        $datos['solicitante'],
        $fechaLimite,
        isset($body['estado']) ? require_enum($body['estado'], PRESTAMO_ESTADOS, 'estado') : 'activo',
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT id, equipo_id AS equipoId, solicitante,
                fecha_inicio AS fechaInicio, fecha_limite AS fechaLimite, estado
           FROM prestamos WHERE id = ?'
    );
    $stmt->execute([$id]);
    $prestamo = $stmt->fetch();
    $prestamo['equipoId'] = $prestamo['equipoId'] === null ? null : (string) $prestamo['equipoId'];

    json_response(cast_row($prestamo), 201);
}

function prestamos_actualizar_estado(int $id): never
{
    $body = request_body();
    $estado = require_enum($body['estado'] ?? null, PRESTAMO_ESTADOS, 'estado');

    $pdo = db();
    $stmt = $pdo->prepare('UPDATE prestamos SET estado = ? WHERE id = ?');
    $stmt->execute([$estado, $id]);

    if ($stmt->rowCount() === 0) {
        $existe = $pdo->prepare('SELECT 1 FROM prestamos WHERE id = ? LIMIT 1');
        $existe->execute([$id]);
        if (!$existe->fetchColumn()) {
            json_error('El préstamo indicado no existe.', 404);
        }
    }

    $stmt = $pdo->prepare(
        'SELECT id, equipo_id AS equipoId, solicitante,
                fecha_inicio AS fechaInicio, fecha_limite AS fechaLimite, estado
           FROM prestamos WHERE id = ?'
    );
    $stmt->execute([$id]);
    $prestamo = $stmt->fetch();
    $prestamo['equipoId'] = $prestamo['equipoId'] === null ? null : (string) $prestamo['equipoId'];

    json_response(cast_row($prestamo));
}
