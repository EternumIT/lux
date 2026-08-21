<?php
/**
 * Base de los repositorios (capa de datos: repositories).
 *
 * Un repositorio es lo único que escribe SQL: recibe y devuelve datos ya
 * normalizados, sin saber quién los pidió ni para qué. Esa separación es la
 * que permite cambiar una consulta sin tocar las reglas del sistema, y al
 * revés.
 */

declare(strict_types=1);

abstract class Repositorio
{
    protected PDO $bd;

    public function __construct(?PDO $bd = null)
    {
        $this->bd = $bd ?? Conexion::obtener();
    }

    /** Ejecuta una consulta preparada y devuelve la sentencia lista para leer. */
    protected function consultar(string $sql, array $parametros = []): PDOStatement
    {
        $sentencia = $this->bd->prepare($sql);
        $sentencia->execute($parametros);

        return $sentencia;
    }

    /** Primera fila, o null si no hubo ninguna. */
    protected function unaFila(string $sql, array $parametros = []): ?array
    {
        $fila = $this->consultar($sql, $parametros)->fetch();

        return $fila === false ? null : $fila;
    }

    /** Primer valor de la primera fila (para los COUNT y los SELECT de una columna). */
    protected function unValor(string $sql, array $parametros = []): mixed
    {
        return $this->consultar($sql, $parametros)->fetchColumn();
    }

    /** Id que la base le asignó a la última fila insertada. */
    protected function ultimoId(): int
    {
        return (int) $this->bd->lastInsertId();
    }

    /**
     * Normaliza una fila al formato que espera el frontend: los ids viajan
     * como texto (en JavaScript los números grandes pierden precisión) y los
     * booleanos como true/false en vez de 1/0.
     */
    protected function normalizar(array $fila, array $enteros = [], array $booleanos = []): array
    {
        if (isset($fila['id'])) {
            $fila['id'] = (string) $fila['id'];
        }

        foreach ($enteros as $campo) {
            if (isset($fila[$campo])) {
                $fila[$campo] = (int) $fila[$campo];
            }
        }

        foreach ($booleanos as $campo) {
            if (array_key_exists($campo, $fila)) {
                $fila[$campo] = (bool) $fila[$campo];
            }
        }

        return $fila;
    }

    /** Aplica normalizar() a una lista completa. */
    protected function normalizarLista(array $filas, array $enteros = [], array $booleanos = []): array
    {
        return array_map(
            fn(array $fila): array => $this->normalizar($fila, $enteros, $booleanos),
            $filas
        );
    }

    /**
     * Traduce a SQL el alcance que decidió la capa de negocio.
     *
     * "todo" no filtra nada; "propios" limita a lo que la persona pidió más
     * aquello en lo que figura como participante.
     *
     * @param  array{alcance: string, usuarioId?: int} $criterio
     * @return array{sql: string, params: array}
     */
    protected function condicionVisibilidad(array $criterio, string $entidad, string $alias): array
    {
        if (($criterio['alcance'] ?? 'todo') === 'todo') {
            return ['sql' => '', 'params' => []];
        }

        $usuarioId = (int) ($criterio['usuarioId'] ?? 0);

        return [
            'sql' => "({$alias}.solicitante_id = ? OR EXISTS (
                          SELECT 1 FROM participantes p
                           WHERE p.entidad = ? AND p.entidad_id = {$alias}.id AND p.usuario_id = ?
                      ))",
            'params' => [$usuarioId, $entidad, $usuarioId],
        ];
    }

    /** Convierte a texto un id que puede venir nulo, para que viaje igual que los demás. */
    protected function idOpcional(mixed $valor): ?string
    {
        return $valor === null ? null : (string) $valor;
    }
}
