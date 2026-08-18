<?php
/**
 * Equipos del inventario.
 */

declare(strict_types=1);

const EQUIPO_ESTADOS = ['operativo', 'reparacion', 'baja'];

function equipos_listar(): never
{
    $filas = db()->query(
        'SELECT id, tipo, ubicacion, marca, modelo, serie,
                part_number AS partNumber, estado, fallas, creado
           FROM equipos
          ORDER BY id'
    )->fetchAll();

    json_response(array_map(static fn(array $f): array => cast_row($f), $filas));
}

function equipos_crear(): never
{
    $body = request_body();
    $datos = require_fields($body, ['tipo', 'ubicacion', 'marca', 'modelo', 'serie']);

    $estado = isset($body['estado'])
        ? require_enum($body['estado'], EQUIPO_ESTADOS, 'estado')
        : 'operativo';

    $pdo = db();

    $existe = $pdo->prepare('SELECT 1 FROM equipos WHERE serie = ? LIMIT 1');
    $existe->execute([$datos['serie']]);
    if ($existe->fetchColumn()) {
        json_error('Ya existe un equipo con el número de serie ' . $datos['serie'] . '.', 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO equipos (tipo, ubicacion, marca, modelo, serie, part_number, estado, fallas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $datos['tipo'],
        $datos['ubicacion'],
        $datos['marca'],
        $datos['modelo'],
        $datos['serie'],
        optional_field($body, 'partNumber'),
        $estado,
        optional_field($body, 'fallas'),
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT id, tipo, ubicacion, marca, modelo, serie,
                part_number AS partNumber, estado, fallas, creado
           FROM equipos WHERE id = ?'
    );
    $stmt->execute([$id]);
    $equipo = $stmt->fetch();

    auditar('equipo.crear', 'equipo', (string) $id,
        $equipo['marca'] . ' ' . $equipo['modelo'] . ' · serie ' . $equipo['serie']);

    json_response(cast_row($equipo), 201);
}
