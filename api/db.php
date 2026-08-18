<?php
/**
 * Conexión PDO a la base de datos.
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
        // Siempre queda el detalle completo en el log del servidor.
        error_log('Eternum DB: ' . $e->getMessage());

        // "could not find driver" no es un problema de la base, sino de PHP:
        // le falta la extensión pdo_mysql. Se distingue porque la solución es
        // completamente distinta a la de una base apagada.
        if (stripos($e->getMessage(), 'could not find driver') !== false) {
            json_response([
                'error' => 'PHP no tiene activada la extensión pdo_mysql, '
                         . 'por eso no puede conectarse a la base de datos.',
                'ayuda' => [
                    'Abrí tu php.ini (la ruta sale con:  php --ini).',
                    'Buscá la línea  ;extension=pdo_mysql  y quitale el ";" del principio.',
                    'Guardá y volvé a ejecutar  npm run main.',
                ],
            ], 500);
        }

        // A dónde se intentó conectar. No es información sensible (no incluye la
        // contraseña) y suele ser la pista que resuelve el problema: lo más común
        // es que el puerto no coincida con el de la base que está encendida.
        $destino = $config['driver'] === 'sqlite'
            ? $config['sqlite_path']
            : $config['host'] . ':' . $config['port'] . '/' . $config['database'];

        $respuesta = [
            'error'   => 'No se pudo conectar con la base de datos (' . $destino . ').',
            'intento' => $destino,
            'ayuda'   => [
                'Revisá que la base esté encendida y escuchando en ese puerto.',
                'Revisá que el puerto coincida: "npm run main" en modo mariadb usa el '
                    . '3307 y XAMPP usa el 3306.',
                'Ojo: si abrís el sitio por el Apache de XAMPP (http://localhost/...) '
                    . 'se usan los valores de api/config.php, NO los de eternum.config.json.',
                'Revisá que el usuario y la contraseña sean los correctos.',
            ],
        ];

        // El mensaje crudo del driver puede incluir el nombre de usuario, así que
        // solo se muestra en desarrollo: "npm run main" activa ese modo solo.
        if (getenv('ETERNUM_DEBUG') === '1') {
            $respuesta['detalle'] = $e->getMessage();
        }

        json_response($respuesta, 500);
    }

    if ($config['driver'] === 'sqlite') {
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    return $pdo;
}
