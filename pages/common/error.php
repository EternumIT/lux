<?php
/**
 * Sirve la pantalla de error con el código que dice su parámetro.
 *
 * Existe para que /error/?error=404 responda 404 de verdad y no un 200 con
 * cara de error: el navegador, un buscador o un script que consulte el
 * sistema ven lo mismo que ve la persona.
 *
 * Lo usan los dos caminos: "npm run main" lo incluye desde scripts/router.php
 * y Apache lo enruta desde el .htaccess de la raíz, así el comportamiento en
 * desarrollo y en el servidor es el mismo.
 *
 * El contenido está en error.html, que es una página común y corriente: acá
 * solo se decide con qué estado se envía.
 */

declare(strict_types=1);

$codigo = (int) ($_GET['error'] ?? 404);

// Solo códigos de error reales; cualquier otra cosa se trata como "no existe".
if ($codigo < 400 || $codigo > 599) {
    $codigo = 404;
}

http_response_code($codigo);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

readfile(__DIR__ . '/error.html');
