<?php
/**
 * La petición HTTP que entró (capa de presentación: controllers).
 *
 * Traduce lo que manda el navegador a arrays de PHP. Es la única clase que
 * toca $_GET, $_SERVER o el cuerpo crudo: de acá para adentro, el resto del
 * sistema trabaja con datos, no con HTTP.
 */

declare(strict_types=1);

final class Peticion
{
    /**
     * Cuerpo JSON ya decodificado.
     * Un cuerpo vacío es válido (los GET no mandan nada); uno que no sea JSON
     * es un error de quien llama, y se dice.
     */
    public static function cuerpo(): array
    {
        $crudo = file_get_contents('php://input');
        if ($crudo === false || $crudo === '') {
            return [];
        }

        $datos = json_decode($crudo, true);
        if (!is_array($datos)) {
            throw new ErrorDeNegocio('El cuerpo de la petición debe ser un objeto JSON válido.', 400);
        }

        return $datos;
    }

    /** Parámetros de la cadena de consulta (?buscar=...&estado=...). */
    public static function consulta(): array
    {
        return $_GET;
    }

    public static function metodo(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    /**
     * Ruta pedida, sin el prefijo del directorio de la API.
     *
     * Funciona con la reescritura del .htaccess (/api/tickets, que llega como
     * ?_ruta=tickets) y sin ella, usando PATH_INFO (/api/index.php/tickets).
     */
    public static function ruta(): string
    {
        if (isset($_GET['_ruta']) && $_GET['_ruta'] !== '') {
            return '/' . trim((string) $_GET['_ruta'], '/');
        }

        if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '') {
            return '/' . trim($_SERVER['PATH_INFO'], '/');
        }

        // Último recurso: se recorta el directorio del script del REQUEST_URI.
        $uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }

        $uri = preg_replace('#^/index\.php#', '', $uri) ?? $uri;

        return '/' . trim($uri, '/');
    }
}
