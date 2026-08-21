<?php
/**
 * Solicitudes de servicio.
 */

declare(strict_types=1);

final class ControladorSolicitudes
{
    private ServicioSolicitudes $servicio;

    public function __construct(?ServicioSolicitudes $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioSolicitudes();
    }

    public function listar(): Respuesta
    {
        return Respuesta::ok($this->servicio->listar());
    }

    public function detalle(int $id): Respuesta
    {
        return Respuesta::ok($this->servicio->detalle($id));
    }

    public function crear(): Respuesta
    {
        return Respuesta::creada($this->servicio->crear(Peticion::cuerpo()));
    }

    public function cambiarEstado(int $id): Respuesta
    {
        return Respuesta::ok($this->servicio->cambiarEstado($id, Peticion::cuerpo()));
    }
}
