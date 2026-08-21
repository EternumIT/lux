<?php
/**
 * Acceso a la tabla de solicitudes de servicio.
 */

declare(strict_types=1);

final class RepositorioSolicitudes extends Repositorio
{
    private const CAMPOS = 's.id, s.codigo, s.titulo, s.detalle, s.solicitante,
            s.solicitante_id AS solicitanteId, s.estado, s.creado';

    /** @param array{alcance: string, usuarioId?: int} $criterio */
    public function listar(array $criterio): array
    {
        $visibilidad = $this->condicionVisibilidad($criterio, 'solicitud', 's');

        $sql = 'SELECT ' . self::CAMPOS . ",
                       (SELECT COUNT(*) FROM participantes p
                         WHERE p.entidad = 'solicitud' AND p.entidad_id = s.id) AS participantes
                  FROM solicitudes s";

        if ($visibilidad['sql'] !== '') {
            $sql .= ' WHERE ' . $visibilidad['sql'];
        }

        $sql .= ' ORDER BY s.creado DESC, s.id DESC';

        $filas = $this->consultar($sql, $visibilidad['params'])->fetchAll();

        return array_map(fn(array $f): array => $this->formatear($f), $filas);
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila('SELECT ' . self::CAMPOS . ' FROM solicitudes s WHERE s.id = ?', [$id]);

        return $fila === null ? null : $this->formatear($fila);
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            "INSERT INTO solicitudes (codigo, titulo, detalle, solicitante, solicitante_id, estado)
             VALUES (?, ?, ?, ?, ?, 'pendiente')",
            [
                $datos['codigo'],
                $datos['titulo'],
                $datos['detalle'],
                $datos['solicitante'],
                $datos['solicitanteId'],
            ]
        );

        return $this->ultimoId();
    }

    public function cambiarEstado(int $id, string $estado): void
    {
        $this->consultar('UPDATE solicitudes SET estado = ? WHERE id = ?', [$estado, $id]);
    }

    public function ultimoCodigoDelAnio(string $prefijoAnio): ?string
    {
        $codigo = $this->unValor(
            'SELECT codigo FROM solicitudes WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1',
            [$prefijoAnio . '%']
        );

        return $codigo === false ? null : (string) $codigo;
    }

    public function contarPorEstado(string $estado): int
    {
        return (int) $this->unValor('SELECT COUNT(*) FROM solicitudes WHERE estado = ?', [$estado]);
    }

    public function contarDeUsuario(int $usuarioId, array $estadosAbiertos): array
    {
        $marcadores = implode(',', array_fill(0, count($estadosAbiertos), '?'));

        $fila = $this->unaFila(
            "SELECT COUNT(*) AS total, SUM(estado IN ({$marcadores})) AS abiertos
               FROM solicitudes s
              WHERE s.solicitante_id = ?
                 OR EXISTS (SELECT 1 FROM participantes p
                             WHERE p.entidad = 'solicitud' AND p.entidad_id = s.id AND p.usuario_id = ?)",
            [...$estadosAbiertos, $usuarioId, $usuarioId]
        );

        return ['total' => (int) $fila['total'], 'abiertos' => (int) $fila['abiertos']];
    }

    public function creadasDesde(string $fecha): array
    {
        return $this->consultar(
            'SELECT creado, COUNT(*) AS total FROM solicitudes WHERE creado >= ? GROUP BY creado',
            [$fecha]
        )->fetchAll();
    }

    private function formatear(array $fila): array
    {
        $fila['solicitanteId'] = $this->idOpcional($fila['solicitanteId']);

        if (isset($fila['participantes'])) {
            $fila['participantes'] = (int) $fila['participantes'];
        }

        return $this->normalizar($fila);
    }
}
