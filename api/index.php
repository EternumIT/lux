<?php
/**
 * Punto de entrada de la API del SGRSI.
 *
 * El sistema está separado en tres capas, y este archivo es el único que las
 * conoce a las tres:
 *
 *   controllers/   presentación: leen la petición y devuelven JSON. Sin reglas.
 *   http/          las piezas de esa capa que hablan el protocolo.
 *   services/      negocio: permisos, validaciones, códigos, historial.
 *                  No sabe qué es una petición ni qué es SQL.
 *   repositories/  datos: lo único que escribe SQL. No sabe quién pregunta.
 *   helpers/       piezas que usan todas las capas.
 *
 * La dirección de las dependencias va siempre hacia abajo: los controladores
 * usan servicios, los servicios usan repositorios, y nunca al revés. Por eso
 * una regla se puede cambiar sin tocar consultas, y una consulta sin tocar
 * reglas.
 */

declare(strict_types=1);

/*
 * Autocarga: el nombre de la clase es el nombre del archivo, y se busca en las
 * carpetas de cada capa. Evita una lista de require en cada archivo, que es
 * justo lo que se desordena cuando el proyecto crece.
 */
spl_autoload_register(static function (string $clase): void {
    foreach (['helpers', 'repositories', 'services', 'http', 'controllers'] as $capa) {
        $archivo = __DIR__ . '/' . $capa . '/' . $clase . '.php';
        if (is_file($archivo)) {
            require_once $archivo;
            return;
        }
    }
});

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

if (Peticion::metodo() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ---------------------------------------------------------------------
 * Tabla de rutas: dirección  =>  [controlador, método]
 * ------------------------------------------------------------------- */

$enrutador = new Enrutador();
$enrutador->agregarVarias([
    'POST /auth/login'     => [ControladorAuth::class, 'login'],
    'GET /auth/sesion'     => [ControladorAuth::class, 'sesion'],
    'POST /auth/logout'    => [ControladorAuth::class, 'logout'],
    'PATCH /auth/password' => [ControladorAuth::class, 'cambiarPassword'],

    // Sección administrativa: el rol lo comprueba cada servicio.
    'GET /auditoria' => [ControladorAuditoria::class, 'listar'],
    'GET /permisos'  => [ControladorAuditoria::class, 'permisos'],

    'GET /usuarios'                => [ControladorUsuarios::class, 'listar'],
    'POST /usuarios'               => [ControladorUsuarios::class, 'crear'],
    'PATCH /usuarios/{id}'         => [ControladorUsuarios::class, 'actualizar'],
    'PATCH /usuarios/{id}/bloqueo' => [ControladorUsuarios::class, 'cambiarBloqueo'],

    // Lista mínima de nombres, para elegir a quién sumar a un ticket.
    // La puede pedir cualquiera con sesión iniciada; no expone datos privados.
    'GET /directorio' => [ControladorUsuarios::class, 'directorio'],

    'GET /equipos'      => [ControladorInventario::class, 'listarEquipos'],
    'POST /equipos'     => [ControladorInventario::class, 'crearEquipo'],
    'GET /componentes'  => [ControladorInventario::class, 'listarComponentes'],
    'POST /componentes' => [ControladorInventario::class, 'crearComponente'],

    'GET /tickets'        => [ControladorTickets::class, 'listar'],
    'POST /tickets'       => [ControladorTickets::class, 'crear'],
    'GET /tickets/{id}'   => [ControladorTickets::class, 'detalle'],
    'PATCH /tickets/{id}' => [ControladorTickets::class, 'cambiarEstado'],

    'GET /solicitudes'        => [ControladorSolicitudes::class, 'listar'],
    'POST /solicitudes'       => [ControladorSolicitudes::class, 'crear'],
    'GET /solicitudes/{id}'   => [ControladorSolicitudes::class, 'detalle'],
    'PATCH /solicitudes/{id}' => [ControladorSolicitudes::class, 'cambiarEstado'],

    'GET /prestamos'        => [ControladorPrestamos::class, 'listar'],
    'POST /prestamos'       => [ControladorPrestamos::class, 'crear'],
    'GET /prestamos/{id}'   => [ControladorPrestamos::class, 'detalle'],
    'PATCH /prestamos/{id}' => [ControladorPrestamos::class, 'cambiarEstado'],

    'GET /inicio'    => [ControladorResumenes::class, 'inicio'],
    'GET /dashboard' => [ControladorResumenes::class, 'panel'],
]);

/* ---------------------------------------------------------------------
 * Ejecución
 *
 * Es el único lugar donde los errores de las capas de abajo se traducen a
 * códigos HTTP. Por eso ni los servicios ni los repositorios necesitan saber
 * qué es un 404.
 * ------------------------------------------------------------------- */

$ruta   = Peticion::ruta();
$metodo = Peticion::metodo();

try {
    $respuesta = $enrutador->resolver($metodo, $ruta);

    if ($respuesta !== null) {
        $respuesta->enviar();
    }

    if ($ruta === '/' || $ruta === '') {
        Respuesta::ok([
            'nombre' => 'API SGRSI / Eternum',
            'estado' => 'ok',
            'capas'  => ['controllers', 'services', 'repositories'],
            'rutas'  => $enrutador->definiciones(),
        ])->enviar();
    }

    Respuesta::error('Ruta no encontrada: ' . $metodo . ' ' . $ruta, 404)->enviar();
} catch (ErrorDeNegocio $e) {
    Respuesta::error($e->getMessage(), $e->estado())->enviar();
} catch (ErrorDeConexion $e) {
    Respuesta::error($e->getMessage(), 500, array_merge(['ayuda' => $e->ayuda()], $e->extra()))->enviar();
}
