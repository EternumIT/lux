<?php
/**
 * Conexión PDO a la base de datos (patrón singleton simple).
 */

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';

    if ($config['driver'] === 'sqlite') {
        $dsn = 'sqlite:' . $config['sqlite_path'];
        $user = null;
        $password = null;
    } else {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $user = $config['user'];
        $password = $config['password'];
    }

    try {
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // No se filtran credenciales ni detalles internos al cliente.
        error_log('Eternum DB: ' . $e->getMessage());
        json_response([
            'error' => 'No se pudo conectar con la base de datos. '
                     . 'Verificá que MySQL/MariaDB esté iniciado en XAMPP y que '
                     . 'hayas importado database/schema.sql.',
        ], 500);
    }

    if ($config['driver'] === 'sqlite') {
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    return $pdo;
}
