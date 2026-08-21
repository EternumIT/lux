<?php
/**
 * Consulta del registro de auditoría (solo Root y Administrador).
 *
 * Es de solo lectura: no hay forma de crear, editar ni borrar registros desde
 * la API. Se escriben solos, desde la clase Auditoria.
 */

declare(strict_types=1);

final class ServicioAuditoria
{
    /** Tope de filas por consulta, para que la pantalla no se vuelva inmanejable. */
    private const LIMITE = 500;

    private RepositorioAuditoria $auditoria;

    public function __construct(?RepositorioAuditoria $auditoria = null)
    {
        $this->auditoria = $auditoria ?? new RepositorioAuditoria();
    }

    /**
     * Filtros (todos opcionales, se combinan entre sí):
     *   desde, hasta          → rango de fechas          (YYYY-MM-DD)
     *   horaDesde, horaHasta  → franja horaria del día   (HH:MM)
     *   usuario               → id del usuario           (quién)
     *   accion                → clave de la acción       (qué)
     *   q                     → búsqueda libre en nombre, detalle y entidad
     */
    public function consultar(array $filtros): array
    {
        Sesion::requerirAdmin();

        $filtro    = $this->armarFiltro($filtros);
        $registros = $this->auditoria->listar($filtro, self::LIMITE);
        $total     = $this->auditoria->contar($filtro);

        // Se separan fecha y hora, y se traduce la acción, para que la pantalla
        // no tenga que interpretar nada.
        $registros = array_map(static function (array $r): array {
            $r['fecha']       = substr((string) $r['fechaHora'], 0, 10);
            $r['hora']        = substr((string) $r['fechaHora'], 11, 5);
            $r['descripcion'] = Auditoria::ACCIONES[$r['accion']] ?? $r['accion'];

            return $r;
        }, $registros);

        return [
            'registros' => $registros,
            'total'     => $total,
            'limite'    => self::LIMITE,
            'recortado' => $total > self::LIMITE,
            // Opciones para armar los desplegables de los filtros.
            'acciones'  => array_map(
                static fn(string $clave, string $desc): array => ['clave' => $clave, 'descripcion' => $desc],
                array_keys(Auditoria::ACCIONES),
                array_values(Auditoria::ACCIONES)
            ),
            'usuarios'  => $this->auditoria->usuariosRegistrados(),
        ];
    }

    /**
     * Traduce los filtros de la pantalla a una condición SQL con sus
     * parámetros. Nada se concatena: todo viaja como marcador.
     *
     * @return array{sql: string, params: array}
     */
    private function armarFiltro(array $filtros): array
    {
        $condiciones = [];
        $parametros  = [];

        $desde = Validador::fechaOpcional($filtros['desde'] ?? '', 'desde');
        if ($desde !== null) {
            $condiciones[] = 'DATE(fecha_hora) >= ?';
            $parametros[]  = $desde;
        }

        $hasta = Validador::fechaOpcional($filtros['hasta'] ?? '', 'hasta');
        if ($hasta !== null) {
            $condiciones[] = 'DATE(fecha_hora) <= ?';
            $parametros[]  = $hasta;
        }

        // La franja horaria se aplica a cada día del rango, no una sola vez:
        // así se puede pedir, por ejemplo, "todo lo que pasó fuera del horario
        // de clase" a lo largo de una semana entera.
        $horaDesde = Validador::horaOpcional($filtros['horaDesde'] ?? '', 'horaDesde');
        if ($horaDesde !== null) {
            $condiciones[] = 'TIME(fecha_hora) >= ?';
            $parametros[]  = $horaDesde . ':00';
        }

        $horaHasta = Validador::horaOpcional($filtros['horaHasta'] ?? '', 'horaHasta');
        if ($horaHasta !== null) {
            $condiciones[] = 'TIME(fecha_hora) <= ?';
            $parametros[]  = $horaHasta . ':59';
        }

        $usuario = trim((string) ($filtros['usuario'] ?? ''));
        if ($usuario !== '') {
            if (!ctype_digit($usuario)) {
                throw ErrorDeNegocio::datosInvalidos('El filtro "usuario" debe ser un identificador numérico.');
            }
            $condiciones[] = 'usuario_id = ?';
            $parametros[]  = (int) $usuario;
        }

        $accion = trim((string) ($filtros['accion'] ?? ''));
        if ($accion !== '') {
            if (!array_key_exists($accion, Auditoria::ACCIONES)) {
                throw ErrorDeNegocio::datosInvalidos('El filtro "accion" no corresponde a ninguna acción registrada.');
            }
            $condiciones[] = 'accion = ?';
            $parametros[]  = $accion;
        }

        $texto = trim((string) ($filtros['q'] ?? ''));
        if ($texto !== '') {
            $condiciones[] = '(usuario_nombre LIKE ? OR detalle LIKE ? OR entidad LIKE ?)';
            $comodin = '%' . $texto . '%';
            array_push($parametros, $comodin, $comodin, $comodin);
        }

        return [
            'sql'    => $condiciones ? implode(' AND ', $condiciones) : '',
            'params' => $parametros,
        ];
    }
}
