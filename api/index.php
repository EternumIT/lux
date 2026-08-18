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
require __DIR__ . '/sesion.php';
require __DIR__ . '/permisos.php';
require __DIR__ . '/auditoria.php';

header('Content-Type: application/json; charset=utf-8');

/*
 * La API siempre responde JSON, también cuando algo explota.
 *
 * Sin esto, un error de PHP devuelve una página HTML con rutas del servidor y
 * traza de pila: el frontend no la puede interpretar (muestra "el servidor no
 * devolvió JSON") y además se filtra información interna al navegador.
 */
$errorInterno = static function (string $detalle): void {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    error_log('Eternum API: ' . $detalle);

    $cuerpo = ['error' => 'Se produjo un error interno en el servidor.'];
    // El detalle solo se muestra en desarrollo ("npm run main" activa el modo).
    if (getenv('ETERNUM_DEBUG') === '1') {
        $cuerpo['detalle'] = $detalle;
    }
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
};

set_exception_handler(static function (Throwable $e) use ($errorInterno): void {
    $errorInterno($e->getMessage() . ' (' . $e->getFile() . ':' . $e->getLine() . ')');
});

register_shutdown_function(static function () use ($errorInterno): void {
    $ultimo = error_get_last();
    if ($ultimo && in_array($ultimo['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        $errorInterno($ultimo['message'] . ' (' . $ultimo['file'] . ':' . $ultimo['line'] . ')');
    }
});

// Los errores nunca se imprimen en la respuesta: van al log del servidor.
ini_set('display_errors', '0');

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
    'GET /auth/sesion'      => ['auth.php',        'auth_sesion'],
    'POST /auth/logout'     => ['auth.php',        'auth_logout'],

    // Sección administrativa: los controladores comprueban el rol.
    'GET /auditoria'        => ['auditoria.php',   'auditoria_listar'],
    'GET /usuarios'         => ['usuarios.php',    'usuarios_listar'],
    'POST /usuarios'        => ['usuarios.php',    'usuarios_crear'],

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

// permisos_listar vive en permisos.php, que ya está cargado más arriba.
$rutasDirectas = [
    'GET /permisos' => 'permisos_listar',
];

// Rutas con parámetro en la URL: 'METODO patrón' => [archivo, función]
$rutasConId = [
    'PATCH #^/tickets/(\d+)$#'          => ['tickets.php',   'tickets_actualizar_estado'],
    'PATCH #^/prestamos/(\d+)$#'        => ['prestamos.php', 'prestamos_actualizar_estado'],
    'PATCH #^/usuarios/(\d+)$#'         => ['usuarios.php',  'usuarios_actualizar'],
    'PATCH #^/usuarios/(\d+)/bloqueo$#' => ['usuarios.php',  'usuarios_cambiar_bloqueo'],
];

$clave = $metodo . ' ' . $ruta;

if (isset($rutasDirectas[$clave])) {
    $rutasDirectas[$clave]();
    exit;
}

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
        'rutas'   => array_merge(array_keys($rutas), array_keys($rutasDirectas)),
    ]);
}

json_error('Ruta no encontrada: ' . $metodo . ' ' . $ruta, 404);
