<?php
/**
 * Componentes del inventario.
 */

declare(strict_types=1);

function componentes_listar(): never
{
    $filas = db()->query(
        'SELECT id, nombre, modelo, fabricante, serie,
                part_number AS partNumber, es_fabrica AS esFabrica,
                funcionando, creado
           FROM componentes
          ORDER BY id'
    )->fetchAll();

    json_response(array_map(
        static fn(array $f): array => cast_row($f, [], ['esFabrica', 'funcionando']),
        $filas
    ));
}

function componentes_crear(): never
{
    $body = request_body();
    $datos = require_fields($body, ['nombre', 'modelo', 'fabricante']);

    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO componentes (nombre, modelo, fabricante, serie, part_number, es_fabrica, funcionando)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $datos['nombre'],
        $datos['modelo'],
        $datos['fabricante'],
        optional_field($body, 'serie'),
        optional_field($body, 'partNumber'),
        !empty($body['esFabrica']) ? 1 : 0,
        !empty($body['funcionando']) ? 1 : 0,
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare(
        'SELECT id, nombre, modelo, fabricante, serie,
                part_number AS partNumber, es_fabrica AS esFabrica,
                funcionando, creado
           FROM componentes WHERE id = ?'
    );
    $stmt->execute([$id]);
    $componente = $stmt->fetch();

    auditar('componente.crear', 'componente', (string) $id,
        $componente['nombre'] . ' ' . $componente['modelo']);

    json_response(cast_row($componente, [], ['esFabrica', 'funcionando']), 201);
}
