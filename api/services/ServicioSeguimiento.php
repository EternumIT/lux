<?php
/**
 * Seguimiento de un registro: su línea de tiempo y quiénes lo miran.
 *
 * Tickets, solicitudes y préstamos comparten estas dos ideas, así que viven
 * acá una sola vez en lugar de repetirse en cada servicio:
 *
 *   · Historial     — un renglón por cambio de estado, con la nota de quien lo
 *                     hizo. La nota es obligatoria justamente para que el
 *                     historial cuente qué se hizo, y no solo que algo cambió.
 *   · Participantes — personas agregadas además del solicitante: lo ven y lo
 *                     siguen como si fuera propio.
 */

declare(strict_types=1);

final class ServicioSeguimiento
{
    private RepositorioHistorial $historial;
    private RepositorioParticipantes $participantes;
    private RepositorioUsuarios $usuarios;

    public function __construct(
        ?RepositorioHistorial $historial = null,
        ?RepositorioParticipantes $participantes = null,
        ?RepositorioUsuarios $usuarios = null
    ) {
        $this->historial     = $historial ?? new RepositorioHistorial();
        $this->participantes = $participantes ?? new RepositorioParticipantes();
        $this->usuarios      = $usuarios ?? new RepositorioUsuarios();
    }

    /** Agrega un renglón a la línea de tiempo, a nombre de quien esté en sesión. */
    public function registrar(string $entidad, int $entidadId, string $estado, ?string $nota): void
    {
        $usuario = Sesion::usuario();

        $this->historial->registrar(
            $entidad,
            $entidadId,
            $estado,
            $nota,
            isset($usuario['id']) ? (int) $usuario['id'] : null,
            $usuario['nombre'] ?? 'Sistema',
            $usuario['rol'] ?? 'Sistema'
        );
    }

    public function historial(string $entidad, int $entidadId): array
    {
        return $this->historial->listar($entidad, $entidadId);
    }

    public function participantes(string $entidad, int $entidadId): array
    {
        return $this->participantes->listar($entidad, $entidadId);
    }

    /**
     * Reemplaza la lista de participantes.
     *
     * Se valida que cada id exista; los repetidos y el propio solicitante se
     * descartan (el solicitante ya lo ve por ser suyo).
     *
     * Quién puede sumar a quién: el personal del área suma a cualquiera, pero
     * un usuario final solo puede sumar a otros usuarios finales. Si no, con
     * agregar a un técnico a su propio ticket tendría una forma de decidir a
     * quién le aparece trabajo en la pantalla.
     *
     * Esta comprobación es la que vale: el formulario solo ofrece a quien
     * corresponde, pero eso es dibujo y se puede saltear llamando a la API.
     */
    public function definirParticipantes(
        string $entidad,
        int $entidadId,
        array $usuarioIds,
        ?int $solicitanteId = null
    ): void {
        $actor = Sesion::usuario();
        $actorEsPersonal = Permisos::esPersonal($actor);

        $limpios = [];

        foreach ($usuarioIds as $id) {
            $id = (int) $id;
            if ($id > 0 && $id !== $solicitanteId) {
                $limpios[$id] = $id;
            }
        }

        foreach ($limpios as $id) {
            $agregado = $this->usuarios->porId($id);

            if ($agregado === null) {
                throw ErrorDeNegocio::datosInvalidos(
                    'Uno de los usuarios agregados no existe (id ' . $id . ').'
                );
            }

            if (!$actorEsPersonal && Permisos::esPersonal($agregado)) {
                throw ErrorDeNegocio::sinPermiso(
                    'Solo podés sumar a otros usuarios, no al personal del área.'
                );
            }
        }

        $this->participantes->reemplazar($entidad, $entidadId, array_values($limpios));
    }

    /** ¿Este usuario puede ver este registro en particular? */
    public function puedeVer(string $entidad, array $registro, array $usuario): bool
    {
        if (Permisos::esPersonal($usuario)) {
            return true;
        }

        if ((string) ($registro['solicitanteId'] ?? '') === (string) $usuario['id']) {
            return true;
        }

        return $this->participantes->participa($entidad, (int) $registro['id'], (int) $usuario['id']);
    }
}
