<?php
/**
 * Configuración de conexión a la base de datos.
 *
 * Los valores por defecto son los de una instalación limpia de XAMPP
 * (usuario "root" sin contraseña). Si cambiaste la contraseña de MariaDB,
 * editá DB_PASS acá abajo.
 *
 * También se pueden sobrescribir con variables de entorno, útil para
 * ejecutar pruebas sin tocar este archivo.
 */

declare(strict_types=1);

return [
    'driver'   => getenv('ETERNUM_DB_DRIVER') ?: 'mysql',
    'host'     => getenv('ETERNUM_DB_HOST') ?: '127.0.0.1',
    'port'     => getenv('ETERNUM_DB_PORT') ?: '3306',
    'database' => getenv('ETERNUM_DB_NAME') ?: 'eternum',
    'user'     => getenv('ETERNUM_DB_USER') ?: 'root',
    'password' => getenv('ETERNUM_DB_PASS') ?: '',
    'charset'  => 'utf8mb4',

    // Ruta al archivo SQLite (solo se usa si driver = 'sqlite', para tests).
    'sqlite_path' => getenv('ETERNUM_DB_SQLITE') ?: '',
];
