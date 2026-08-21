<?php
/**
 * Validaciones de los datos que llegan en una petición.
 *
 * Cuando algo no cumple, lanza un ErrorDeNegocio con el motivo escrito para
 * que lo lea una persona: ese texto es el que termina viéndose en el
 * formulario, así que dice qué falta y no "campo inválido".
 */

declare(strict_types=1);

final class Validador
{
    /**
     * Comprueba que los campos estén presentes y no vacíos.
     * Devuelve solo esos campos, ya recortados.
     */
    public static function requeridos(array $datos, array $campos): array
    {
        $faltantes = [];
        $valores   = [];

        foreach ($campos as $campo) {
            $valor = isset($datos[$campo]) ? trim((string) $datos[$campo]) : '';
            if ($valor === '') {
                $faltantes[] = $campo;
            }
            $valores[$campo] = $valor;
        }

        if ($faltantes) {
            throw ErrorDeNegocio::datosInvalidos(
                'Faltan campos obligatorios: ' . implode(', ', $faltantes)
            );
        }

        return $valores;
    }

    /** Campo opcional ya recortado, o null si vino vacío. */
    public static function opcional(array $datos, string $campo): ?string
    {
        if (!isset($datos[$campo])) {
            return null;
        }

        $valor = trim((string) $datos[$campo]);

        return $valor === '' ? null : $valor;
    }

    /** El valor tiene que pertenecer a una lista cerrada. */
    public static function enumerado(mixed $valor, array $permitidos, string $campo): string
    {
        $valor = is_string($valor) ? trim($valor) : '';

        if (!in_array($valor, $permitidos, true)) {
            throw ErrorDeNegocio::datosInvalidos(
                sprintf('El campo "%s" debe ser uno de: %s.', $campo, implode(', ', $permitidos))
            );
        }

        return $valor;
    }

    /** Fecha en formato YYYY-MM-DD. */
    public static function fecha(mixed $valor, string $campo): string
    {
        $valor = is_string($valor) ? trim($valor) : '';
        $fecha = DateTime::createFromFormat('Y-m-d', $valor);

        if (!$fecha || $fecha->format('Y-m-d') !== $valor) {
            throw ErrorDeNegocio::datosInvalidos(
                sprintf('El campo "%s" debe tener formato YYYY-MM-DD.', $campo)
            );
        }

        return $valor;
    }

    /** Fecha opcional: null si no vino. */
    public static function fechaOpcional(mixed $valor, string $campo): ?string
    {
        $valor = trim((string) $valor);

        return $valor === '' ? null : self::fecha($valor, $campo);
    }

    /** Hora opcional en formato HH:MM. */
    public static function horaOpcional(mixed $valor, string $campo): ?string
    {
        $valor = trim((string) $valor);
        if ($valor === '') {
            return null;
        }

        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $valor)) {
            throw ErrorDeNegocio::datosInvalidos(
                sprintf('El filtro "%s" debe tener formato HH:MM.', $campo)
            );
        }

        return $valor;
    }

    /** Largo mínimo en caracteres (no en bytes). */
    public static function largoMinimo(string $valor, int $minimo, string $mensaje): string
    {
        if (Texto::largo($valor) < $minimo) {
            throw ErrorDeNegocio::datosInvalidos($mensaje);
        }

        return $valor;
    }

    public static function email(string $valor): string
    {
        if (!filter_var($valor, FILTER_VALIDATE_EMAIL)) {
            throw ErrorDeNegocio::datosInvalidos('El email no tiene un formato válido.');
        }

        return $valor;
    }

    public static function cedula(string $valor): string
    {
        if (!preg_match('/^\d{6,8}$/', $valor)) {
            throw ErrorDeNegocio::datosInvalidos('La cédula debe tener entre 6 y 8 dígitos.');
        }

        return $valor;
    }
}
