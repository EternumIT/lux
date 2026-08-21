<?php
/**
 * Inventario: equipos y componentes.
 */

declare(strict_types=1);

final class ControladorInventario
{
    private ServicioInventario $servicio;

    public function __construct(?ServicioInventario $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioInventario();
    }

    /** GET /equipos — acepta ?buscar=, ?ubicacion= y ?estado=. */
    public function listarEquipos(): Respuesta
    {
        $consulta = Peticion::consulta();

        return Respuesta::ok($this->servicio->listarEquipos([
            'buscar'    => $consulta['buscar'] ?? '',
            'ubicacion' => $consulta['ubicacion'] ?? '',
            'estado'    => $consulta['estado'] ?? '',
        ]));
    }

    public function crearEquipo(): Respuesta
    {
        return Respuesta::creada($this->servicio->crearEquipo(Peticion::cuerpo()));
    }

    public function listarComponentes(): Respuesta
    {
        $consulta = Peticion::consulta();

        return Respuesta::ok($this->servicio->listarComponentes([
            'buscar' => $consulta['buscar'] ?? '',
        ]));
    }

    public function crearComponente(): Respuesta
    {
        return Respuesta::creada($this->servicio->crearComponente(Peticion::cuerpo()));
    }
}
