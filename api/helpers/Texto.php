<?php
/**
 * Texto con acentos, sin depender de mbstring.
 *
 * La extensión mbstring no siempre viene activada (pasa seguido con PHP
 * instalado por separado). Como los nombres del sistema llevan acentos y ñ,
 * contar bytes en lugar de caracteres daría resultados equivocados: "Ana Gómez"
 * mide 9 caracteres pero 10 bytes.
 *
 * Estos métodos usan mbstring si está, y si no recurren a PCRE con el
 * modificador /u, que forma parte del núcleo de PHP y siempre está disponible.
 */

declare(strict_types=1);

final class Texto
{
    /** Largo en caracteres (no en bytes). */
    public static function largo(string $texto): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($texto, 'UTF-8');
        }

        return (int) preg_match_all('/./us', $texto);
    }

    /** Primer carácter, respetando los multibyte. */
    public static function primerCaracter(string $texto): string
    {
        if (preg_match('/^./us', $texto, $coincidencia)) {
            return $coincidencia[0];
        }

        return '';
    }

    /** Pasa a mayúsculas incluyendo las vocales acentuadas y la ñ. */
    public static function mayusculas(string $texto): string
    {
        if (function_exists('mb_strtoupper')) {
            return mb_strtoupper($texto, 'UTF-8');
        }

        // strtoupper solo entiende ASCII: las acentuadas se convierten antes.
        $acentos = [
            'á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú',
            'à' => 'À', 'è' => 'È', 'ì' => 'Ì', 'ò' => 'Ò', 'ù' => 'Ù',
            'ñ' => 'Ñ', 'ü' => 'Ü', 'ç' => 'Ç',
        ];

        return strtoupper(strtr($texto, $acentos));
    }

    /**
     * Quita los acentos.
     * Se usa para armar códigos: "Administración" → "Administracion", así el
     * código se puede tipear en cualquier teclado y buscar sin depender de
     * cómo se escriba el acento.
     */
    public static function sinAcentos(string $texto): string
    {
        $mapa = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u',
            'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u', 'ñ' => 'n', 'ç' => 'c',
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ü' => 'U',
            'À' => 'A', 'È' => 'E', 'Ì' => 'I', 'Ò' => 'O', 'Ù' => 'U', 'Ñ' => 'N', 'Ç' => 'C',
        ];

        return strtr($texto, $mapa);
    }
}
