<?php
/**
 * Enrutador: decide qué controlador atiende cada petición.
 *
 * Hay dos tipos de ruta:
 *   · fijas       — 'GET /tickets'
 *   · con id      — 'GET /tickets/{id}', donde {id} es un número
 *
 * El {id} se traduce internamente a una expresión regular, así la tabla de
 * rutas se lee como las direcciones que realmente usa el frontend y no como
 * un patrón.
 */

declare(strict_types=1);

final class Enrutador
{
    /** @var array<string, array{0: class-string, 1: string}> */
    private array $rutas = [];

    /**
     * Registra una ruta.
     *
     * @param string $definicion 'GET /tickets' o 'PATCH /tickets/{id}'
     * @param array  $destino    [NombreDeClase::class, 'metodo']
     */
    public function agregar(string $definicion, array $destino): void
    {
        $this->rutas[$definicion] = $destino;
    }

    /** Registra varias de una: definición => destino. */
    public function agregarVarias(array $tabla): void
    {
        foreach ($tabla as $definicion => $destino) {
            $this->agregar($definicion, $destino);
        }
    }

    /** Direcciones registradas, para la portada de la API. */
    public function definiciones(): array
    {
        return array_keys($this->rutas);
    }

    /**
     * Busca la ruta que corresponde y ejecuta su controlador.
     * Devuelve null si ninguna coincide.
     */
    public function resolver(string $metodo, string $ruta): ?Respuesta
    {
        foreach ($this->rutas as $definicion => $destino) {
            [$metodoRuta, $patron] = explode(' ', $definicion, 2);

            if ($metodo !== $metodoRuta) {
                continue;
            }

            $argumentos = self::coincide($patron, $ruta);
            if ($argumentos === null) {
                continue;
            }

            [$clase, $metodoControlador] = $destino;

            return (new $clase())->$metodoControlador(...$argumentos);
        }

        return null;
    }

    /**
     * ¿La ruta pedida encaja en este patrón?
     * Devuelve los ids capturados, o null si no encaja.
     */
    private static function coincide(string $patron, string $ruta): ?array
    {
        if (!str_contains($patron, '{id}')) {
            return $patron === $ruta ? [] : null;
        }

        $regex = '#^' . str_replace('\{id\}', '(\d+)', preg_quote($patron, '#')) . '$#';

        if (!preg_match($regex, $ruta, $coincidencias)) {
            return null;
        }

        return array_map('intval', array_slice($coincidencias, 1));
    }
}
