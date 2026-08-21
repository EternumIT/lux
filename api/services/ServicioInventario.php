<?php
/**
 * Inventario: equipos y componentes.
 *
 * El código con el que se nombra cada cosa (L1-SN-88213) no se pide en el
 * formulario: lo arma este servicio con Nomenclatura, para que todos sigan la
 * misma forma y se puedan buscar y mencionar en tickets y préstamos.
 */

declare(strict_types=1);

final class ServicioInventario
{
    public const ESTADOS_EQUIPO = ['operativo', 'reparacion', 'baja'];

    private RepositorioEquipos $equipos;
    private RepositorioComponentes $componentes;
    private Auditoria $auditoria;

    public function __construct(
        ?RepositorioEquipos $equipos = null,
        ?RepositorioComponentes $componentes = null,
        ?Auditoria $auditoria = null
    ) {
        $this->equipos     = $equipos ?? new RepositorioEquipos();
        $this->componentes = $componentes ?? new RepositorioComponentes();
        $this->auditoria   = $auditoria ?? new Auditoria();
    }

    /* ----------------------------- EQUIPOS ----------------------------- */

    /**
     * Cualquiera con sesión puede ver los equipos: el inicio muestra el estado
     * de las máquinas del laboratorio al que va a entrar un docente. Lo que sí
     * es del personal técnico es la pantalla de inventario completo, y eso lo
     * resuelve el frontend con la matriz de permisos.
     */
    public function listarEquipos(array $filtros): array
    {
        Sesion::requerir();

        if (($filtros['estado'] ?? '') !== '') {
            Validador::enumerado($filtros['estado'], self::ESTADOS_EQUIPO, 'estado');
        }

        return $this->equipos->listar($filtros);
    }

    public function crearEquipo(array $cuerpo): array
    {
        Sesion::requerirPersonal();

        $datos  = Validador::requeridos($cuerpo, ['tipo', 'ubicacion', 'marca', 'modelo', 'serie']);
        $estado = isset($cuerpo['estado'])
            ? Validador::enumerado($cuerpo['estado'], self::ESTADOS_EQUIPO, 'estado')
            : 'operativo';

        if ($this->equipos->existeSerie($datos['serie'])) {
            throw ErrorDeNegocio::conflicto(
                'Ya existe un equipo con el número de serie ' . $datos['serie'] . '.'
            );
        }

        $codigo = Nomenclatura::codigoInventario($datos['ubicacion'], $datos['serie']);

        if ($this->equipos->existeCodigo($codigo)) {
            throw ErrorDeNegocio::conflicto('Ya existe un equipo con el código ' . $codigo . '.');
        }

        $id = $this->equipos->crear([
            'codigo'     => $codigo,
            'tipo'       => $datos['tipo'],
            'ubicacion'  => $datos['ubicacion'],
            'marca'      => $datos['marca'],
            'modelo'     => $datos['modelo'],
            'serie'      => $datos['serie'],
            'partNumber' => Validador::opcional($cuerpo, 'partNumber'),
            'estado'     => $estado,
            'fallas'     => Validador::opcional($cuerpo, 'fallas'),
        ]);

        $equipo = $this->equipos->porId($id);

        $this->auditoria->registrar('equipo.crear', 'equipo', $codigo,
            $equipo['marca'] . ' ' . $equipo['modelo'] . ' · serie ' . $equipo['serie']);

        return $equipo;
    }

    /** Comprueba que el equipo exista; devuelve su id o null si no se indicó. */
    public function resolverEquipo(mixed $equipoId): ?int
    {
        if ($equipoId === null || $equipoId === '') {
            return null;
        }

        $id = (int) $equipoId;
        if (!$this->equipos->existe($id)) {
            throw ErrorDeNegocio::datosInvalidos('El equipo indicado no existe.');
        }

        return $id;
    }

    /* --------------------------- COMPONENTES --------------------------- */

    public function listarComponentes(array $filtros): array
    {
        Sesion::requerir();

        return $this->componentes->listar($filtros);
    }

    public function crearComponente(array $cuerpo): array
    {
        Sesion::requerirPersonal();

        $datos     = Validador::requeridos($cuerpo, ['nombre', 'modelo', 'fabricante']);
        $ubicacion = Validador::opcional($cuerpo, 'ubicacion') ?? 'Depósito';
        $serie     = Validador::opcional($cuerpo, 'serie');

        // Con serie el código ya se puede armar; sin ella hace falta el id, que
        // recién existe después de insertar, así que se completa en dos pasos.
        $codigo = $serie !== null
            ? Nomenclatura::codigoInventario($ubicacion, $serie)
            : 'TMP-' . uniqid();

        if ($serie !== null && $this->componentes->existeCodigo($codigo)) {
            throw ErrorDeNegocio::conflicto('Ya existe un componente con el código ' . $codigo . '.');
        }

        $id = $this->componentes->crear([
            'codigo'      => $codigo,
            'nombre'      => $datos['nombre'],
            'modelo'      => $datos['modelo'],
            'fabricante'  => $datos['fabricante'],
            'ubicacion'   => $ubicacion,
            'serie'       => $serie,
            'partNumber'  => Validador::opcional($cuerpo, 'partNumber'),
            'esFabrica'   => !empty($cuerpo['esFabrica']),
            'funcionando' => !empty($cuerpo['funcionando']),
        ]);

        if ($serie === null) {
            $codigo = Nomenclatura::codigoInventario(
                $ubicacion,
                null,
                'C' . str_pad((string) $id, 4, '0', STR_PAD_LEFT)
            );
            $this->componentes->cambiarCodigo($id, $codigo);
        }

        $componente = $this->componentes->porId($id);

        $this->auditoria->registrar('componente.crear', 'componente', $codigo,
            $componente['nombre'] . ' ' . $componente['modelo']);

        return $componente;
    }
}
