# Eternum — SGRSI

Sistema de Gestión de Recursos del ITI CETP.
Frontend con **Tailwind CSS** + JavaScript puro, backend en **PHP** sobre **MariaDB**.
Arranca entero con `npm run main`; también funciona con XAMPP si el equipo lo prefiere.

---

## Puesta en marcha

El proyecto arranca con **un solo comando**. No hace falta XAMPP: el lanzador
levanta su propia base de datos MariaDB y el servidor web.

### Requisitos

| Programa | Para qué | Comprobar |
|---|---|---|
| **Node.js 18+** | ejecuta el lanzador y compila los estilos | `node -v` |
| **PHP 8+** | corre la API | `php -v` |
| **extensión pdo_mysql** | el driver con el que PHP habla con MariaDB | `php -m` tiene que listar `pdo_mysql` |
| **extensión pdo_mysql** | el driver con el que PHP habla con MariaDB | `php -m` tiene que listar `pdo_mysql` |
| **MariaDB** | base de datos | `mariadbd --version` |

Instalación rápida en Windows:

```bash
winget install OpenJS.NodeJS
winget install PHP.PHP
winget install MariaDB.Server
```

> **Ojo con `pdo_mysql`:** el PHP que se instala por separado suele traerlo
> desactivado. Si `php -m` no lo lista, abrí tu `php.ini` (la ruta sale con
> `php --ini`), buscá la línea `;extension=pdo_mysql` y quitale el `;` del
> principio. Sin eso todo arranca bien, pero el sitio muestra
> «No se pudo conectar con la base de datos».
>
> `npm run main` lo comprueba al arrancar y avisa antes de que llegues ahí.

> **Ojo con `pdo_mysql`:** el PHP que se instala por separado suele traerlo
> desactivado. Si `php -m` no lo lista, abrí tu `php.ini` (la ruta sale con
> `php --ini`), buscá la línea `;extension=pdo_mysql` y quitale el `;` del
> principio. Sin eso todo arranca bien, pero el sitio muestra
> «No se pudo conectar con la base de datos».
>
> `npm run main` lo comprueba al arrancar y avisa antes de que llegues ahí.

