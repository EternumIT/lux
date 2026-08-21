<?php
/**
 * Acceso a la tabla de préstamos.
 */

declare(strict_types=1);

final class RepositorioPrestamos extends Repositorio
{
    private const CAMPOS = 'p.id, p.codigo, p.equipo_id AS equipoId, e.codigo AS equipoCodigo,
            e.marca AS equipoMarca, e.modelo AS equipoModelo,
            p.solicitante, p.solicitante_id AS solicitanteId,
            p.fecha_inicio AS fechaInicio, p.fecha_limite AS fechaLimite, p.estado';

    public function listar(): array
    {
        $filas = $this->consultar(
            'SELECT ' . self::CAMPOS . '
               FROM prestamos p
               LEFT JOIN equipos e ON e.id = p.equipo_id
              ORDER BY p.id DESC'
        )->fetchAll();

        return array_map(fn(array $f): array => $this->formatear($f), $filas);
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila(
            'SELECT ' . self::CAMPOS . '
               FROM prestamos p
               LEFT JOIN equipos e ON e.id = p.equipo_id
              WHERE p.id = ?',
            [$id]
        );

        return $fila === null ? null : $this->formatear($fila);
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            'INSERT INTO prestamos (codigo, equipo_id, solicitante, solicitante_id, fecha_limite, estado)
             VALUES (?, ?, ?, ?, ?, ?)',
            [
                $datos['codigo'],
                $datos['equipoId'],
                $datos['solicitante'],
                $datos['solicitanteId'],
                $datos['fechaLimite'],
                $datos['estado'],
            ]
        );

        return $this->ultimoId();
    }

    public function cambiarEstado(int $id, string $estado): void
    {
        $this->consultar('UPDATE prestamos SET estado = ? WHERE id = ?', [$estado, $id]);
    }

    /**
     * Marca como "vencido" todo préstamo activo cuya fecha límite ya pasó.
     * Se ejecuta antes de listar para que el estado refleje la realidad sin
     * depender de que alguien lo actualice a mano.
     */
    public function marcarVencidos(): void
    {
        $this->bd->exec(
            "UPDATE prestamos
                SET estado = 'vencido'
              WHERE estado = 'activo' AND fecha_limite < CURRENT_DATE"
        );
    }

    public function ultimoCodigoDelAnio(string $prefijoAnio): ?string
    {
        $codigo = $this->unValor(
            'SELECT codigo FROM prestamos WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1',
            [$prefijoAnio . '%']
        );

        return $codigo === false ? null : (string) $codigo;
    }

    public function contarPorEstado(string $estado): int
    {
        return (int) $this->unValor('SELECT COUNT(*) FROM prestamos WHERE estado = ?', [$estado]);
    }

    private function formatear(array $fila): array
    {
        $fila['equipoId']      = $this->idOpcional($fila['equipoId']);
        $fila['solicitanteId'] = $this->idOpcional($fila['solicitanteId']);

        return $this->normalizar($fila);
    }
}
