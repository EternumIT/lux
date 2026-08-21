<?php
/**
 * Los dos resúmenes del sistema.
 *
 *   /inicio    → lo que necesita quien entra, según su rol.
 *   /dashboard → las métricas de la pantalla "Estado de Equipos".
 *
 * Van juntos porque son lo mismo desde afuera —una sola lectura sin
 * parámetros— aunque por dentro los calculen servicios distintos.
 */

declare(strict_types=1);

final class ControladorResumenes
{
    private ServicioInicio $inicio;
    private ServicioPanel $panel;

    public function __construct(?ServicioInicio $inicio = null, ?ServicioPanel $panel = null)
    {
        $this->inicio = $inicio ?? new ServicioInicio();
        $this->panel  = $panel ?? new ServicioPanel();
    }

    public function inicio(): Respuesta
    {
        return Respuesta::ok($this->inicio->resumen());
    }

    public function panel(): Respuesta
    {
        return Respuesta::ok($this->panel->resumen());
    }
}
