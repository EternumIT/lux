<?php
/**
 * Préstamos de equipos.
 */

declare(strict_types=1);

final class ControladorPrestamos
{
    private ServicioPrestamos $servicio;

    public function __construct(?ServicioPrestamos $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioPrestamos();
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
