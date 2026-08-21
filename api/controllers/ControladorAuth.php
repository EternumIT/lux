<?php
/**
 * Sesión: entrar, saber quién está, salir y cambiar la contraseña.
 *
 * Los controladores son deliberadamente cortos: leen lo que vino, se lo pasan
 * al servicio y arman la respuesta. Ninguna regla vive acá.
 */

declare(strict_types=1);

final class ControladorAuth
{
    private ServicioAuth $servicio;

    public function __construct(?ServicioAuth $servicio = null)
    {
        $this->servicio = $servicio ?? new ServicioAuth();
    }

    public function login(): Respuesta
    {
        return Respuesta::ok($this->servicio->iniciarSesion(Peticion::cuerpo()));
    }

    public function sesion(): Respuesta
    {
        return Respuesta::ok($this->servicio->sesionActual());
    }

    public function logout(): Respuesta
    {
        return Respuesta::ok($this->servicio->cerrarSesion());
    }

    public function cambiarPassword(): Respuesta
    {
        return Respuesta::ok($this->servicio->cambiarPassword(Peticion::cuerpo()));
    }
}
