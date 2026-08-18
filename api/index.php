<?php
/**
 * Punto de entrada de la API del SGRSI.
 *
 * Enruta las peticiones a los controladores de api/controllers/.
 * Funciona tanto con la reescritura de .htaccess (/api/tickets) como sin
 * ella usando PATH_INFO (/api/index.php/tickets).
 */

declare(strict_types=1);

require __DIR__ . '/helpers.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// --- CORS: solo necesario si el frontend se sirve desde otro puerto ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/** Determina la ruta solicitada, sin el prefijo del directorio de la API. */
function resolver_ruta(): string
{
    // Con .htaccess la ruta viaja en ?_ruta=...; sin él, en PATH_INFO.
    if (isset($_GET['_ruta']) && $_GET['_ruta'] !== '') {
        return '/' . trim((string) $_GET['_ruta'], '/');
    }

    if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '') {
        return '/' . trim($_SERVER['PATH_INFO'], '/');
    }

    // Último recurso: se recorta el directorio del script del REQUEST_URI.
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    if ($base !== '' && str_starts_with($uri, $base)) {
        $uri = substr($uri, strlen($base));
    }
    $uri = preg_replace('#^/index\.php#', '', $uri) ?? $uri;

    return '/' . trim($uri, '/');
}

$ruta   = resolver_ruta();
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Tabla de rutas: 'METODO /ruta' => [archivo del controlador, función]
$rutas = [
    'POST /auth/login'      => ['auth.php',        'auth_login'],

    'GET /equipos'          => ['equipos.php',     'equipos_listar'],
    'POST /equipos'         => ['equipos.php',     'equipos_crear'],

    'GET /componentes'      => ['componentes.php', 'componentes_listar'],
    'POST /componentes'     => ['componentes.php', 'componentes_crear'],

    'GET /tickets'          => ['tickets.php',     'tickets_listar'],
    'POST /tickets'         => ['tickets.php',     'tickets_crear'],

    'GET /prestamos'        => ['prestamos.php',   'prestamos_listar'],
    'POST /prestamos'       => ['prestamos.php',   'prestamos_crear'],

    'GET /solicitudes'      => ['solicitudes.php', 'solicitudes_listar'],
    'POST /solicitudes'     => ['solicitudes.php', 'solicitudes_crear'],

    'GET /dashboard'        => ['dashboard.php',   'dashboard_resumen'],
];

// Rutas con parámetro en la URL: 'METODO patrón' => [archivo, función]
$rutasConId = [
    'PATCH #^/tickets/(\d+)$#'   => ['tickets.php',   'tickets_actualizar_estado'],
    'PATCH #^/prestamos/(\d+)$#' => ['prestamos.php', 'prestamos_actualizar_estado'],
];

$clave = $metodo . ' ' . $ruta;

if (isset($rutas[$clave])) {
    [$archivo, $funcion] = $rutas[$clave];
    require_once __DIR__ . '/controllers/' . $archivo;
    $funcion();
    exit;
}

foreach ($rutasConId as $patron => $destino) {
    [$metodoPatron, $regex] = explode(' ', $patron, 2);
    if ($metodo === $metodoPatron && preg_match($regex, $ruta, $coincidencias)) {
        [$archivo, $funcion] = $destino;
        require_once __DIR__ . '/controllers/' . $archivo;
        $funcion((int) $coincidencias[1]);
        exit;
    }
}

if ($ruta === '/' || $ruta === '') {
    json_response([
        'nombre'  => 'API SGRSI / Eternum',
        'estado'  => 'ok',
        'rutas'   => array_keys($rutas),
    ]);
}

json_error('Ruta no encontrada: ' . $metodo . ' ' . $ruta, 404);
