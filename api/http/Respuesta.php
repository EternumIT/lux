<?php
/**
 * La respuesta que sale (capa de presentación: controllers).
 *
 * Los controladores devuelven una de estas y no escriben nunca en la salida:
 * quien la envía es el front controller, en un solo lugar. Eso mantiene el
 * formato parejo (siempre JSON, siempre UTF-8) y hace que se pueda probar un
 * controlador mirando lo que devuelve, sin levantar un servidor.
 */

declare(strict_types=1);

final class Respuesta
{
    private function __construct(public readonly mixed $datos, public readonly int $estado)
    {
    }

    /** 200 · salió bien. */
    public static function ok(mixed $datos): self
    {
        return new self($datos, 200);
    }

    /** 201 · se creó algo nuevo. */
    public static function creada(mixed $datos): self
    {
        return new self($datos, 201);
    }

    /** Respuesta de error, con el mensaje que va a leer una persona. */
    public static function error(string $mensaje, int $estado, array $extra = []): self
    {
        return new self(array_merge(['error' => $mensaje], $extra), $estado);
    }

    /** Escribe la respuesta y termina. */
    public function enviar(): never
    {
        http_response_code($this->estado);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($this->datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
