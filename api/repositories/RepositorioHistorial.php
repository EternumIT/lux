<?php
/**
 * Acceso a la tabla de historial: la línea de tiempo de tickets, solicitudes
 * y préstamos.
 */

declare(strict_types=1);

final class RepositorioHistorial extends Repositorio
{
    /** Agrega un renglón a la línea de tiempo. */
    public function registrar(
        string $entidad,
        int $entidadId,
        string $estado,
        ?string $nota,
        ?int $usuarioId,
        string $usuarioNombre,
        string $usuarioRol
    ): void {
        $this->consultar(
            'INSERT INTO historial (entidad, entidad_id, estado, nota, usuario_id, usuario_nombre, usuario_rol)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$entidad, $entidadId, $estado, $nota, $usuarioId, $usuarioNombre, $usuarioRol]
        );
    }

    /** Del renglón más viejo al más nuevo: se lee como un relato. */
    public function listar(string $entidad, int $entidadId): array
    {
        $filas = $this->consultar(
            'SELECT id, estado, nota, usuario_id AS usuarioId, usuario_nombre AS usuario,
                    usuario_rol AS rol, fecha_hora AS fechaHora
               FROM historial
              WHERE entidad = ? AND entidad_id = ?
              ORDER BY fecha_hora, id',
            [$entidad, $entidadId]
        )->fetchAll();

        return array_map(function (array $f): array {
            $f['usuarioId'] = $this->idOpcional($f['usuarioId']);
            return $this->normalizar($f);
        }, $filas);
    }
}
