<?php
/**
 * Registro de auditoría y matriz de permisos.
 *
 * Las dos son consultas de solo lectura de la sección administrativa.
 */

declare(strict_types=1);

final class ControladorAuditoria
{
    private ServicioAuditoria $servicio;

    public function __construct(?ServicioAuditoria $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioAuditoria();
    }

    public function listar(): Respuesta
    {
        return Respuesta::ok($this->servicio->consultar(Peticion::consulta()));
    }

    /** GET /permisos — la matriz tal como la dibuja la pantalla. */
    public function permisos(): Respuesta
    {
        Sesion::requerirAdmin();

        return Respuesta::ok(Permisos::paraPantalla());
    }
}
