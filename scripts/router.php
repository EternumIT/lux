<?php
/**
 * Enrutador del servidor de desarrollo (`npm run main`).
 *
 * Existe por una sola razón: que el navegador nunca sirva una versión vieja
 * de los archivos mientras se trabaja.
 *
 * El servidor embebido de PHP no manda ninguna cabecera de caché para los
 * archivos estáticos. Sin `Cache-Control`, el navegador decide por su cuenta,
 * y en la práctica termina mezclando versiones: HTML nuevo con JavaScript
 * viejo. Cuando eso pasa la pantalla falla de formas difíciles de entender
 * (una función que "no existe", un menú que no se actualiza), y la única
 * salida es acordarse de recargar con Ctrl+Shift+R.
 *
 * Acá los archivos se sirven a mano justamente para poder agregar
 * `Cache-Control: no-store`. Si el enrutador devolviera `false`, PHP los
 * serviría solo, pero descartando las cabeceras que pusiéramos.
 *
 * Esto es solo para desarrollo: en el servidor manda Apache, que sirve los
 * estáticos con sus propias reglas de caché.
 */

declare(strict_types=1);

$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$ruta = rawurldecode($ruta);

// Los .php (la API) los ejecuta el servidor: devolver false se lo delega.
if (str_ends_with($ruta, '.php')) {
    return false;
}

$raiz    = rtrim(str_replace('\\', '/', __DIR__ . '/..'), '/');
$destino = realpath($raiz . $ruta);
$raizReal = realpath($raiz);

/*
 * Direcciones limpias: /tickets en lugar de /pages/common/tickets.html.
 *
 * Las carpetas de pages/ agrupan por QUIEN puede entrar (admin, tecnico,
 * common), que es la misma division que hace el control de acceso. Esa
 * division es de organizacion: no tiene por que aparecer en la direccion, y
 * de hecho no aparece. Por eso se prueban tres formas, en orden:
 *
 *   1. La ruta tal cual         /admin/usuarios -> pages/admin/usuarios.html
 *   2. La seccion por su nombre /admin          -> pages/admin/admin.html
 *   3. Buscando en los grupos   /tickets        -> pages/common/tickets.html
 *                               /inventario     -> pages/tecnico/inventario.html
 *
 * Mover una pantalla de grupo (por ejemplo, si manana los docentes pueden ver
 * prestamos) no le cambia la direccion a nadie.
 *
 * Un grupo que contiene su propia pagina (pages/admin/admin.html) es una
 * SECCION: tiene direccion propia y sus pantallas cuelgan de ella
 * (/admin/usuarios). Un grupo que no la tiene (common, tecnico) es solo una
 * forma de ordenar los archivos, y sus pantallas cuelgan de la raiz. Por eso
 * la tercera forma saltea las secciones: si no, /usuarios seria un segundo
 * nombre para /admin/usuarios, y la misma pantalla tendria dos direcciones.
 */
if ($destino === false && preg_match('#^/([a-z0-9-]+(?:/[a-z0-9-]+)?)/?$#', $ruta, $coincidencias)) {
    $pedido = $coincidencias[1];

    $intentos = [
        $raiz . '/pages/' . $pedido . '.html',
        $raiz . '/pages/' . $pedido . '/' . basename($pedido) . '.html',
    ];

    foreach ($intentos as $intento) {
        $candidato = realpath($intento);
        if ($candidato !== false) {
            $destino = $candidato;
            break;
        }
    }

    if ($destino === false && !str_contains($pedido, '/')) {
        $candidatos = array_filter(
            glob($raiz . '/pages/*/' . $pedido . '.html'),
            static function (string $archivo): bool {
                $grupo = basename(dirname($archivo));
                return !is_file(dirname($archivo) . '/' . $grupo . '.html');
            }
        );

        if ($candidatos) {
            sort($candidatos);
            $destino = realpath($candidatos[0]);
        }
    }
}

/*
 * La pantalla de error la sirve pages/common/error.php, que la envia con el
 * codigo que dice su parametro (/error/?error=404 responde 404 de verdad).
 *
 * Se delega en ese archivo, en vez de repetir la logica aca, para que en
 * desarrollo y en el servidor Apache pase exactamente lo mismo.
 */
if ($ruta === '/error' || $ruta === '/error/') {
    require $raiz . '/pages/common/error.php';

    return true;
}

/*
 * Una direccion de pantalla que no existe (/tikets, por ejemplo) tiene que
 * decir que no existe.
 *
 * Sin esto el servidor embebido cae en el index.html del proyecto y el
 * navegador termina en el login, como si la direccion fuera valida: un error
 * de tipeo se ve igual que una sesion vencida, que es de lo mas confuso.
 *
 * Se redirige en lugar de dibujar el error aca para que la barra de
 * direcciones muestre /error/?error=404: la persona ve donde esta parada y
 * puede recargar la pantalla.
 *
 * La direccion que fallo no viaja en la redireccion. No aporta nada a quien
 * la ve y, en cambio, deja a la vista como esta armado el sistema.
 */
if ($destino === false && !str_contains(basename($ruta), '.')) {
    http_response_code(302);
    header('Cache-Control: no-store');
    header('Location: /error/?error=404');

    return true;
}

// Fuera del proyecto no se sirve nada: sin esta comprobación, una ruta con
// ".." dejaría leer archivos de cualquier parte del disco.
if ($destino === false || $raizReal === false || !str_starts_with(str_replace('\\', '/', $destino), str_replace('\\', '/', $raizReal))) {
    return false;
}

/** Tipo de contenido según la extensión, que es lo que hace el propio PHP. */
$tipos = [
    'html' => 'text/html; charset=utf-8',
    'css'  => 'text/css; charset=utf-8',
    'js'   => 'application/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'map'  => 'application/json; charset=utf-8',
    'svg'  => 'image/svg+xml',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'ico'  => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'ttf'  => 'font/ttf',
    'txt'  => 'text/plain; charset=utf-8',
    'sql'  => 'text/plain; charset=utf-8',
    'md'   => 'text/plain; charset=utf-8',
];

$extension = strtolower(pathinfo($destino, PATHINFO_EXTENSION));

header('Content-Type: ' . ($tipos[$extension] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($destino));

// El motivo de todo este archivo.
header('Cache-Control: no-store, must-revalidate');

readfile($destino);

return true;
