<?php
/**
 * Acceso a la tabla de participantes: quiénes siguen un ticket o una
 * solicitud además de quien lo abrió.
 */

declare(strict_types=1);

final class RepositorioParticipantes extends Repositorio
{
    /** Reemplaza la lista completa de participantes de un registro. */
    public function reemplazar(string $entidad, int $entidadId, array $usuarioIds): void
    {
        $this->consultar(
            'DELETE FROM participantes WHERE entidad = ? AND entidad_id = ?',
            [$entidad, $entidadId]
        );

        foreach ($usuarioIds as $usuarioId) {
            $this->consultar(
                'INSERT INTO participantes (entidad, entidad_id, usuario_id) VALUES (?, ?, ?)',
                [$entidad, $entidadId, $usuarioId]
            );
        }
    }

    /** Participantes con los datos que muestra la pantalla. */
    public function listar(string $entidad, int $entidadId): array
    {
        $filas = $this->consultar(
            'SELECT u.id, u.nombre, u.rol, u.iniciales
               FROM participantes p
               JOIN usuarios u ON u.id = p.usuario_id
              WHERE p.entidad = ? AND p.entidad_id = ?
              ORDER BY u.nombre',
            [$entidad, $entidadId]
        )->fetchAll();

        return $this->normalizarLista($filas);
    }

    public function participa(string $entidad, int $entidadId, int $usuarioId): bool
    {
        return (bool) $this->unValor(
            'SELECT 1 FROM participantes
              WHERE entidad = ? AND entidad_id = ? AND usuario_id = ? LIMIT 1',
            [$entidad, $entidadId, $usuarioId]
        );
    }
}
