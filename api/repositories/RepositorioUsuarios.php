<?php
/**
 * Acceso a la tabla de usuarios.
 */

declare(strict_types=1);

final class RepositorioUsuarios extends Repositorio
{
    /** Columnas públicas: nunca incluyen el hash de la contraseña. */
    private const CAMPOS = 'id, cedula, nombre, email, rol, iniciales, bloqueado, creado';

    public function listar(): array
    {
        // Se ordena por jerarquia y despues por nombre: la pantalla de
        // administracion se lee mejor con los roles agrupados.
        $filas = $this->consultar(
            'SELECT ' . self::CAMPOS . " FROM usuarios
              ORDER BY FIELD(rol, 'Root', 'Administrador', 'Tecnico', 'Docente'), nombre"
        )->fetchAll();

        return $this->normalizarLista($filas, [], ['bloqueado']);
    }

    /**
     * Nombres para elegir a quién sumar a un ticket o una solicitud.
     *
     * Incluye la cédula porque es lo que hace inconfundible a una persona
     * cuando hay dos que se llaman parecido, y es por lo que se busca en el
     * formulario. No incluye el correo ni el estado de la cuenta, que son
     * datos de la sección administrativa.
     *
     * @param string[]|null $roles Limita el listado a esos roles.
     */
    public function directorio(?array $roles = null): array
    {
        $sql = 'SELECT id, cedula, nombre, rol, iniciales
                  FROM usuarios
                 WHERE bloqueado = 0';
        $parametros = [];

        if ($roles !== null) {
            $sql .= ' AND rol IN (' . implode(',', array_fill(0, count($roles), '?')) . ')';
            $parametros = $roles;
        }

        $filas = $this->consultar($sql . ' ORDER BY nombre', $parametros)->fetchAll();

        return $this->normalizarLista($filas);
    }

    public function porId(int $id): ?array
    {
        $fila = $this->unaFila(
            'SELECT ' . self::CAMPOS . ' FROM usuarios WHERE id = ? LIMIT 1',
            [$id]
        );

        return $fila === null ? null : $this->normalizar($fila, [], ['bloqueado']);
    }

    /** Igual que porId, pero con el hash: solo para verificar contraseñas. */
    public function porCedulaConHash(string $cedula): ?array
    {
        return $this->unaFila(
            'SELECT ' . self::CAMPOS . ', password_hash
               FROM usuarios WHERE cedula = ? LIMIT 1',
            [$cedula]
        );
    }

    public function hashPorId(int $id): ?string
    {
        $hash = $this->unValor('SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1', [$id]);

        return $hash === false ? null : (string) $hash;
    }

    public function nombrePorId(int $id): ?string
    {
        $nombre = $this->unValor('SELECT nombre FROM usuarios WHERE id = ? LIMIT 1', [$id]);

        return $nombre === false ? null : (string) $nombre;
    }

    public function existe(int $id): bool
    {
        return (bool) $this->unValor('SELECT 1 FROM usuarios WHERE id = ? LIMIT 1', [$id]);
    }

    /** ¿Ya hay alguien con esa cédula o ese correo? Devuelve cuál de los dos. */
    public function campoDuplicado(string $cedula, string $email, ?int $exceptoId = null): ?string
    {
        $sql = 'SELECT cedula, email FROM usuarios WHERE (cedula = ? OR email = ?)';
        $parametros = [$cedula, $email];

        if ($exceptoId !== null) {
            $sql .= ' AND id <> ?';
            $parametros[] = $exceptoId;
        }

        $fila = $this->unaFila($sql . ' LIMIT 1', $parametros);
        if ($fila === null) {
            return null;
        }

        return $fila['cedula'] === $cedula ? 'cedula' : 'email';
    }

    public function crear(array $datos): int
    {
        $this->consultar(
            'INSERT INTO usuarios (cedula, nombre, email, rol, password_hash, iniciales)
             VALUES (?, ?, ?, ?, ?, ?)',
            [
                $datos['cedula'],
                $datos['nombre'],
                $datos['email'],
                $datos['rol'],
                $datos['password_hash'],
                $datos['iniciales'],
            ]
        );

        return $this->ultimoId();
    }

    /**
     * Actualiza solo los campos recibidos.
     * Las claves llegan ya validadas por la capa de negocio; acá se arma el
     * SET dinámico con marcadores, nunca concatenando valores.
     */
    public function actualizar(int $id, array $campos): void
    {
        if (!$campos) {
            return;
        }

        $asignaciones = [];
        $valores      = [];
        foreach ($campos as $columna => $valor) {
            $asignaciones[] = $columna . ' = ?';
            $valores[]      = $valor;
        }
        $valores[] = $id;

        $this->consultar(
            'UPDATE usuarios SET ' . implode(', ', $asignaciones) . ' WHERE id = ?',
            $valores
        );
    }

    public function cambiarPassword(int $id, string $hash): void
    {
        $this->consultar('UPDATE usuarios SET password_hash = ? WHERE id = ?', [$hash, $id]);
    }

    public function cambiarBloqueo(int $id, bool $bloqueado): void
    {
        $this->consultar('UPDATE usuarios SET bloqueado = ? WHERE id = ?', [$bloqueado ? 1 : 0, $id]);
    }

}
