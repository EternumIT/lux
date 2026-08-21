<?php
/**
 * Acceso a la tabla de tickets.
 *
 * El listado recibe desde la capa de negocio una condición de visibilidad ya
 * armada (ver Permisos): el repositorio la pega al WHERE, pero no decide
 * quién ve qué. Así el recorte ocurre en la base —nunca en el navegador— sin
 * que esta clase tenga que conocer los roles del sistema.
 */

declare(strict_types=1);

final class RepositorioTickets extends Repositorio
{
    private const CAMPOS = 't.id, t.codigo, t.titulo, t.descripcion,
            t.equipo_id AS equipoId, e.codigo AS equipoCodigo,
            e.ubicacion AS equipoUbicacion, e.marca AS equipoMarca, e.modelo AS equipoModelo,
            t.solicitante, t.solicitante_id AS solicitanteId, t.estado, t.creado';

    /** @param array{alcance: string, usuarioId?: int} $criterio */
    public function listar(array $criterio): array
    {
        $visibilidad = $this->condicionVisibilidad($criterio, 'ticket', 't');

        $sql = 'SELECT ' . self::CAMPOS . ",
                       (SELECT COUNT(*) FROM participantes p
                         WHERE p.entidad = 'ticket' AND p.entidad_id = t.id) AS participantes
                  FROM tickets t
                  LEFT JOIN equipos e ON e.id = t.equipo_id";

        if ($visibilidad['sql'] !== '') {
            $sql .= ' WHERE ' . $visibilidad['sql'];
        }

        $sql .= ' ORDER BY t.creado DESC, t.id DESC';

        $filas = $this->consultar($sql, $visibilidad['params'])->fetchAll();

        return array_map(fn(array $f): array => $this->formatear($f), $filas);
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila(
            'SELECT ' . self::CAMPOS . '
               FROM tickets t
               LEFT JOIN equipos e ON e.id = t.equipo_id
              WHERE t.id = ?',
            [$id]
        );

        return $fila === null ? null : $this->formatear($fila);
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            "INSERT INTO tickets (codigo, titulo, descripcion, equipo_id, solicitante, solicitante_id, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'pendiente')",
            [
                $datos['codigo'],
                $datos['titulo'],
                $datos['descripcion'],
                $datos['equipoId'],
                $datos['solicitante'],
                $datos['solicitanteId'],
            ]
        );

        return $this->ultimoId();
    }

    public function cambiarEstado(int $id, string $estado): void
    {
        $this->consultar('UPDATE tickets SET estado = ? WHERE id = ?', [$estado, $id]);
    }

    /** Último código emitido del año, para calcular el siguiente. */
    public function ultimoCodigoDelAnio(string $prefijoAnio): ?string
    {
        $codigo = $this->unValor(
            'SELECT codigo FROM tickets WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1',
            [$prefijoAnio . '%']
        );

        return $codigo === false ? null : (string) $codigo;
    }

    public function contarPorEstados(array $estados): int
    {
        $marcadores = implode(',', array_fill(0, count($estados), '?'));

        return (int) $this->unValor(
            'SELECT COUNT(*) FROM tickets WHERE estado IN (' . $marcadores . ')',
            $estados
        );
    }

    /** Conteo de tickets por estado, con todos los estados presentes en cero. */
    public function contarPorEstado(array $estadosPosibles): array
    {
        $conteo = array_fill_keys($estadosPosibles, 0);

        foreach ($this->consultar('SELECT estado, COUNT(*) AS total FROM tickets GROUP BY estado')->fetchAll() as $fila) {
            if (array_key_exists($fila['estado'], $conteo)) {
                $conteo[$fila['estado']] = (int) $fila['total'];
            }
        }

        return $conteo;
    }

    /**
     * Cuántos tiene esa persona: los que abrió más aquellos a los que la
     * sumaron. Devuelve el total y cuántos siguen abiertos.
     */
    public function contarDeUsuario(int $usuarioId, array $estadosAbiertos): array
    {
        $marcadores = implode(',', array_fill(0, count($estadosAbiertos), '?'));

        $fila = $this->unaFila(
            "SELECT COUNT(*) AS total, SUM(estado IN ({$marcadores})) AS abiertos
               FROM tickets t
              WHERE t.solicitante_id = ?
                 OR EXISTS (SELECT 1 FROM participantes p
                             WHERE p.entidad = 'ticket' AND p.entidad_id = t.id AND p.usuario_id = ?)",
            [...$estadosAbiertos, $usuarioId, $usuarioId]
        );

        return ['total' => (int) $fila['total'], 'abiertos' => (int) $fila['abiertos']];
    }

    /** Ids y fechas para la gráfica de actividad del panel. */
    public function creadosDesde(string $fecha): array
    {
        return $this->consultar(
            'SELECT creado, COUNT(*) AS total FROM tickets WHERE creado >= ? GROUP BY creado',
            [$fecha]
        )->fetchAll();
    }

    private function formatear(array $fila): array
    {
        $fila['equipoId']      = $this->idOpcional($fila['equipoId']);
        $fila['solicitanteId'] = $this->idOpcional($fila['solicitanteId']);

        if (isset($fila['participantes'])) {
            $fila['participantes'] = (int) $fila['participantes'];
        }

        return $this->normalizar($fila);
    }
}
