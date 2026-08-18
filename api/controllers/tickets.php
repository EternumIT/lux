<?php
/**
 * Tickets de la mesa de ayuda.
 */

declare(strict_types=1);

const TICKET_ESTADOS = ['pendiente', 'en_progreso', 'en_resolucion', 'resuelto'];

function tickets_listar(): never
{
    $filas = db()->query(
        'SELECT id, titulo, descripcion, equipo_id AS equipoId,
                solicitante, estado, creado
           FROM tickets
          ORDER BY creado DESC, id DESC'
    )->fetchAll();

    json_response(array_map(static function (array $f): array {
        $f['equipoId'] = $f['equipoId'] === null ? null : (string) $f['equipoId'];
        return cast_row($f);
    }, $filas));
}

function tickets_crear(): never
{
    $body = request_body();
    $datos = require_fields($body, ['titulo', 'solicitante']);

    $estado = isset($body['estado'])
        ? require_enum($body['estado'], TICKET_ESTADOS, 'estado')
        : 'pendiente';

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
        'INSERT INTO tickets (titulo, descripcion, equipo_id, solicitante, estado)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $datos['titulo'],
        optional_field($body, 'descripcion'),
        $equipoId,
        $datos['solicitante'],
        $estado,
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT id, titulo, descripcion, equipo_id AS equipoId,
                solicitante, estado, creado
           FROM tickets WHERE id = ?'
    );
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();
    $ticket['equipoId'] = $ticket['equipoId'] === null ? null : (string) $ticket['equipoId'];

    auditar('ticket.crear', 'ticket', (string) $id, $ticket['titulo']);

    json_response(cast_row($ticket), 201);
}

function tickets_actualizar_estado(int $id): never
{
    $body = request_body();
    $estado = require_enum($body['estado'] ?? null, TICKET_ESTADOS, 'estado');

    $pdo = db();
    $stmt = $pdo->prepare('UPDATE tickets SET estado = ? WHERE id = ?');
    $stmt->execute([$estado, $id]);

    if ($stmt->rowCount() === 0) {
        // rowCount es 0 tanto si no existe como si el estado ya era ese.
        $existe = $pdo->prepare('SELECT 1 FROM tickets WHERE id = ? LIMIT 1');
        $existe->execute([$id]);
        if (!$existe->fetchColumn()) {
            json_error('El ticket indicado no existe.', 404);
        }
    }

    $stmt = $pdo->prepare(
        'SELECT id, titulo, descripcion, equipo_id AS equipoId,
                solicitante, estado, creado
           FROM tickets WHERE id = ?'
    );
    $stmt->execute([$id]);
    $ticket = $stmt->fetch();
    $ticket['equipoId'] = $ticket['equipoId'] === null ? null : (string) $ticket['equipoId'];

    auditar('ticket.estado', 'ticket', (string) $id,
        $ticket['titulo'] . ' → ' . $estado);

    json_response(cast_row($ticket));
}
