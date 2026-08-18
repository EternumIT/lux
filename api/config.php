<?php
/**
 * Configuración de conexión a la base de datos.
 *
 * De dónde salen los valores, en orden de prioridad:
 *
 *   1. Variables de entorno ETERNUM_DB_*. Es lo que usa "npm run main": el
 *      lanzador lee eternum.config.json y se las pasa al proceso de PHP, así
 *      que para cambiar de MariaDB propio a XAMPP NO hay que tocar este archivo.
 *
 *   2. Los valores por defecto de acá abajo, pensados para una instalación
 *      limpia de XAMPP (usuario "root" sin contraseña). Son los que aplican
 *      cuando el sitio se sirve con el Apache de XAMPP desde htdocs.
 */

declare(strict_types=1);

return [
    'driver'   => getenv('ETERNUM_DB_DRIVER') ?: 'mysql',
    'host'     => getenv('ETERNUM_DB_HOST') ?: 'localhost',
    'port'     => getenv('ETERNUM_DB_PORT') ?: '3306',
    'database' => getenv('ETERNUM_DB_NAME') ?: 'eternum',
    'user'     => getenv('ETERNUM_DB_USER') ?: 'root',
    'password' => getenv('ETERNUM_DB_PASS') ?: '',
    'charset'  => 'utf8mb4',

    // Ruta al archivo SQLite (solo se usa si driver = 'sqlite', para tests).
    'sqlite_path' => getenv('ETERNUM_DB_SQLITE') ?: '',
];
