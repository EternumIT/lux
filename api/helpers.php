<?php
/**
 * Funciones auxiliares compartidas por los controladores.
 */

declare(strict_types=1);

/** Envía una respuesta JSON y termina la ejecución. */
function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Devuelve un error JSON con el código HTTP indicado. */
function json_error(string $mensaje, int $status = 400): never
{
    json_response(['error' => $mensaje], $status);
}

/** Lee y decodifica el cuerpo JSON de la petición. */
function request_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('El cuerpo de la petición debe ser un objeto JSON válido.', 400);
    }

    return $data;
}

/**
 * Valida que los campos indicados estén presentes y no vacíos.
 * Devuelve un array solo con esos campos, ya recortados.
 */
function require_fields(array $body, array $campos): array
{
    $faltantes = [];
    $valores = [];

    foreach ($campos as $campo) {
        $valor = isset($body[$campo]) ? trim((string) $body[$campo]) : '';
        if ($valor === '') {
            $faltantes[] = $campo;
        }
        $valores[$campo] = $valor;
    }

    if ($faltantes) {
        json_error('Faltan campos obligatorios: ' . implode(', ', $faltantes), 422);
    }

    return $valores;
}

/** Devuelve un campo opcional ya recortado, o null si viene vacío. */
function optional_field(array $body, string $campo): ?string
{
    if (!isset($body[$campo])) {
        return null;
    }
    $valor = trim((string) $body[$campo]);

    return $valor === '' ? null : $valor;
}

/** Valida que un valor pertenezca a una lista permitida. */
function require_enum(mixed $valor, array $permitidos, string $campo): string
{
    $valor = is_string($valor) ? trim($valor) : '';
    if (!in_array($valor, $permitidos, true)) {
        json_error(
            sprintf('El campo "%s" debe ser uno de: %s.', $campo, implode(', ', $permitidos)),
            422
        );
    }

    return $valor;
}

/** Valida una fecha en formato YYYY-MM-DD. */
function require_date(mixed $valor, string $campo): string
{
    $valor = is_string($valor) ? trim($valor) : '';
    $fecha = DateTime::createFromFormat('Y-m-d', $valor);
    if (!$fecha || $fecha->format('Y-m-d') !== $valor) {
        json_error(sprintf('El campo "%s" debe tener formato YYYY-MM-DD.', $campo), 422);
    }

    return $valor;
}

/* ---------------------------------------------------------------------
 * Texto con acentos, sin depender de mbstring
 *
 * La extensión mbstring no siempre viene activada (pasa seguido con PHP
 * instalado por separado, fuera de XAMPP). Como los nombres del sistema llevan
 * acentos y ñ, contar bytes en lugar de caracteres daría resultados mal.
 * Estas funciones usan mbstring si está, y si no recurren a PCRE con el
 * modificador /u, que forma parte del núcleo de PHP y siempre está disponible.
 * ------------------------------------------------------------------- */

/** Largo en caracteres (no en bytes). */
function texto_largo(string $texto): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($texto, 'UTF-8');
    }

    return (int) preg_match_all('/./us', $texto);
}

/** Primer carácter, respetando los multibyte. */
function texto_primer_caracter(string $texto): string
{
    if (preg_match('/^./us', $texto, $coincidencia)) {
        return $coincidencia[0];
    }

    return '';
}

/** Pasa a mayúsculas incluyendo las vocales acentuadas y la ñ. */
function texto_mayusculas(string $texto): string
{
    if (function_exists('mb_strtoupper')) {
        return mb_strtoupper($texto, 'UTF-8');
    }

    // strtoupper solo entiende ASCII, así que las acentuadas se convierten antes.
    $acentos = [
        'á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú',
        'à' => 'À', 'è' => 'È', 'ì' => 'Ì', 'ò' => 'Ò', 'ù' => 'Ù',
        'ñ' => 'Ñ', 'ü' => 'Ü', 'ç' => 'Ç',
    ];

    return strtoupper(strtr($texto, $acentos));
}

/**
 * Normaliza una fila de la base de datos al formato que espera el frontend
 * (ids como string, booleanos reales, camelCase donde corresponde).
 */
function cast_row(array $fila, array $enteros = [], array $booleanos = []): array
{
    if (isset($fila['id'])) {
        $fila['id'] = (string) $fila['id'];
    }

    foreach ($enteros as $campo) {
        if (isset($fila[$campo])) {
            $fila[$campo] = (int) $fila[$campo];
        }
    }

    foreach ($booleanos as $campo) {
        if (array_key_exists($campo, $fila)) {
            $fila[$campo] = (bool) $fila[$campo];
        }
    }

    return $fila;
}
