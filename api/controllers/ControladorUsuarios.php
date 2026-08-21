<?php
/**
 * Usuarios: la sección administrativa y el directorio de nombres.
 */

declare(strict_types=1);

final class ControladorUsuarios
{
    private ServicioUsuarios $servicio;

    public function __construct(?ServicioUsuarios $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioUsuarios();
    }

    public function listar(): Respuesta
    {
        return Respuesta::ok($this->servicio->listar());
    }

    public function directorio(): Respuesta
    {
        return Respuesta::ok($this->servicio->directorio());
    }

    public function crear(): Respuesta
    {
        return Respuesta::creada($this->servicio->crear(Peticion::cuerpo()));
    }

    public function actualizar(int $id): Respuesta
    {
        return Respuesta::ok($this->servicio->actualizar($id, Peticion::cuerpo()));
    }

    public function cambiarBloqueo(int $id): Respuesta
    {
        return Respuesta::ok($this->servicio->cambiarBloqueo($id, Peticion::cuerpo()));
    }
}
