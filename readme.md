# Eternum — SGRSI

Sistema de Gestión de Recursos del ITI CETP.
Frontend con **Tailwind CSS** + JavaScript puro, backend en **PHP** sobre **MariaDB** (XAMPP).

---

## Puesta en marcha con XAMPP

### 1. Copiar el proyecto

Copiá la carpeta del proyecto dentro de `htdocs` de XAMPP:

```
C:\xampp\htdocs\eternum\
```

### 2. Iniciar los servicios

Abrí el **Panel de Control de XAMPP** y arrancá:

- **Apache**
- **MySQL** (en XAMPP este servicio es MariaDB)

### 3. Crear la base de datos

Opción A — **phpMyAdmin** (recomendado):

1. Entrá a <http://localhost/phpmyadmin>
2. Pestaña **Importar**
3. Elegí el archivo `database/schema.sql`
4. Clic en **Continuar**

Opción B — **consola**:

```bash
C:\xampp\mysql\bin\mysql -u root < database\schema.sql
```

El script crea la base `eternum`, sus 6 tablas y carga datos de ejemplo.
Se puede volver a ejecutar en cualquier momento para reiniciar todo desde cero.

### 4. Entrar al sistema

<http://localhost/eternum/>

> **Importante:** hay que entrar por `http://localhost/...`, no abriendo los
> archivos HTML con doble clic. Abiertos como `file://` el navegador no puede
> llamar a la API y las páginas quedan vacías.

### Usuarios de prueba

| Cédula     | Contraseña   | Usuario            | Rol           |
|------------|--------------|--------------------|---------------|
| `12345678` | `admin123`   | Marcela Rodríguez  | Administrador |
| `87654321` | `tecnico123` | Julián Pérez       | Técnico       |
| `11223344` | `docente123` | Ana Gómez          | Docente       |

Las contraseñas se guardan con `password_hash()` de PHP (bcrypt); nunca en texto plano.

---

## Trabajar con los estilos (Tailwind)

Los estilos se escriben en `assets/css/input.css` y se **compilan** a
`assets/css/app.css`, que es el archivo que enlazan las páginas.

```bash
npm install        # solo la primera vez

npm run css        # compila una vez (versión minificada)
npm run css:watch  # recompila automáticamente al guardar
```

> Si tocás `input.css` o agregás clases nuevas en el HTML/JS, hay que volver a
> compilar. `app.css` está versionado, así que el sistema funciona en XAMPP sin
> necesidad de tener Node instalado.

### Cómo está organizado el CSS

- **Tokens de diseño** (`@theme`): colores semánticos como `--color-superficie`,
  `--color-texto`, `--color-primario`. Al redefinirlos dentro de
  `[data-theme="dark"]`, **todas** las utilidades (`bg-superficie`, `text-tenue`…)
  cambian solas en modo oscuro, sin escribir variantes `dark:` por todos lados.
- **Componentes** (`@layer components`): las piezas que se repiten en las 10
  vistas y que además genera el JavaScript (`.nav-link`, `.tarjeta`, `.insignia`,
  `.item-lista`, `.btn-primario`, `.modal`…), definidas con `@apply`.
- **Utilidades sueltas**: el resto del maquetado va directo en el HTML.

### Accesibilidad

Cuatro preferencias, guardadas en `localStorage` y aplicadas como atributos del `<html>`:

| Atributo          | Valores                          | Control            |
|-------------------|----------------------------------|--------------------|
| `data-theme`      | `light` / `dark`                 | 🌙 en la barra superior |
| `data-font-size`  | `small` / `medium` / `large` / `xl` | Botones **A A A**  |
| `data-contrast`   | `normal` / `high`                | Perfil → Accesibilidad |
| `data-dyslexic`   | `true` / `false`                 | Perfil → Accesibilidad |

---

## Estructura de carpetas

