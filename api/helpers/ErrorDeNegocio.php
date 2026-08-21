<?php
/**
 * Error previsible de la aplicación: datos inválidos, permisos, no encontrado.
 *
 * Las capas de datos y de negocio no saben nada de HTTP: cuando algo no se
 * puede hacer, lanzan esta excepción con el motivo y el código que le
 * corresponde. La capa de presentación es la única que la traduce a una
 * respuesta JSON (ver index.php).
 *
 * Antes cada archivo llamaba a json_error(), que escribía la respuesta y
 * cortaba la ejecución. Eso ataba la lógica al protocolo: la misma regla no
 * se podía reutilizar desde un script de consola ni probar sin un navegador.
 */

declare(strict_types=1);

class ErrorDeNegocio extends RuntimeException
{
    public function __construct(string $mensaje, private int $estado = 400)
    {
        parent::__construct($mensaje);
    }

    /** Código HTTP con el que debe responderse este error. */
    public function estado(): int
    {
        return $this->estado;
    }

    /* ------------------------------------------------------------------
     * Atajos para los casos de siempre, para que quien los lanza no tenga
     * que acordarse del número.
     * ---------------------------------------------------------------- */

    /** 401 · hace falta iniciar sesión. */
    public static function sinSesion(string $mensaje = 'Necesitás iniciar sesión para hacer esto.'): self
    {
        return new self($mensaje, 401);
    }

    /** 403 · hay sesión, pero no alcanza. */
    public static function sinPermiso(string $mensaje): self
    {
        return new self($mensaje, 403);
    }

    /** 404 · no existe. */
    public static function noEncontrado(string $mensaje): self
    {
        return new self($mensaje, 404);
    }

    /** 409 · choca con algo que ya existe. */
    public static function conflicto(string $mensaje): self
    {
        return new self($mensaje, 409);
    }

    /** 422 · los datos vienen mal. */
    public static function datosInvalidos(string $mensaje): self
    {
        return new self($mensaje, 422);
    }
}
