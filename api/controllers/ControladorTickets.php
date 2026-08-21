<?php
/**
 * Tickets de la mesa de ayuda.
 */

declare(strict_types=1);

final class ControladorTickets
{
    private ServicioTickets $servicio;

    public function __construct(?ServicioTickets $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioTickets();
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
