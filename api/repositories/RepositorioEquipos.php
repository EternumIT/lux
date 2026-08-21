<?php
/**
 * Acceso a la tabla de equipos.
 */

declare(strict_types=1);

final class RepositorioEquipos extends Repositorio
{
    private const CAMPOS = 'id, codigo, tipo, ubicacion, marca, modelo, serie,
            part_number AS partNumber, estado, fallas, creado';

    /**
     * Listado con filtros opcionales: buscar, ubicacion, estado.
     *
     * "buscar" es lo que usa el buscador de equipos al mencionar uno en un
     * ticket o un préstamo: mira el código, la serie, la marca, el modelo, el
     * tipo y la ubicación, para que alcance con escribir cualquiera de ellos.
     */
    public function listar(array $filtros = []): array
    {
        $condiciones = [];
        $parametros  = [];

        $buscar = trim((string) ($filtros['buscar'] ?? ''));
        if ($buscar !== '') {
            $condiciones[] = '(codigo LIKE ? OR serie LIKE ? OR marca LIKE ?
                                OR modelo LIKE ? OR tipo LIKE ? OR ubicacion LIKE ?)';
            $parametros = array_fill(0, 6, '%' . $buscar . '%');
        }

        $ubicacion = trim((string) ($filtros['ubicacion'] ?? ''));
        if ($ubicacion !== '') {
            $condiciones[] = 'ubicacion = ?';
            $parametros[]  = $ubicacion;
        }

        $estado = trim((string) ($filtros['estado'] ?? ''));
        if ($estado !== '') {
            $condiciones[] = 'estado = ?';
            $parametros[]  = $estado;
        }

        $sql = 'SELECT ' . self::CAMPOS . ' FROM equipos';
        if ($condiciones) {
            $sql .= ' WHERE ' . implode(' AND ', $condiciones);
        }
        $sql .= ' ORDER BY ubicacion, codigo';

        return $this->normalizarLista($this->consultar($sql, $parametros)->fetchAll());
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila('SELECT ' . self::CAMPOS . ' FROM equipos WHERE id = ?', [$id]);

        return $fila === null ? null : $this->normalizar($fila);
    }

    public function existe(int $id): bool
    {
        return (bool) $this->unValor('SELECT 1 FROM equipos WHERE id = ? LIMIT 1', [$id]);
    }

    public function existeSerie(string $serie): bool
    {
        return (bool) $this->unValor('SELECT 1 FROM equipos WHERE serie = ? LIMIT 1', [$serie]);
    }

    public function existeCodigo(string $codigo): bool
    {
        return (bool) $this->unValor('SELECT 1 FROM equipos WHERE codigo = ? LIMIT 1', [$codigo]);
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            'INSERT INTO equipos (codigo, tipo, ubicacion, marca, modelo, serie, part_number, estado, fallas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $datos['codigo'],
                $datos['tipo'],
                $datos['ubicacion'],
                $datos['marca'],
                $datos['modelo'],
                $datos['serie'],
                $datos['partNumber'],
                $datos['estado'],
                $datos['fallas'],
            ]
        );

        return $this->ultimoId();
    }

    /**
     * Equipos agrupados por ubicación, con cuántos no están operativos.
     * Es lo que arma el filtro de laboratorios de la pantalla de inicio.
     */
    public function porUbicacion(): array
    {
        $filas = $this->consultar(
            "SELECT ubicacion, COUNT(*) AS equipos,
                    SUM(estado <> 'operativo') AS conProblemas
               FROM equipos
              GROUP BY ubicacion
              ORDER BY ubicacion"
        )->fetchAll();

        return array_map(static fn(array $f): array => [
            'ubicacion'    => $f['ubicacion'],
            'equipos'      => (int) $f['equipos'],
            'conProblemas' => (int) $f['conProblemas'],
        ], $filas);
    }

    /** Ubicación y fallas de todos los equipos, para las gráficas del panel. */
    public function ubicacionesYFallas(): array
    {
        return $this->consultar('SELECT ubicacion, fallas FROM equipos')->fetchAll();
    }

    public function contar(): int
    {
        return (int) $this->unValor('SELECT COUNT(*) FROM equipos');
    }

    public function contarPorEstado(string $estado): int
    {
        return (int) $this->unValor('SELECT COUNT(*) FROM equipos WHERE estado = ?', [$estado]);
    }
}
