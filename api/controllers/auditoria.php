<?php
/**
 * Consulta del registro de auditoría (solo Root y Administrador).
 *
 * Es de solo lectura: no hay forma de crear, editar ni borrar registros desde
 * la API. Se escriben solos, desde auditar().
 */

declare(strict_types=1);

/** Tope de filas por consulta, para que la pantalla no se vuelva inmanejable. */
const AUDITORIA_LIMITE = 500;

/** Valida un parámetro opcional con formato YYYY-MM-DD. */
function auditoria_fecha(?string $valor, string $campo): ?string
{
    $valor = trim((string) $valor);
    if ($valor === '') {
        return null;
    }

    $fecha = DateTime::createFromFormat('Y-m-d', $valor);
    if (!$fecha || $fecha->format('Y-m-d') !== $valor) {
        json_error('El filtro "' . $campo . '" debe tener formato YYYY-MM-DD.', 422);
    }

    return $valor;
}

/** Valida un parámetro opcional con formato HH:MM. */
function auditoria_hora(?string $valor, string $campo): ?string
{
    $valor = trim((string) $valor);
    if ($valor === '') {
        return null;
    }

    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $valor)) {
        json_error('El filtro "' . $campo . '" debe tener formato HH:MM.', 422);
    }

    return $valor;
}

/**
 * GET /auditoria
 *
 * Filtros (todos opcionales, se combinan entre sí):
 *   desde, hasta          → rango de fechas          (YYYY-MM-DD)
 *   horaDesde, horaHasta  → franja horaria del día   (HH:MM)
 *   usuario               → id del usuario           (quién)
 *   accion                → clave de la acción       (qué)
 *   q                     → búsqueda libre en nombre, detalle y entidad
 */
function auditoria_listar(): never
{
    requerir_rol(['Root', 'Administrador']);

    $condiciones = [];
    $parametros = [];

    $desde = auditoria_fecha($_GET['desde'] ?? null, 'desde');
    $hasta = auditoria_fecha($_GET['hasta'] ?? null, 'hasta');

    if ($desde !== null) {
        $condiciones[] = 'DATE(fecha_hora) >= ?';
        $parametros[] = $desde;
    }
    if ($hasta !== null) {
        $condiciones[] = 'DATE(fecha_hora) <= ?';
        $parametros[] = $hasta;
    }

    // La franja horaria se aplica a cada día del rango, no una sola vez:
    // así se puede pedir, por ejemplo, "todo lo que pasó fuera del horario
    // de clase" a lo largo de una semana entera.
    $horaDesde = auditoria_hora($_GET['horaDesde'] ?? null, 'horaDesde');
    $horaHasta = auditoria_hora($_GET['horaHasta'] ?? null, 'horaHasta');

    if ($horaDesde !== null) {
        $condiciones[] = 'TIME(fecha_hora) >= ?';
        $parametros[] = $horaDesde . ':00';
    }
    if ($horaHasta !== null) {
        $condiciones[] = 'TIME(fecha_hora) <= ?';
        $parametros[] = $horaHasta . ':59';
    }

    // Quién
    $usuario = trim((string) ($_GET['usuario'] ?? ''));
    if ($usuario !== '') {
        if (!ctype_digit($usuario)) {
            json_error('El filtro "usuario" debe ser un identificador numérico.', 422);
        }
        $condiciones[] = 'usuario_id = ?';
        $parametros[] = (int) $usuario;
    }

    // Qué
    $accion = trim((string) ($_GET['accion'] ?? ''));
    if ($accion !== '') {
        if (!array_key_exists($accion, ACCIONES_AUDITADAS)) {
            json_error('El filtro "accion" no corresponde a ninguna acción registrada.', 422);
        }
        $condiciones[] = 'accion = ?';
        $parametros[] = $accion;
    }

    // Búsqueda libre
    $texto = trim((string) ($_GET['q'] ?? ''));
    if ($texto !== '') {
        $condiciones[] = '(usuario_nombre LIKE ? OR detalle LIKE ? OR entidad LIKE ?)';
        $comodin = '%' . $texto . '%';
        array_push($parametros, $comodin, $comodin, $comodin);
    }

    $where = $condiciones ? ' WHERE ' . implode(' AND ', $condiciones) : '';

    $stmt = db()->prepare(
        'SELECT id, fecha_hora AS fechaHora, usuario_id AS usuarioId,
                usuario_nombre AS usuarioNombre, usuario_rol AS usuarioRol,
                accion, entidad, entidad_id AS entidadId, detalle
           FROM auditoria' . $where . '
          ORDER BY fecha_hora DESC, id DESC
          LIMIT ' . AUDITORIA_LIMITE
    );
    $stmt->execute($parametros);

    $registros = array_map(static function (array $f): array {
        $f['usuarioId'] = $f['usuarioId'] === null ? null : (string) $f['usuarioId'];
        // Se separa fecha y hora para que la pantalla no tenga que parsear.
        $f['fecha'] = substr((string) $f['fechaHora'], 0, 10);
        $f['hora'] = substr((string) $f['fechaHora'], 11, 5);
        $f['descripcion'] = ACCIONES_AUDITADAS[$f['accion']] ?? $f['accion'];
        return cast_row($f);
    }, $stmt->fetchAll());

    // Total sin el tope, para poder avisar si la consulta quedó recortada.
    $stmtTotal = db()->prepare('SELECT COUNT(*) FROM auditoria' . $where);
    $stmtTotal->execute($parametros);
    $total = (int) $stmtTotal->fetchColumn();

    json_response([
        'registros' => $registros,
        'total'     => $total,
        'limite'    => AUDITORIA_LIMITE,
        'recortado' => $total > AUDITORIA_LIMITE,
        // Opciones para armar los desplegables de los filtros.
        'acciones'  => array_map(
            static fn(string $clave, string $desc): array => ['clave' => $clave, 'descripcion' => $desc],
            array_keys(ACCIONES_AUDITADAS),
            array_values(ACCIONES_AUDITADAS)
        ),
        'usuarios'  => db()->query(
            'SELECT DISTINCT usuario_id AS id, usuario_nombre AS nombre
               FROM auditoria
              WHERE usuario_id IS NOT NULL
              ORDER BY usuario_nombre'
        )->fetchAll(),
    ]);
}