```
eternum/
├── api/                     # Backend PHP (la API REST)
│   ├── .htaccess            # URLs limpias (opcional)
│   ├── config.php           # Credenciales de la base de datos
│   ├── db.php               # Conexión PDO
│   ├── helpers.php          # Respuestas JSON y validaciones
│   ├── index.php            # Router: asocia rutas con controladores
│   └── controllers/         # Un archivo por recurso
│       ├── auth.php
│       ├── equipos.php
│       ├── componentes.php
│       ├── tickets.php
│       ├── prestamos.php
│       ├── solicitudes.php
│       └── dashboard.php
│
├── assets/
│   ├── css/
│   │   ├── input.css        # FUENTE: acá se edita
│   │   └── app.css          # GENERADO: no editar a mano
│   └── img/
│
├── database/
│   └── schema.sql           # Esquema + datos de ejemplo (MariaDB)
│
├── js/
│   ├── app.js               # Arranque común de las vistas internas
│   ├── components/
│   │   ├── components.js    # Preferencias, sidebar, modales, avisos
│   │   └── charts.js        # Gráficas sin librerías externas
│   ├── services/
│   │   ├── services.js      # Único punto de contacto con la API
│   │   └── mock-data.js     # Datos de ejemplo (modo sin servidor)
│   ├── utils/utils.js       # Helpers de DOM, formato y validación
│   └── pages/               # Un script por vista
│
├── pages/                   # Las 10 vistas HTML
├── index.html               # Redirige al login
└── package.json             # Scripts de compilación de Tailwind
```

---

## La API

Todas las rutas cuelgan de `/api`. El frontend las llama como
`/api/index.php?_ruta=<ruta>`, de modo que funciona con o sin `mod_rewrite`.

| Método  | Ruta                | Qué hace                                      |
|---------|---------------------|-----------------------------------------------|
| `POST`  | `/auth/login`       | Valida cédula + contraseña                     |
| `GET`   | `/equipos`          | Lista los equipos                              |
| `POST`  | `/equipos`          | Registra un equipo                             |
| `GET`   | `/componentes`      | Lista los componentes                          |
| `POST`  | `/componentes`      | Registra un componente                         |
| `GET`   | `/tickets`          | Lista los tickets                              |
| `POST`  | `/tickets`          | Crea un ticket                                 |
| `PATCH` | `/tickets/{id}`     | Cambia el estado de un ticket                  |
| `GET`   | `/prestamos`        | Lista los préstamos                            |
| `POST`  | `/prestamos`        | Registra un préstamo                           |
| `PATCH` | `/prestamos/{id}`   | Cambia el estado (por ejemplo, a devuelto)     |
| `GET`   | `/solicitudes`      | Lista las solicitudes                          |
| `POST`  | `/solicitudes`      | Crea una solicitud                             |
| `GET`   | `/dashboard`        | Métricas agregadas del panel principal         |

Detalles de implementación:

- Todas las consultas usan **sentencias preparadas** (PDO), así que no hay
  inyección SQL.
- Los errores devuelven `{ "error": "mensaje" }` con el código HTTP adecuado
  (`401` credenciales, `404` no encontrado, `409` duplicado, `422` datos inválidos).
- Los préstamos activos cuya fecha límite ya pasó se marcan como **vencidos**
  automáticamente al consultarlos.
- El resumen del dashboard se calcula con `COUNT` en la base, no trayendo todas
  las filas al navegador.

### Cambiar las credenciales de la base

Por defecto usa los valores de XAMPP recién instalado (`root`, sin contraseña).
Si le pusiste contraseña a MariaDB, editá `api/config.php`:

```php
'user'     => 'root',
'password' => 'tu_contraseña',
```

### Modo sin servidor (datos de ejemplo)

Para trabajar el frontend sin XAMPP, en `js/services/services.js`:

```js
var USE_MOCK = true;   // usa datos de ejemplo en localStorage
```

Las vistas no cambian: toda la diferencia queda dentro de la capa de servicios.

---

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Las listas quedan vacías y aparece un aviso rojo | MySQL/MariaDB no está iniciado en XAMPP |
| «El servidor no devolvió JSON» | Estás abriendo el HTML como `file://` en vez de `http://localhost/...` |
| «No se pudo conectar con la base de datos» | Falta importar `database/schema.sql`, o la contraseña de `api/config.php` no coincide |
| Los estilos se ven rotos | Falta compilar: `npm run css` |
| Login siempre falla | La base se importó sin los datos de ejemplo; volvé a importar `schema.sql` |
