<?php
/**
 * No se pudo abrir la conexión con la base de datos.
 *
 * Es distinto de un ErrorDeNegocio: no es que el pedido esté mal, es que el
 * sistema no puede funcionar. Lleva su propia ayuda porque la solución casi
 * siempre es de configuración (la base apagada, otro puerto, falta una
 * extensión de PHP) y esa pista ahorra media hora de búsqueda.
 */

declare(strict_types=1);

class ErrorDeConexion extends RuntimeException
{
    /**
     * @param string[] $ayuda Pasos concretos para resolverlo.
     * @param array    $extra Datos sueltos que acompañan al error.
     */
    public function __construct(string $mensaje, private array $ayuda = [], private array $extra = [])
    {
        parent::__construct($mensaje);
    }

    /** @return string[] */
    public function ayuda(): array
    {
        return $this->ayuda;
    }

    /** Por ejemplo, a dónde se intentó conectar. */
    public function extra(): array
    {
        return $this->extra;
    }
}