> Si preferís seguir usando XAMPP, no instales nada de eso: mirá
> [Usar XAMPP en vez de MariaDB](#usar-xampp-en-vez-de-mariadb).

### Arrancar

```bash
npm install     # solo la primera vez
npm run main
```

Eso hace todo de una:

1. Compila los estilos de Tailwind.
2. Levanta MariaDB sobre `database/datos/` (se crea sola la primera vez).
3. Crea la base `eternum` e importa `database/schema.sql` si aún no existe.
4. Arranca el servidor web y abre el navegador.

```
SGRSI / Eternum
  modo: mariadb  (base de datos propia del proyecto)

› Compilando estilos ...
✓ estilos compilados
✓ MariaDB escuchando en 127.0.0.1:3307
✓ base "eternum" creada con datos de ejemplo
✓ servidor web escuchando en http://127.0.0.1:8080

┌───────────────────────────────────┐
│ Sistema listo                     │
│                                   │
│ Sitio:   http://127.0.0.1:8080/   │
│ Base:    127.0.0.1:3307 · eternum │
│ Usuario: 12345678 · admin123      │
│                                   │
│ Ctrl+C para detener todo          │
└───────────────────────────────────┘
```

Con **Ctrl+C** se cierran el servidor web y la base de datos de forma ordenada.

### Usuarios de prueba

| Cédula | Contraseña | Usuario | Rol |
|---|---|---|---|
| `00000000` | `root2026` | Root del sistema | Root |
| `12345678` | `admin123` | Marcela Rodríguez | Administrador |
| `87654321` | `tecnico123` | Julián Pérez | Técnico |
| `11223344` | `docente123` | Ana Gómez | Docente |

Las contraseñas se guardan con `password_hash()` de PHP (bcrypt); nunca en texto plano.

---

## Configuración del lanzador

Todo se controla desde **`eternum.config.json`**, en la raíz del proyecto.

### La opción principal: `modo`

| Valor | Qué hace |
|---|---|
| `"mariadb"` | El comando **levanta su propia base de datos**. No hace falta XAMPP. Los datos viven en `database/datos/`, aislados del resto del equipo. |
| `"xampp"` | Usa el **MySQL que ya corre en XAMPP**. El comando no lo administra: solo comprueba que esté encendido. |

### Todos los campos

| Campo | Para qué |
|---|---|
| `modo` | `"mariadb"` o `"xampp"` |
| `servidor.puerto` | Puerto del sitio web (por defecto 8080) |
| `servidor.host` | Interfaz donde escucha (por defecto 127.0.0.1) |
| `servidor.abrirNavegador` | Si abre el navegador solo al terminar |
| `baseDatos.nombre` | Nombre de la base |
| `baseDatos.importarSiFalta` | Importa `schema.sql` si la base está vacía |
| `mariadb.rutaBin` | Ruta al `bin/` de MariaDB. Vacío = autodetectar |
| `mariadb.carpetaDatos` | Dónde guarda los datos la instancia del proyecto |
| `mariadb.puerto` | 3307 por defecto, para no chocar con el 3306 de XAMPP |
| `mariadb.usuario` / `mariadb.password` | Credenciales de esa instancia |
| `xampp.raiz` | Dónde está instalado XAMPP |
| `xampp.puerto` | Puerto de su MySQL (3306) |
| `xampp.usuario` / `xampp.password` | Credenciales de XAMPP |
| `xampp.iniciarServicios` | Si el comando puede encender MySQL solo |
| `php.ruta` | Ruta a `php.exe`. Vacío = autodetectar |
| `tailwind.compilarAlIniciar` | Compila los estilos antes de arrancar |

### Ajustes personales

Para cambiar algo **solo en tu máquina** sin tocar el archivo del grupo (ni
generar conflictos en git), creá **`eternum.config.local.json`** con lo que
quieras cambiar:

```json
{
  "modo": "xampp",
  "servidor": { "puerto": 8090 }
}
```

Ese archivo pisa campo por campo al compartido y **no se sube al repositorio**.

### Opciones por línea de comandos

Pisan la configuración para esa ejecución puntual:

```bash
npm run main -- --modo=xampp
npm run main -- --puerto=8090
npm run main -- --sin-navegador
npm run main -- --ayuda
```

También hay atajos:

```bash
npm run main:mariadb    # fuerza base propia
npm run main:xampp      # fuerza XAMPP
```

---

## Usar XAMPP en vez de MariaDB

1. Poné `"modo": "xampp"` en `eternum.config.json` (o usá `npm run main:xampp`).
2. Abrí el Panel de Control de XAMPP y dale **Start** a **MySQL**.
3. `npm run main`

Si querés que el comando encienda MySQL solo, poné `"iniciarServicios": true`
dentro de `"xampp"`.

> **Nota:** en modo XAMPP el comando **nunca apaga** MySQL al salir, porque no
> es suyo. Lo seguís administrando desde el panel.

### Servir desde el Apache de XAMPP (sin `npm run main`)

También sigue funcionando la forma clásica: copiar el proyecto a la carpeta
`htdocs` de XAMPP, iniciar Apache y MySQL, importar `database/schema.sql` desde
phpMyAdmin y entrar a <http://localhost/eternum/>. En ese caso `api/config.php`
usa sus valores por defecto (`root` sin contraseña en el puerto 3306).

---

## Roles y sección administrativa

El sistema tiene cuatro roles. **Root** y **Administrador** entran a la sección
administrativa desde el **menú del usuario**, arriba a la derecha, igual que al
perfil. No está en el menú lateral: es una zona aparte, no un módulo más del
trabajo diario.

Tiene cuatro pantallas, con pestañas propias:

- **Resumen** — estado de las cuentas y los últimos movimientos del sistema.
- **Usuarios** — alta de cuentas, edición de datos y rol, cambio de contraseña,
  y bloqueo/desbloqueo.
- **Permisos** — la matriz de qué puede hacer cada rol.
- **Auditoría** — el registro de quién hizo qué y cuándo.

### Qué puede cada rol

| Rol | Alcance |
|---|---|
| **Root** | Control total. El único que puede crear o modificar cuentas Root y Administrador. |
| **Administrador** | Gestiona el sistema y las cuentas Técnico y Docente. |
| **Técnico** | Opera el día a día: inventario, tickets y préstamos. |
| **Docente** | Consulta información y crea tickets o solicitudes. |

La matriz completa está en la pantalla *Permisos*, y se genera a partir de
`api/permisos.php`, que es la misma definición que usa el servidor para
autorizar. Así la tabla que se ve nunca queda desfasada de lo que el sistema
realmente permite.

### Bloquear en vez de borrar

Un usuario bloqueado no puede iniciar sesión, pero **sigue existiendo**. Se
prefiere así porque los tickets y préstamos guardan el nombre de quien los pidió:
borrar la cuenta dejaría ese historial sin dueño.

### Salvaguardas

El servidor rechaza estas operaciones aunque se pidan a mano por la API:

- Un Administrador no puede crear, editar ni bloquear cuentas Root o Administrador.
- Nadie puede bloquearse a sí mismo ni cambiarse el propio rol.
- No se puede bloquear al último usuario Root activo.

### Registro de auditoría

Cada operación relevante deja una línea con **cuándo, quién y qué**. Se escribe
sola desde el servidor: no hay forma de crear, editar ni borrar registros desde
la aplicación.

Qué se registra:

| Grupo | Acciones |
|---|---|
| Sesiones | inicio, cierre e **intentos fallidos** |
| Usuarios | alta, edición, bloqueo y desbloqueo |
| Inventario | alta de equipos y componentes |
| Tickets | alta y cambios de estado |
| Préstamos | alta y cambios de estado |
| Solicitudes | alta |

**Filtros disponibles**, combinables entre sí:

| Filtro | Para qué |
|---|---|
| Fecha desde / hasta | Acotar a un día o a un rango |
| Hora desde / hasta | Una franja horaria, aplicada a **cada día** del rango — por ejemplo, para revisar todo lo que pasó fuera del horario de clase durante una semana |
| Quién | Un usuario concreto |
| Qué | Un tipo de acción |
| Buscar en el detalle | Texto libre sobre el nombre, la entidad y el detalle |

El filtrado ocurre en el servidor, no en el navegador: el registro puede crecer
mucho y no tendría sentido traerlo entero. Se devuelven como máximo 500 líneas
por consulta, las más recientes, y la pantalla avisa si el resultado quedó
recortado. También se puede exportar lo que esté a la vista a CSV.

Dos decisiones que vale la pena conocer:

- **Se guarda una copia del nombre y el rol** de quien hizo cada cosa, además
  del id. Si más adelante se borra ese usuario, el registro sigue diciendo quién
  fue en lugar de quedar huérfano.
- **La auditoría nunca hace fallar la operación que la originó.** Si por lo que
  sea no se puede escribir la línea, queda la queja en el log del servidor y la
  operación del usuario sigue adelante. Es preferible perder un renglón de
  auditoría antes que tumbar un alta que ya se guardó.

### Cómo se controla el acceso

El control está **en el servidor** (`api/sesion.php`). Al iniciar sesión se crea
una sesión de PHP y cada endpoint sensible vuelve a comprobar el rol contra la
base de datos, en cada petición.

Ocultar el menú en el navegador es solo comodidad visual. Si alguien edita el
`localStorage` y entra a `/pages/admin/usuarios.html` a mano, la API le responde
`403` y la pantalla queda vacía; además `js/app.js` lo devuelve al panel.

Como el rol se relee de la base en cada petición, si a alguien le cambian el rol
o lo bloquean mientras tiene la sesión abierta, el cambio surte efecto de
inmediato, sin esperar a que vuelva a entrar.

> **Nota sobre el alcance actual:** los endpoints de inventario, tickets,
> préstamos y solicitudes todavía responden sin sesión iniciada. Las pantallas sí
> exigen login, pero la API de esos módulos queda abierta. Si el grupo quiere
> cerrarla, alcanza con agregar `requerir_autenticacion();` al principio de cada
> controlador.

---

## Trabajar con los estilos (Tailwind)

Los estilos se escriben en `assets/css/input.css` y se **compilan** a
`assets/css/app.css`, que es el archivo que enlazan las páginas.

```bash
npm install        # solo la primera vez

npm run css        # compila una vez (versión minificada)
npm run css:watch  # recompila automáticamente al guardar
```

> `npm run main` ya compila los estilos al arrancar, así que estos comandos solo
> hacen falta si estás editando CSS y querés recompilar sin reiniciar todo
> (`css:watch`). `app.css` está versionado, así que el sitio se puede servir
> desde XAMPP sin tener Node instalado.

### Cómo está organizado el CSS

- **Tokens de diseño** (`@theme`): colores semánticos como `--color-superficie`,
  `--color-texto`, `--color-primario`. Al redefinirlos dentro de
  `[data-theme="dark"]`, **todas** las utilidades (`bg-superficie`, `text-tenue`…)
  cambian solas en modo oscuro, sin escribir variantes `dark:` por todos lados.
- **Componentes** (`@layer components`): las piezas que se repiten en las 10
  vistas y que además genera el JavaScript (`.nav-link`, `.tarjeta`, `.insignia`,
  `.item-lista`, `.btn-primario`, `.modal`…), definidas con `@apply`.
- **Utilidades sueltas**: el resto del maquetado va directo en el HTML.

### Iconos

Los iconos son de **Clarity** (VMware Clarity Design System, licencia MIT), la
misma colección que svgrepo publica como *Clarity Project Icons*. Van embebidos
como SVG en el HTML: no se descarga ninguna fuente de iconos ni librería.

Se pintan con `fill="currentColor"`, así que toman el color del texto que los
rodea. Como ese color siempre sale de una variable del tema (`--color-tenue`,
`--color-primario`…), **los iconos cambian solos** al pasar a modo oscuro o a
alto contraste, sin que intervenga ningún JavaScript.

Dos casos usan dos iconos a la vez, y el CSS decide cuál se ve:

| Dónde | Cómo cambia |
|---|---|
| Menú lateral | Variante de línea normalmente; **rellena** en la sección activa (`.nav-link.activo`) |
| Botón de tema | Luna en modo claro, sol en modo oscuro, según `data-theme` en `<html>` |
| Ver contraseña | Ojo abierto o tachado, según la clase que pone `js/pages/login.js` |

El botón de tema es puro CSS: mira el mismo atributo que cambia el resto de los
colores, así que el icono se actualiza en el mismo instante que el modo.

Si hace falta cambiar o agregar iconos, se extraen del paquete oficial:

```bash
npm install @cds/core
# los SVG están en node_modules/@cds/core/icon/shapes/<nombre>.js
# cada archivo trae las variantes "outline" y "solid", en viewBox 0 0 36 36
```

### Accesibilidad

Cuatro preferencias, guardadas en `localStorage` y aplicadas como atributos del `<html>`.
El **Perfil** se abre desde el menú del usuario, arriba a la derecha (ya no está
en el menú lateral, donde duplicaba ese acceso):

| Atributo          | Valores                          | Control            |
|-------------------|----------------------------------|--------------------|
| `data-theme`      | `light` / `dark`                 | 🌙 en la barra superior |
| `data-font-size`  | `small` / `medium` / `large` / `xl` | Botones **A A A**  |
| `data-contrast`   | `normal` / `high`                | Perfil → Accesibilidad (interruptor) |
| `data-dyslexic`   | `true` / `false`                 | Perfil → Accesibilidad (interruptor) |

#### Por qué el tema claro necesita más separación que el oscuro

Cerca del blanco el ojo distingue mucho peor las diferencias de luminancia que
cerca del negro. Por eso el tema claro no puede usar la misma separación que el
oscuro: necesita bastante más para verse igual de definido.

| | Fondo vs tarjeta | Borde vs tarjeta |
|---|---|---|
| Modo oscuro | 1.10:1 | 1.34:1 |
| Modo claro | **1.32:1** | **1.64:1** |

A eso se suma la **sombra de reposo** (`--sombra-superficie`): en un tema claro
la profundidad la dan las sombras, mientras que en el oscuro la da el contraste
entre superficies. Por eso esa variable vale `none` en modo oscuro, donde una
sombra sobre fondo casi negro no se vería y solo ensuciaría los bordes.

Todos los tonos de texto se recalcularon para seguir cumpliendo **AA (4.5:1)**
sobre las dos superficies, no solo sobre el blanco de las tarjetas.

En **alto contraste sobre tema claro** el fondo de página se deja igual que en el
modo claro normal. Las tarjetas son blancas: si el fondo también lo fuera, la
única separación entre ambos sería el borde, y se perdería la estructura de la
pantalla justo en el modo pensado para verla mejor.

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
│   ├── sesion.php           # Sesión y control de acceso por rol
│   ├── permisos.php         # Matriz de permisos (fuente de verdad)
│   ├── auditoria.php        # Registro de quién hizo qué (función auditar)
│   └── controllers/         # Un archivo por recurso
│       ├── auth.php
│       ├── equipos.php
│       ├── componentes.php
│       ├── tickets.php
│       ├── prestamos.php
│       ├── solicitudes.php
│       ├── usuarios.php
│       ├── auditoria.php
│       └── dashboard.php
│
├── assets/
│   ├── css/
│   │   ├── input.css        # FUENTE: acá se edita
│   │   └── app.css          # GENERADO: no editar a mano
│   └── img/
│
├── database/
│   ├── schema.sql           # Esquema + datos de ejemplo (MariaDB)
│   ├── actualizaciones.sql  # Cambios de esquema, se aplican en cada arranque
│   └── datos/               # GENERADO: base local de 'npm run main' (no se sube)
│
├── js/
│   ├── app.js               # Arranque común de las vistas internas
│   ├── components/
│   │   ├── components.js    # Preferencias, sidebar, modales, avisos
│   │   ├── iconos.js        # Iconos de Clarity que usa el JavaScript
│   │   └── charts.js        # Gráficas sin librerías externas
│   ├── services/
│   │   ├── services.js      # Único punto de contacto con la API
│   │   └── mock-data.js     # Datos de ejemplo (modo sin servidor)
│   ├── utils/utils.js       # Helpers de DOM, formato y validación
│   └── pages/               # Un script por vista
│
├── scripts/                 # Lanzador de 'npm run main'
│   ├── main.js              # Orquesta base de datos + web
│   └── lib/
│       ├── config.js        # Carga y valida la configuracion
│       ├── basedatos.js     # Arranca MariaDB o comprueba XAMPP
│       ├── web.js           # Servidor PHP y compilacion de estilos
│       └── consola.js       # Salida con colores
│
├── pages/                   # Las 10 vistas HTML
├── index.html               # Redirige al login
├── eternum.config.json      # Configuracion del lanzador
└── package.json             # Scripts de npm
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
| `GET`   | `/auth/sesion`      | Quién está autenticado ahora mismo             |
| `POST`  | `/auth/logout`      | Cierra la sesión                               |
| `GET`   | `/usuarios`         | Lista los usuarios *(Root / Administrador)*    |
| `POST`  | `/usuarios`         | Crea un usuario *(Root / Administrador)*       |
| `PATCH` | `/usuarios/{id}`    | Edita datos, rol o contraseña *(Root / Admin)* |
| `PATCH` | `/usuarios/{id}/bloqueo` | Bloquea o desbloquea *(Root / Admin)*     |
| `GET`   | `/permisos`         | Matriz de permisos *(Root / Administrador)*    |
| `GET`   | `/auditoria`        | Registro de auditoría, con filtros *(Root / Admin)* |

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

Con `npm run main`, se editan en `eternum.config.json` dentro de la sección del
modo que uses (`mariadb` o `xampp`); el lanzador se las pasa a PHP solo.

```json
"xampp": { "usuario": "root", "password": "tu_contraseña" }
```

Si en cambio servís el sitio con el Apache de XAMPP, editá `api/config.php`.

### Modo sin servidor (datos de ejemplo)

Para trabajar el frontend sin XAMPP, en `js/services/services.js`:

```js
var USE_MOCK = true;   // usa datos de ejemplo en localStorage
```

Las vistas no cambian: toda la diferencia queda dentro de la capa de servicios.

---

## Diagnóstico

Si algo no arranca, este comando revisa el entorno entero y dice qué falta:

```bash
npm run doctor
```

Comprueba la versión de Node, que PHP exista y tenga `pdo_mysql`, que MariaDB o
XAMPP estén donde corresponde, si los puertos están libres u ocupados, si la
base acepta la conexión y si el esquema está importado.

```
Diagnostico del entorno
  modo: mariadb

✓ Node.js 25.8.1
✓ PHP encontrado  E:\php\php.exe
✓ extension pdo_mysql activa
✓ MariaDB encontrado  C:\Program Files\MariaDB 12.3\bin
✓ carpeta de datos inicializada
✓ estilos compilados  42 KB

✓ hay una base escuchando en 127.0.0.1:3307
✓ conexion aceptada como usuario "root"
✓ base "eternum" con 6 tablas

Todo en orden.  Arranca con:  npm run main
```

Si algo falla, en vez del tilde muestra el problema y los pasos para arreglarlo.

---

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| «No se pudo conectar con la base de datos» y `php -m` no lista `pdo_mysql` | Falta activar la extensión: quitale el `;` a `;extension=pdo_mysql` en tu `php.ini` |
| «No se pudo conectar con la base de datos» y `php -m` no lista `pdo_mysql` | Falta activar la extensión: quitale el `;` a `;extension=pdo_mysql` en tu `php.ini` |
| «No se encontro MariaDB en este equipo» | Falta instalarlo (`winget install MariaDB.Server`), o indicá `mariadb.rutaBin` en la configuración |
| «No se encontro PHP en este equipo» | Falta instalar PHP, o indicá `php.ruta` en la configuración |
| «El puerto 8080 ya esta ocupado» | Otro programa lo usa: cambiá `servidor.puerto` |
| «el MySQL de XAMPP parece apagado» | Dale Start a MySQL en el panel, o poné `xampp.iniciarServicios` en `true` |
| Las listas quedan vacías y aparece un aviso rojo | La base se cayó: revisá la consola donde corriste `npm run main` |
| «El servidor no devolvió JSON» | Estás abriendo el HTML como `file://` en vez de por `http://` |
| «Tu cuenta está bloqueada» al entrar | Un administrador la bloqueó: pedile que la desbloquee desde *Administración → Usuarios* |
| Login siempre falla | La base quedó sin datos: borrá `database/datos/` y volvé a ejecutar `npm run main` |
| Los estilos se ven rotos | Ejecutá `npm run css` |

---

## Empezar de cero

Para reiniciar la base local con los datos de ejemplo originales:

```bash
# 1. Detener npm run main (Ctrl+C)
# 2. Borrar la carpeta de datos
rm -rf database/datos      # en PowerShell:  Remove-Item -Recurse -Force database\datos
# 3. Volver a arrancar: se recrea e importa el schema sola
npm run main
```
