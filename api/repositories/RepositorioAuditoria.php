<?php
/**
 * Acceso a la tabla de auditoría.
 *
 * Es de solo escritura y lectura: no hay ningún método para editar ni borrar,
 * a propósito. Un registro que se puede modificar no sirve como registro.
 */

declare(strict_types=1);

final class RepositorioAuditoria extends Repositorio
{
    public function registrar(
        ?int $usuarioId,
        string $usuarioNombre,
        string $usuarioRol,
        string $accion,
        ?string $entidad,
        ?string $entidadId,
        ?string $detalle
    ): void {
        $this->consultar(
            'INSERT INTO auditoria
                (usuario_id, usuario_nombre, usuario_rol, accion, entidad, entidad_id, detalle)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$usuarioId, $usuarioNombre, $usuarioRol, $accion, $entidad, $entidadId, $detalle]
        );
    }

    /**
     * Registros que cumplen las condiciones ya armadas por la capa de negocio.
     *
     * @param array{sql: string, params: array} $filtro
     */
    public function listar(array $filtro, int $limite): array
    {
        $where = $filtro['sql'] !== '' ? ' WHERE ' . $filtro['sql'] : '';

        $filas = $this->consultar(
            'SELECT id, fecha_hora AS fechaHora, usuario_id AS usuarioId,
                    usuario_nombre AS usuarioNombre, usuario_rol AS usuarioRol,
                    accion, entidad, entidad_id AS entidadId, detalle
               FROM auditoria' . $where . '
              ORDER BY fecha_hora DESC, id DESC
              LIMIT ' . $limite,
            $filtro['params']
        )->fetchAll();

        return array_map(function (array $f): array {
            $f['usuarioId'] = $this->idOpcional($f['usuarioId']);
            return $this->normalizar($f);
        }, $filas);
    }

    /** Total sin el tope, para poder avisar si la consulta quedó recortada. */
    public function contar(array $filtro): int
    {
        $where = $filtro['sql'] !== '' ? ' WHERE ' . $filtro['sql'] : '';

        return (int) $this->unValor('SELECT COUNT(*) FROM auditoria' . $where, $filtro['params']);
    }

    /** Personas que aparecen en el registro, para armar el desplegable del filtro. */
    public function usuariosRegistrados(): array
    {
        return $this->consultar(
            'SELECT DISTINCT usuario_id AS id, usuario_nombre AS nombre
               FROM auditoria
              WHERE usuario_id IS NOT NULL
              ORDER BY usuario_nombre'
        )->fetchAll();
    }
}
