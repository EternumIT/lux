<?php
/**
 * Acceso a la tabla de componentes.
 */

declare(strict_types=1);

final class RepositorioComponentes extends Repositorio
{
    private const CAMPOS = 'id, codigo, nombre, modelo, fabricante, ubicacion, serie,
            part_number AS partNumber, es_fabrica AS esFabrica, funcionando, creado';

    public function listar(array $filtros = []): array
    {
        $condiciones = [];
        $parametros  = [];

        $buscar = trim((string) ($filtros['buscar'] ?? ''));
        if ($buscar !== '') {
            $condiciones[] = '(codigo LIKE ? OR serie LIKE ? OR nombre LIKE ?
                                OR modelo LIKE ? OR fabricante LIKE ? OR ubicacion LIKE ?)';
            $parametros = array_fill(0, 6, '%' . $buscar . '%');
        }

        $sql = 'SELECT ' . self::CAMPOS . ' FROM componentes';
        if ($condiciones) {
            $sql .= ' WHERE ' . implode(' AND ', $condiciones);
        }
        $sql .= ' ORDER BY ubicacion, codigo';

        return $this->normalizarLista(
            $this->consultar($sql, $parametros)->fetchAll(),
            [],
            ['esFabrica', 'funcionando']
        );
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila('SELECT ' . self::CAMPOS . ' FROM componentes WHERE id = ?', [$id]);

        return $fila === null ? null : $this->normalizar($fila, [], ['esFabrica', 'funcionando']);
    }

    public function existeCodigo(string $codigo): bool
    {
        return (bool) $this->unValor('SELECT 1 FROM componentes WHERE codigo = ? LIMIT 1', [$codigo]);
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            'INSERT INTO componentes
                (codigo, nombre, modelo, fabricante, ubicacion, serie, part_number, es_fabrica, funcionando)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $datos['codigo'],
                $datos['nombre'],
                $datos['modelo'],
                $datos['fabricante'],
                $datos['ubicacion'],
                $datos['serie'],
                $datos['partNumber'],
                $datos['esFabrica'] ? 1 : 0,
                $datos['funcionando'] ? 1 : 0,
            ]
        );

        return $this->ultimoId();
    }

    /**
     * Un componente sin número de serie no puede tener su código hasta que la
     * base le asigna un id, así que se completa en un segundo paso.
     */
    public function cambiarCodigo(int $id, string $codigo): void
    {
        $this->consultar('UPDATE componentes SET codigo = ? WHERE id = ?', [$codigo, $id]);
    }
}
