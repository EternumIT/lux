<?php
/**
 * Nomenclatura de identificadores (capa de negocio: services).
 *
 * Todo lo que se menciona por escrito (en un ticket, en un préstamo, en un
 * correo) tiene un código con la misma forma, generado por el servidor y no
 * escrito a mano. Eso es lo que permite buscarlo después.
 *
 *   Equipos y componentes:  <ACRÓNIMO DE UBICACIÓN>-<N° DE SERIE>   L1-SN-88213
 *   Tickets:                TK-<AÑO>-<CORRELATIVO>                  TK-2026-0001
 *   Solicitudes:            SL-<AÑO>-<CORRELATIVO>                  SL-2026-0001
 *   Préstamos:              PR-<AÑO>-<CORRELATIVO>                  PR-2026-0001
 */

declare(strict_types=1);

final class Nomenclatura
{
    /**
     * Acrónimo de una ubicación.
     *
     * Si la ubicación tiene números, se usan las iniciales de sus palabras más
     * el número ("Laboratorio 1" → L1, "Sala de Máquinas 2" → SDM2). Si no
     * tiene ninguno, sus tres primeras letras ("Administración" → ADM).
     */
    public static function acronimo(string $ubicacion): string
    {
        $ubicacion = Texto::sinAcentos(trim($ubicacion));
        if ($ubicacion === '') {
            return 'GEN';
        }

        $numeros = preg_replace('/\D+/u', '', $ubicacion) ?? '';

        if ($numeros !== '' && preg_match_all('/\p{L}+/u', $ubicacion, $palabras)) {
            $iniciales = '';
            foreach ($palabras[0] as $palabra) {
                $iniciales .= Texto::primerCaracter($palabra);
            }

            return Texto::mayusculas($iniciales) . $numeros;
        }

        preg_match('/\p{L}{1,3}/u', $ubicacion, $letras);

        return Texto::mayusculas($letras[0] ?? 'GEN');
    }

    /**
     * Código de un equipo o componente: acrónimo de la ubicación + serie.
     * Los componentes pueden no tener serie; en ese caso se pasa un respaldo
     * (por ejemplo "C0007", derivado de su id).
     */
    public static function codigoInventario(string $ubicacion, ?string $serie, string $respaldo = ''): string
    {
        $serie = trim((string) $serie);
        if ($serie === '') {
            $serie = $respaldo !== '' ? $respaldo : 'SIN-SERIE';
        }

        // El código no lleva espacios: se busca y se escribe de corrido.
        $serie = preg_replace('/\s+/u', '-', Texto::sinAcentos($serie)) ?? $serie;

        return self::acronimo($ubicacion) . '-' . Texto::mayusculas($serie);
    }

    /**
     * Siguiente código correlativo del año en curso.
     *
     * Se mira el último código emitido del año y se le suma uno. Si dos
     * personas crean un ticket en el mismo instante puede repetirse: la clave
     * única de la tabla lo rechaza y quien llama vuelve a intentar (ver emitir).
     */
    public static function siguienteCorrelativo(string $prefijo, ?string $ultimoCodigo): string
    {
        $anio   = date('Y');
        $numero = $ultimoCodigo !== null && $ultimoCodigo !== '' ? (int) substr($ultimoCodigo, -4) : 0;

        return sprintf('%s-%s-%04d', $prefijo, $anio, $numero + 1);
    }

    /** Prefijo con el que se buscan los códigos de este año: "TK-2026-". */
    public static function prefijoDelAnio(string $prefijo): string
    {
        return $prefijo . '-' . date('Y') . '-';
    }

    /**
     * Inserta reintentando si el correlativo se lo ganó otra petición.
     *
     * $ultimo devuelve el último código emitido; $insertar recibe el código a
     * usar y devuelve el id insertado.
     *
     * @return array{id: int, codigo: string}
     */
    public static function emitir(string $prefijo, callable $ultimo, callable $insertar): array
    {
        for ($intento = 0; $intento < 5; $intento++) {
            $codigo = self::siguienteCorrelativo($prefijo, $ultimo());

            try {
                return ['id' => $insertar($codigo), 'codigo' => $codigo];
            } catch (PDOException $e) {
                // 23000 = violación de clave única: otro pedido tomó ese número.
                if ($e->getCode() !== '23000' || !str_contains($e->getMessage(), 'codigo')) {
                    throw $e;
                }
            }
        }

        throw new ErrorDeNegocio('No se pudo generar un identificador único. Probá de nuevo.', 503);
    }
}
