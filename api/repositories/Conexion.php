<?php
/**
 * Conexión con la base de datos (capa de datos: repositories).
 *
 * Es el único lugar del sistema que sabe con qué motor se habla y con qué
 * credenciales. Los repositorios le piden el PDO y trabajan siempre con
 * sentencias preparadas.
 */

declare(strict_types=1);

final class Conexion
{
    private static ?PDO $pdo = null;

    /** Devuelve la conexión, abriéndola la primera vez que se pide. */
    public static function obtener(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $config = require dirname(__DIR__) . '/config.php';

        if ($config['driver'] === 'sqlite') {
            $dsn      = 'sqlite:' . $config['sqlite_path'];
            $usuario  = null;
            $password = null;
        } else {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            $usuario  = $config['user'];
            $password = $config['password'];
        }

        try {
            self::$pdo = new PDO($dsn, $usuario, $password, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            throw self::traducir($e, $config);
        }

        if ($config['driver'] === 'sqlite') {
            self::$pdo->exec('PRAGMA foreign_keys = ON');
        }

        return self::$pdo;
    }

    /** Convierte el error crudo del driver en algo accionable. */
    private static function traducir(PDOException $e, array $config): ErrorDeConexion
    {
        // Siempre queda el detalle completo en el log del servidor.
        error_log('Eternum DB: ' . $e->getMessage());

        // "could not find driver" no es un problema de la base, sino de PHP:
        // le falta la extensión pdo_mysql. Se distingue porque la solución es
        // completamente distinta a la de una base apagada.
        if (stripos($e->getMessage(), 'could not find driver') !== false) {
            return new ErrorDeConexion(
                'PHP no tiene activada la extensión pdo_mysql, por eso no puede '
                . 'conectarse a la base de datos.',
                [
                    'Abrí tu php.ini (la ruta sale con:  php --ini).',
                    'Buscá la línea  ;extension=pdo_mysql  y quitale el ";" del principio.',
                    'Guardá y volvé a ejecutar  npm run main.',
                ]
            );
        }

        // A dónde se intentó conectar. No es información sensible (no incluye la
        // contraseña) y suele ser la pista que resuelve el problema: lo más común
        // es que el puerto no coincida con el de la base que está encendida.
        $destino = $config['driver'] === 'sqlite'
            ? $config['sqlite_path']
            : $config['host'] . ':' . $config['port'] . '/' . $config['database'];

        $extra = ['intento' => $destino];

        // El mensaje crudo del driver puede incluir el nombre de usuario, así que
        // solo se muestra en desarrollo: "npm run main" activa ese modo solo.
        if (getenv('ETERNUM_DEBUG') === '1') {
            $extra['detalle'] = $e->getMessage();
        }

        return new ErrorDeConexion(
            'No se pudo conectar con la base de datos (' . $destino . ').',
            [
                'Revisá que la base esté encendida y escuchando en ese puerto.',
                'Revisá que el puerto coincida: "npm run main" usa el 3307.',
                'Ojo: si el sitio lo sirve otro servidor web (Apache, por ejemplo), '
                . 'se usan los valores de api/config.php, NO los de eternum.config.json.',
                'Revisá que el usuario y la contraseña sean los correctos.',
            ],
            $extra
        );
    }
}
