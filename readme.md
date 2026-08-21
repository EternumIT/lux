# Eternum — SGRSI

Sistema de Gestión de Recursos del ITI CETP.
Frontend con **Tailwind CSS** + JavaScript puro, backend en **PHP** sobre **MariaDB**.
Arranca entero con `npm run main`: base de datos y servidor web incluidos.

---

## Puesta en marcha

El proyecto arranca con **un solo comando**: el lanzador
levanta su propia base de datos MariaDB y el servidor web.

### Requisitos

| Programa | Para qué | Comprobar |
|---|---|---|
| **Node.js 18+** | ejecuta el lanzador y compila los estilos | `node -v` |
| **PHP 8+** | corre la API | `php -v` |
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

### Todos los campos

| Campo | Para qué |
|---|---|
| `servidor.puerto` | Puerto del sitio web (por defecto 8080) |
| `servidor.host` | Interfaz donde escucha (por defecto 127.0.0.1) |
| `servidor.abrirNavegador` | Si abre el navegador solo al terminar |
| `baseDatos.nombre` | Nombre de la base |
| `baseDatos.importarSiFalta` | Importa `schema.sql` si la base está vacía |
| `mariadb.rutaBin` | Ruta al `bin/` de MariaDB. Vacío = autodetectar |
| `mariadb.carpetaDatos` | Dónde guarda los datos la instancia del proyecto |
| `mariadb.puerto` | 3307 por defecto, para no chocar con cualquier MySQL que ya tengas en el 3306 |
| `mariadb.usuario` / `mariadb.password` | Credenciales de esa instancia |
| `php.ruta` | Ruta a `php.exe`. Vacío = autodetectar |
| `tailwind.compilarAlIniciar` | Compila los estilos antes de arrancar |

### Ajustes personales

Para cambiar algo **solo en tu máquina** sin tocar el archivo del grupo (ni
generar conflictos en git), creá **`eternum.config.local.json`** con lo que
quieras cambiar:

```json
{
  "servidor": { "puerto": 8090 },
  "mariadb": { "puerto": 3311 }
}
```

Ese archivo pisa campo por campo al compartido y **no se sube al repositorio**.

### Opciones por línea de comandos

Pisan la configuración para esa ejecución puntual:

```bash
npm run main -- --puerto=8090
npm run main -- --sin-navegador
npm run main -- --ayuda
```

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
| **Técnico** | Opera el día a día: inventario, tickets, solicitudes y préstamos. |
| **Docente** | Ve el estado de los equipos, abre tickets y solicitudes, y sigue únicamente los suyos. |

El menú lateral **no es el mismo para todos**: el Docente ve solo *Inicio*,
*Tickets* y *Solicitudes*. Inventario, Estado de Equipos y Préstamos son del
personal técnico, y quien no tiene permiso tampoco entra escribiendo la
dirección a mano (lo frena `js/app.js`, y la API igual responde 403).

La matriz completa está en la pantalla *Permisos*, y se genera a partir de
`api/services/Permisos.php`, que es la misma definición que usa el servidor para
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
- **Nadie crea otra cuenta Root ni asciende a nadie a Root**, ni siquiera un Root.
- **Nadie bloquea una cuenta Root**, tampoco otro Root.

#### La cuenta Root es única

Root es la llave que abre todo, incluida la gestión de los propios
administradores. Por eso el sistema no la reparte ni la deja fuera de juego:

- Si se pudieran crear cuentas Root desde la pantalla, dejaría de estar claro
  quién tiene el control real del sistema.
- Si un Root pudiera bloquear a otro, dos personas con la misma llave podrían
  dejarse afuera mutuamente y no quedaría nadie con permiso para arreglarlo.

Desbloquear una cuenta Root sí se permite: es la salida si quedó bloqueada
desde la base. Y crear otro Root sigue siendo posible, pero **a mano en la base
de datos**, que es un acto deliberado y con rastro fuera de la aplicación.

La regla vive en `Permisos::ROL_RAIZ` y la aplica `ServicioUsuarios`. La
pantalla de permisos la muestra como dos filas sin ningún rol marcado
(`usuarios.crearRoot` y `usuarios.bloquearRoot`): no es que falte un permiso,
es que el sistema no hace esa operación para nadie.

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

El control está **en el servidor** (`api/services/Sesion.php`). Al iniciar sesión se crea
una sesión de PHP y cada endpoint sensible vuelve a comprobar el rol contra la
base de datos, en cada petición.

Ocultar el menú en el navegador es solo comodidad visual. Si alguien edita el
`localStorage` y entra a `/pages/admin/usuarios.html` a mano, la API le responde
`403` y la pantalla queda vacía; además `js/app.js` lo devuelve al panel.

Como el rol se relee de la base en cada petición, si a alguien le cambian el rol
o lo bloquean mientras tiene la sesión abierta, el cambio surte efecto de
inmediato, sin esperar a que vuelva a entrar.

Todos los endpoints exigen sesión iniciada, y los que operan sobre el trabajo
del área (préstamos, cambios de estado, altas de inventario) exigen además rol
de personal técnico.

---

## Cada uno ve lo suyo

Un ticket o una solicitud pertenecen a quien los abrió. El **personal técnico**
(Root, Administrador, Técnico) ve todo el trabajo del sistema; el resto ve
únicamente lo propio, **sin importar el estado en que esté**.

Además del solicitante, un registro puede tener **participantes**: personas que
se agregan al crearlo y que lo ven y lo siguen como si fuera suyo. Es lo que
permite, por ejemplo, que un técnico abra el ticket de un problema que reportó
un docente por teléfono y lo sume para que pueda seguirlo.

El recorte lo hace la base de datos (`filtro_visibilidad()` en
`api/services/Permisos.php`), no el navegador: pedir la lista completa a mano por la API
devuelve exactamente lo mismo.

## Línea de tiempo de cada registro

Cada cambio de estado se guarda en la tabla `historial` con **la nota de quien
lo hizo**, su nombre, su rol y la fecha. Esa nota es obligatoria: el servidor
rechaza el cambio si no explica qué se hizo, porque el objetivo es que el
historial cuente la reparación y no solo la sucesión de estados.

Se ve entrando a *Ver detalle* en cualquier ticket o solicitud. Quien no puede
avanzar el estado ve la misma ficha en modo lectura, sin el formulario del final.

## Nomenclatura de identificadores

Todo lo que se menciona por escrito tiene un código generado por el servidor
(`api/services/Nomenclatura.php`), nunca escrito a mano:

| Qué | Forma | Ejemplo |
|---|---|---|
| Equipos y componentes | `<ACRÓNIMO DE UBICACIÓN>-<N° DE SERIE>` | `L1-SN-88213` |
| Tickets | `TK-<AÑO>-<CORRELATIVO>` | `TK-2026-0001` |
| Solicitudes | `SL-<AÑO>-<CORRELATIVO>` | `SL-2026-0001` |
| Préstamos | `PR-<AÑO>-<CORRELATIVO>` | `PR-2026-0001` |

El acrónimo sale de la ubicación: si tiene números, se usan las iniciales de sus
palabras más el número (*Laboratorio 1* → `L1`); si no, sus tres primeras letras
(*Administración* → `ADM`, *Depósito* → `DEP`). Un componente sin número de
serie usa su id como respaldo (`DEP-C0011`).

Como todos siguen la misma forma, el código sirve de índice de búsqueda: al
crear un ticket se escribe parte del código, de la marca o de la ubicación y el
buscador ofrece el equipo; después el ticket lo muestra por su código.

---

## Buscar en vez de elegir de una lista

Los formularios que apuntan a algo del sistema —el equipo de un ticket, las
personas que lo siguen, el solicitante de un préstamo— usan el mismo control:
`js/components/indexador.js`. Se escribe y el navegador filtra; se busca por
**código o modelo** en los equipos, y por **cédula o nombre** en las personas.

Antes las personas se elegían de una lista de casillas con todo el sistema
adentro. Eso obliga a recorrer la lista entera con la vista y deja de servir
apenas hay más de una pantalla de gente; con la cédula, además, dos personas
que se llaman parecido dejan de ser un problema.

Se apoya en `<datalist>`, que es del propio navegador: filtra solo, se maneja
con el teclado y no necesita ninguna librería.

### Quién puede sumar a quién

El personal del área puede sumar a cualquiera. Un usuario final solo puede
sumar a otros usuarios finales: si pudiera agregar a un técnico a su propio
ticket, tendría una forma de decidir a quién le aparece trabajo en la pantalla.

La regla se aplica en dos lugares y por motivos distintos: el buscador solo
ofrece a quien corresponde (y así tampoco reparte cédulas de más), y
`ServicioSeguimiento` la vuelve a comprobar al guardar, que es la que vale
—el formulario es dibujo y se puede saltear llamando a la API.

---

## Listados: tope, desplazamiento y paginación

Todas las pantallas con lista (usuarios, tickets, solicitudes, préstamos,
inventario, auditoría, estado de equipos y los equipos del inicio) se dibujan
con `js/components/listado.js`, así se comportan igual en tres cosas que antes
cada una resolvía por su cuenta:

- **No se salen del recuadro.** Las filas van dentro de un contenedor con
  altura máxima (`.lista-scroll`) y su propia barra. Antes se veía el borde de
  la tarjeta cortando las últimas filas, porque `main` es un contenedor flex y
  sus hijos se encogían por debajo de su contenido; eso lo arregla
  `main > * { flex-shrink: 0 }`.
- **No se pintan mil filas de una.** Se muestran de a 25 por defecto, y el pie
  deja elegir 10, 25, 50 o 100.
- **Siempre se sabe cuántos hay.** El pie dice «Mostrando 1–25 de 120» y trae
  los botones de página anterior y siguiente.
- **El encabezado de las tablas no se pierde.** Queda fijo arriba mientras se
  desplaza el listado, así siempre se sabe qué columna es cuál. Por eso las
  tablas usan `border-separate` y no `border-collapse`: con los bordes
  colapsados, el borde inferior del encabezado desaparece apenas la fila se
  vuelve pegajosa, porque ese borde le pertenece a la tabla y no a la celda.

Cada contenedor recuerda su página y su cantidad por página, así volver a
dibujar (por un alta o un cambio de estado) no pierde lo que la persona eligió.
Al tocar un filtro se vuelve a la primera página, porque la que estaba mirando
puede haber dejado de existir.

Para usarlo desde una pantalla:

```js
Eternum.components.listado.render({
  contenedor: lista,
  items: filtrados,                       // la lista COMPLETA, ya filtrada
  vacio: { icono: "tickets", mensaje: "Todavía no tenés tickets" },
  contenido: function (visibles) {        // solo la página actual
    return '<div class="flex flex-col">' + visibles.map(fila).join("") + "</div>";
  }
});
```

### Barras de desplazamiento

Están personalizadas para todo el sistema (la página, el menú lateral, los
listados y los modales), con las dos sintaxis que hacen falta: `scrollbar-width`
y `scrollbar-color` para Firefox, y `::-webkit-scrollbar` para los basados en
Chromium. Los colores salen de las variables del tema, así que la barra cambia
sola con el modo oscuro y con el alto contraste.

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
> en el servidor sin tener Node instalado.

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
| `data-font-size`  | `small` / `medium` / `large`      | Botones **A A A**, en el menú del usuario |
| `data-contrast`   | `normal` / `high`                | Perfil → Accesibilidad (interruptor) |
| `data-dyslexic`   | `true` / `false`                 | Perfil → Accesibilidad (interruptor) |

El tamaño extra grande (`xl`) se sacó: agrandaba tanto que rompía las tablas y
la barra superior. A quien lo tuviera elegido se le pasa solo al más grande de
los que quedan, así nadie queda en un tamaño sin botón para volver atrás.

#### Qué hace (y qué no) el alto contraste

Refuerza, no repinta. El fondo, las tarjetas y los colores de estado siguen
siendo los mismos: lo que cambia es el texto (a negro o a blanco puro), el
borde (más marcado y de 2px) y los tonos que no llegaban al mínimo AA de
4.5:1, que se oscurecen o aclaran lo justo.

Antes el modo dejaba todo en blanco y negro, y en tema oscuro el fondo y las
tarjetas se iban los dos a negro puro: la pantalla ganaba contraste pero
perdía su estructura —no se distinguía dónde terminaba una tarjeta— y los
estados dejaban de reconocerse de un vistazo, porque sin el verde y el rojo
una insignia es solo texto.

Tampoco mueve nada de lugar. El refuerzo del borde **no** se hace pasando de
1px a 2px: eso cambia el tamaño de la caja, así que cada tarjeta, botón e
insignia crecerían 2px y la página entera se reacomodaría en el instante en
que se enciende el modo —justo a quien lo necesita es a quien peor le viene
ese salto—. En su lugar el segundo pixel se dibuja hacia adentro con
`box-shadow: inset` (y con `outline` donde hay contenido que lo taparía, como
el menú activo o las barras de progreso). Ninguna de las dos propiedades
participa del cálculo del diseño.

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

## En el teléfono

La misma página se acomoda; no hay una versión de escritorio y otra de móvil que
haya que mantener en paralelo. El corte está en **768px** (`48rem`), y todo lo
que cambia vive en un solo bloque de `assets/css/input.css`.

### El menú es un cajón

En pantalla grande el menú es la columna de siempre. En el teléfono se convierte
en un cajón que entra desde el costado:

- Se abre con el botón **☰** de la barra superior, arriba a la izquierda.
- Se cierra tocando el fondo oscuro, la **✕** del propio cajón, eligiendo una
  sección, o con `Escape`.
- Mientras está abierto, la página de atrás no se desplaza.

Antes el menú se convertía en una franja de enlaces arriba del contenido.
Funcionaba, pero con seis secciones ocupaba media pantalla: lo primero que se
veía al entrar era el menú, no el sistema. Como cajón ocupa cero hasta que
alguien lo pide.

El cajón queda fuera de la pantalla con `translateX(-100%)` y no con
`display: none`, por dos razones: entra deslizándose en vez de aparecer de
golpe, y el lector de pantalla lo sigue encontrando.

#### Por qué el estado del cajón no se guarda

Contraer el menú **sí** se guarda, porque es una preferencia: "lo quiero angosto
siempre". Abrir el cajón **no**, porque es un gesto del momento: "mostrame las
secciones ahora". Si se guardara, cada pantalla nueva abriría con el cajón
tapando el contenido.

Por lo mismo, la preferencia de menú contraído se ignora en el teléfono. Quien
lo dejó contraído en la computadora abría el celular y se encontraba un cajón de
5rem con los nombres de las secciones cortados.

### Lo demás que cambia

| Qué | Por qué |
|-----|---------|
| La barra superior queda fija arriba (`sticky`) | Ahí vive el botón del menú. Si se va con el scroll hay que volver hasta arriba de una lista larga solo para cambiar de sección. |
| Botones de icono a 44px | Es el mínimo que se puede tocar sin errarle. Los de 36px quedaban por debajo. |
| Las acciones de cada fila ocupan el ancho completo | Apretadas contra el borde derecho eran dos objetivos de 40px pegados uno al otro. |
| Los dos botones del pie de una ventana, del mismo ancho | Alcanza con mirar sin apuntar. |
| Márgenes más chicos (tarjetas, cuerpo, barra) | En 360px de ancho, 1.5rem de cada lado son 48px que se le quitan al texto. |
| El nombre del usuario se recorta antes | Con el botón del menú al lado, un nombre largo empujaba la ficha fuera de la pantalla. |
| El encabezado de cada pantalla se apila y su acción principal ocupa el ancho | Queda al alcance del pulgar en vez de escondida en un rincón. |
| El contenido se desplaza como una página normal | Sin el menú al costado, el scroll propio de `main` sobra: en un teléfono se espera que se mueva la página entera. |
| Los avisos flotantes van de lado a lado | Un aviso de ancho fijo en 360px queda pegado a un borde. |

### Las tablas se vuelven tarjetas

Esto es lo único del sistema que en el teléfono **no** es la misma vista más
angosta, sino otra distinta, y es a propósito.

Una tabla necesita unos 38rem para que las columnas se lean. En un teléfono de
412px eso no entra, y las dos salidas de siempre son malas: encogerla parte cada
celda en cuatro renglones, y dejarla correr de costado obliga a arrastrar de
izquierda a derecha una vez por fila — perdiendo de vista el código del equipo
justo cuando hace falta para saber de qué fila se trata.

Acá cada fila pasa a ser una tarjeta:

```
┌──────────────────────────────┐
│ L1-SN-88213      ● Operativo  │   ← lo que identifica, y su estado
│ ──────────────────────────── │
│ TIPO                 Desktop   │
│ MARCA / MODELO  Dell OptiPlex   │
│ UBICACIÓN     Laboratorio 1     │
│ DETALLE                         │   ← lo largo, a todo el ancho
│ Pantalla intermitente            │
│ ──────────────────────────── │
│ [        Reportar           ]   │   ← la acción, al alcance del pulgar
└──────────────────────────────┘
```

El encabezado de la tabla se apaga, porque cada valor ya lleva su nombre al lado.

**Se hace con CSS, no armando otro HTML.** El JavaScript sigue dibujando una
sola tabla; lo único que cambió es que cada celda dice qué es:

```js
'<td class="celda-titulo">' + eq.codigo + "</td>"
'<td data-etiqueta="Ubicación">' + eq.ubicacion + "</td>"
'<td class="celda-bloque" data-etiqueta="Fallas">' + eq.fallas + "</td>"
```

Así no hay dos vistas que se puedan desincronizar cuando se agregue una
columna, y la página sigue siendo una tabla de verdad para el lector de
pantalla.

Los papeles que puede tener una celda:

| Clase | Dónde cae en la tarjeta |
|-------|------------------------|
| `celda-titulo`   | Arriba a la izquierda, en negrita y sin etiqueta. Lo que identifica la fila: el código del equipo, o la acción en auditoría y permisos. |
| `celda-insignia` | Arriba a la derecha, sin etiqueta. El estado. |
| `celda-accion`   | Abajo, a todo el ancho y separada por una línea. El botón de la fila. |
| `celda-bloque`   | El nombre arriba y el texto abajo, a todo el ancho. Para lo que puede ser largo: una falla, un detalle, quién hizo algo. |
| (nada)           | Una línea: el nombre a la izquierda, el valor a la derecha. |

El lugar de cada una lo decide `order` y no su posición en el HTML, porque el
código y el estado caen en una columna distinta en cada tabla — y el orden de
las columnas es cosa del escritorio.

Con tarjetas, el listado deja de tener desplazamiento propio (`.lista-scroll`
pasa a `overflow: visible`): una caja que se desplaza dentro de una página que
también se desplaza es la forma más rápida de que el dedo mueva la que no era.
Lo que corta el largo es la paginación, que ya estaba.

#### La matriz de permisos es la excepción de la excepción

Ahí los cuatro roles **no** van uno debajo del otro, sino en una fila de cuatro
columnitas bajo el nombre de la acción:

```
┌──────────────────────────────┐
│ Crear un ticket                 │
│ ──────────────────────────── │
│  ROOT   ADMIN  TÉCNICO  DOCENTE │
│   ✓       ✓       ✓       —    │
└──────────────────────────────┘
```

La pregunta que se le hace a esa pantalla es "quién puede hacer esto", y eso se
responde mirando los cuatro juntos; en cuatro renglones separados hay que
leerlos de a uno y recordar. Además, con treinta acciones, apilarlos sumaba unos
seis mil píxeles de recorrido.

### Las tarjetas de número van de a dos

Una etiqueta corta y un número no justifican el ancho entero. Cuatro de ellas a
pantalla completa se comían la primera vista de Administración y había que bajar
para llegar a lo que la página realmente muestra. Lo mismo con las fechas de
auditoría: "desde" y "hasta" se leen mejor una al lado de la otra.

Las que **no** se ponen de a dos son las que llevan una descripción debajo del
título (los accesos rápidos del inicio, las tarjetas de rol): esas necesitan el
ancho para que el texto no quede en columna de dos palabras.

### Las pestañas de Administración, en un renglón

Con los iconos no entraban las cuatro y se partían en dos filas dentro de una
píldora, que quedaba como un bloque raro ocupando un tercio de la pantalla. Sin
los iconos entran justas. El desplazamiento de costado queda igual, por si
alguien agranda la letra.

## Estructura de carpetas

```
eternum/
├── api/                     # Backend PHP, separado en tres capas
│   ├── index.php            # Front controller: autocarga, rutas y errores
│   ├── config.php           # Credenciales de la base de datos
│   ├── .htaccess            # URLs limpias para la API (opcional)
│   │
│   ├── controllers/         # CAPA 1 · presentacion: uno por area del sistema
│   │   └── Controlador*.php #   Auth, Tickets, Inventario, Usuarios...
│   ├── http/                #   Las piezas que hablan el protocolo
│   │   ├── Peticion.php     #   Lee el cuerpo, la consulta y la ruta
│   │   ├── Respuesta.php    #   Arma el JSON de salida
│   │   └── Enrutador.php    #   Asocia cada direccion con un controlador
│   │
│   ├── services/            # CAPA 2 · negocio: las reglas del sistema
│   │   ├── Sesion.php       #   Quien entro y que puede hacer
│   │   ├── Permisos.php     #   Matriz de permisos (fuente de verdad)
│   │   ├── Nomenclatura.php #   Genera los codigos (L1-SN-88213, TK-2026-0001)
│   │   ├── Auditoria.php    #   Registro de quien hizo que
│   │   └── Servicio*.php    #   Un servicio por area
│   │
│   ├── repositories/        # CAPA 3 · datos: lo unico que escribe SQL
│   │   ├── Conexion.php     #   PDO y traduccion de errores de conexion
│   │   ├── Repositorio.php  #   Base comun de los repositorios
│   │   └── Repositorio*.php #   Uno por tabla
│   │
│   └── helpers/             # Piezas que usan todas las capas
│       ├── ErrorDeNegocio.php  # Excepcion con su codigo HTTP
│       ├── Validador.php       # Validaciones de entrada
│       └── Texto.php           # Texto con acentos sin depender de mbstring

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
├── js/                      # Frontend, con las mismas tres capas
│   ├── utils/utils.js       # Helpers de DOM, formato y validacion
│   │
│   ├── repositories/        # CAPA 3 · datos: unica que habla con la API
│   │   ├── api.js           #   fetch, URL base, sesion vencida, errores
│   │   ├── repositorios.js  #   Un repositorio por recurso
│   │   └── datosDeEjemplo.js#   Datos de ejemplo (modo sin servidor)
│   │
│   ├── services/            # CAPA 2 · negocio: las reglas del sistema
│   │   ├── sesion.js        #   Quien entro y que alcance tiene
│   │   ├── tickets.js       #   Estados, orden, quien avanza, que se busca
│   │   ├── solicitudes.js · prestamos.js · inventario.js
│   │   ├── usuarios.js      #   Quien gestiona a quien, roles asignables
│   │   └── resumenes.js     #   Inicio, panel, auditoria y permisos
│   │
│   ├── components/          # CAPA 1 · presentacion: piezas reutilizables
│   │   ├── components.js    #   Preferencias, sidebar, modales, avisos
│   │   ├── listado.js       #   Listados con tope, scroll propio y paginacion
│   │   ├── indexador.js     #   Buscador con indice (equipos y personas)
│   │   ├── detalle.js       #   Ficha con linea de tiempo
│   │   ├── iconos.js · charts.js
│   ├── pages/               # CAPA 1 · presentacion: un script por pantalla
│   └── app.js               # Arranque comun de las vistas internas
│
├── scripts/                 # Lanzador de 'npm run main'
│   ├── main.js              # Orquesta base de datos + web
│   ├── router.php           # Sirve los estáticos sin caché (solo desarrollo)
│   └── lib/
│       ├── config.js        # Carga y valida la configuracion
│       ├── basedatos.js     # Arranca la MariaDB del proyecto
│       ├── web.js           # Servidor PHP y compilacion de estilos
│       └── consola.js       # Salida con colores
│
├── pages/                   # Las vistas HTML, agrupadas por quien entra
│   ├── common/              #   Todos los roles
│   ├── tecnico/             #   Personal del area
│   └── admin/               #   Solo Root y Administrador
├── .htaccess                # Direcciones limpias cuando sirve Apache
├── index.html               # Redirige al login
├── eternum.config.json      # Configuracion del lanzador
└── package.json             # Scripts de npm
```

---

## Arquitectura en tres capas

**El backend y el frontend están separados en las mismas tres capas**, y en
las dos mitades cada capa solo conoce a la de abajo:

| Capa | Backend | Frontend | De qué se ocupa |
|---|---|---|---|
| Presentación | `api/controllers/` · `api/http/` | `js/pages/` · `js/components/` | Hablar con afuera: HTTP y JSON de un lado, DOM y eventos del otro |
| Negocio | `api/services/` | `js/services/` | Las reglas: permisos, estados, validaciones, códigos |
| Datos | `api/repositories/` | `js/repositories/` | Traer y guardar: SQL de un lado, llamadas a la API del otro |

Los nombres de las carpetas son los de siempre en una arquitectura por capas
—**controllers**, **services**, **repositories**— para que cualquiera que
abra el proyecto sepa dónde mirar sin leer esta sección.

Del lado del navegador eso significa que una pantalla **no llama a la API**:
le pide a la capa de negocio, que decide y delega en la de datos.

```
La persona toca "Avanzar estado"
   → js/pages/tickets.js            (presentación)  toma la nota escrita
   → js/services/tickets.js         (negocio)       ¿puede avanzar? ¿la nota alcanza?
                                                    ¿cuál es el estado siguiente?
   → js/repositories/repositorios.js (datos)        PATCH /tickets/7
   → js/repositories/api.js          (datos)        fetch, y si vuelve 401 al login
```

Las reglas están escritas dos veces a propósito —en `js/services/` y en
`api/services/`— pero con papeles distintos: la del navegador sirve para
**dibujar** (no ofrecer un botón que iba a fallar), y la del servidor para
**autorizar**. La que manda es siempre la del servidor.

Y del lado del servidor:

| Capa | Carpeta | De qué se ocupa | Qué NO sabe |
|---|---|---|---|
| Presentación | `api/controllers/` y `api/http/` | Leer la petición HTTP y devolver JSON | Ninguna regla del sistema |
| Negocio | `api/services/` | Permisos, validaciones, códigos, historial | Qué es una petición ni qué es SQL |
| Datos | `api/repositories/` | Las consultas a la base | Quién le pregunta ni por qué |

Un pedido recorre siempre el mismo camino:

```
PATCH /tickets/7
   → controllers/ControladorTickets      (presentación)  lee el cuerpo JSON
   → services/ServicioTickets            (negocio)       ¿sos personal técnico?
                                                         ¿escribiste la nota?
   → repositories/RepositorioTickets     (datos)         UPDATE tickets SET estado = ?
   → repositories/RepositorioHistorial   (datos)         INSERT INTO historial ...
   ← http/Respuesta::ok(...)             (presentación)  200 con el ticket actualizado
```

**Por qué importa.** Antes cada controlador hacía las tres cosas a la vez:
validaba, escribía SQL y respondía. Eso significaba que cambiar una consulta
obligaba a leer las reglas, y que las reglas no se podían probar sin levantar
un servidor. Ahora una regla se cambia sin tocar consultas, y una consulta sin
tocar reglas.

Dos detalles que sostienen la separación:

- **Los errores no son HTTP hasta el final.** Las capas de abajo lanzan
  `ErrorDeNegocio` con el motivo escrito para una persona; `index.php` es el
  único que lo traduce a un 403, un 404 o un 422. Por eso ni los servicios ni
  los repositorios necesitan saber qué es un código HTTP.
- **Quién ve qué se resuelve en la base.** `Permisos::filtroVisibilidad()`
  devuelve un fragmento de `WHERE` con sus parámetros, y el repositorio lo pega
  a la consulta. Así el recorte ocurre en el motor y no en el navegador, sin
  que la capa de datos tenga que conocer los roles.

---

## La API

Todas las rutas cuelgan de `/api`. El frontend las llama como
`/api/index.php?_ruta=<ruta>`, de modo que funciona con o sin `mod_rewrite`.

| Método  | Ruta                | Qué hace                                      |
|---------|---------------------|-----------------------------------------------|
| `POST`  | `/auth/login`       | Valida cédula + contraseña                     |
| `GET`   | `/equipos`          | Lista los equipos (`?buscar=`, `?ubicacion=`, `?estado=`) |
| `POST`  | `/equipos`          | Registra un equipo                             |
| `GET`   | `/componentes`      | Lista los componentes                          |
| `POST`  | `/componentes`      | Registra un componente                         |
| `GET`   | `/tickets`          | Lista los tickets que puede ver quien pregunta |
| `POST`  | `/tickets`          | Crea un ticket (con participantes opcionales)  |
| `GET`   | `/tickets/{id}`     | Ficha completa: participantes y línea de tiempo |
| `PATCH` | `/tickets/{id}`     | Cambia el estado; la nota es obligatoria *(personal)* |
| `GET`   | `/prestamos`        | Lista los préstamos *(personal)*               |
| `POST`  | `/prestamos`        | Registra un préstamo *(personal)*              |
| `GET`   | `/prestamos/{id}`   | Ficha con la línea de tiempo *(personal)*      |
| `PATCH` | `/prestamos/{id}`   | Cambia el estado (por ejemplo, a devuelto) *(personal)* |
| `GET`   | `/solicitudes`      | Lista las solicitudes que puede ver quien pregunta |
| `POST`  | `/solicitudes`      | Crea una solicitud                             |
| `GET`   | `/solicitudes/{id}` | Ficha completa: participantes y línea de tiempo |
| `PATCH` | `/solicitudes/{id}` | Cambia el estado; la nota es obligatoria *(personal)* |
| `GET`   | `/directorio`       | Nombres para elegir a quién sumar a un ticket  |
| `GET`   | `/inicio`           | Resumen de la pantalla de inicio, según el rol |
| `GET`   | `/dashboard`        | Métricas agregadas de Estado de Equipos *(personal)* |
| `GET`   | `/auth/sesion`      | Quién está autenticado ahora mismo             |
| `POST`  | `/auth/logout`      | Cierra la sesión                               |
| `PATCH` | `/auth/password`    | Cambia la contraseña propia (pide la actual)   |
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
- Los resúmenes se calculan con `COUNT` en la base, no trayendo todas las filas
  al navegador.
- *(personal)* en la tabla significa Root, Administrador o Técnico. Donde no
  figura, cada usuario recibe solamente lo suyo: la API recorta el listado en
  el `WHERE`, no en el navegador.

### Cambiar las credenciales de la base

Con `npm run main`, se editan en `eternum.config.json`, dentro de `"mariadb"`;
el lanzador se las pasa a PHP solo.

```json
"mariadb": { "usuario": "root", "password": "tu_contraseña" }
```

Si en cambio el sitio lo sirve otro servidor web (Apache en el servidor Ubuntu,
por ejemplo), editá `api/config.php`.

### Direcciones del sistema

Las pantallas se abren con direcciones limpias y en español: `/tickets/`, no
`/pages/common/tickets.html`.

**Todas terminan en barra**, también cuando llevan parámetros:
`/tickets/?nuevo=1`. Es una sola forma para cada dirección: mezclar `/tickets`
con `/tickets/?nuevo=1` serían dos maneras de escribir lo mismo. Las rutas de
la API no la llevan (`/api/tickets`): son recursos, no carpetas.

| Dirección | Pantalla |
|---|---|
| `/dashboard/` | Inicio |
| `/tickets/` · `/solicitudes/` | Mesa de ayuda |
| `/inventario/` · `/estado/` | Inventario y estado de los equipos |
| `/nuevo-equipo/` · `/nuevo-componente/` | Altas de inventario |
| `/prestamos/` | Préstamos |
| `/perfil/` | Perfil y accesibilidad |
| `/admin/` · `/admin/usuarios/` · `/admin/permisos/` · `/admin/auditoria/` | Sección administrativa |
| `/login/` | Ingreso |
| `/error/?error=404` | Pantalla de error |

Las carpetas de `pages/` agrupan por **quién puede entrar**, que es la misma
división que hace el control de acceso:

| Carpeta | Quién entra | Pantallas |
|---|---|---|
| `pages/common/` | Todos los roles | dashboard, tickets, solicitudes, perfil, login |
| `pages/tecnico/` | Root, Administrador y Técnico | inventario, estado, préstamos y las dos altas |
| `pages/admin/` | Root y Administrador | admin, usuarios, permisos, auditoría |

Ese agrupamiento **ordena los archivos, no las direcciones**:

```
pages/common/tickets.html      →  /tickets
pages/tecnico/inventario.html  →  /inventario
pages/admin/admin.html         →  /admin
pages/admin/usuarios.html      →  /admin/usuarios
```

La diferencia está en que una carpeta que contiene su propia página
(`admin/admin.html`) es una **sección**: tiene dirección propia y sus
pantallas cuelgan de ella. Una que no la tiene (`common`, `tecnico`) solo
ordena, y sus pantallas cuelgan de la raíz. Por eso `/usuarios` da 404 y la
dirección correcta es `/admin/usuarios`: la misma pantalla no tiene dos
nombres.

Mover una pantalla de grupo (si mañana los docentes pueden ver préstamos) no
le cambia la dirección a nadie. Se resuelve en dos lugares:

- Con `npm run main`, en `scripts/router.php`, con una regla genérica: `/loquesea`
  busca `pages/*/loquesea.html`. Agregar una pantalla no obliga a tocar nada.
- Con Apache, en el `.htaccess` de la raíz, que sí lleva una línea por
  pantalla porque Apache no admite comodines en el destino de `RewriteRule`.

### Cuando algo falla

Una dirección que no corresponde a ninguna pantalla **redirige a
`/error/?error=404`**, en vez de caer al login como si fuera válida: así un
error de tipeo no se confunde con una sesión vencida.

La pantalla dice poco a propósito: el código, un título y una línea. Nada de
qué dirección se pidió, qué parte del sistema falló ni qué habría que
revisar. Una pantalla de error la ve cualquiera —incluido quien está probando
a ver qué encuentra—, y describir el problema con detalle es describirle a un
desconocido cómo está armado el sistema. Lleva un solo botón: al inicio, o al
inicio de sesión cuando el código es 401, porque ahí el inicio tampoco se
puede ver.

Hay texto propio para 400, 401, 403, 404, 500 y 503; cualquier otro código
cae en un «Se produjo un error» a secas.

**El código de estado es real.** `/error/?error=404` responde 404, no un 200
con cara de error, porque la sirve `pages/common/error.php`: un archivo de
cuatro líneas que fija el estado y devuelve el HTML. Lo usan los dos caminos
—`scripts/router.php` en desarrollo y el `.htaccess` en el servidor— así que
las dos formas de levantar el sistema se comportan igual.

> Los rebotes por permisos **no** pasan por acá: si un docente entra a
> `/prestamos/`, vuelve al inicio con un aviso, que es más útil que una
> pantalla de error para algo que no es un error suyo.

> **Ojo:** las páginas enlazan sus estilos, scripts y la API con rutas
> absolutas (`/assets/...`, `/js/...`, `/api`). Eso da por sentado que el
> proyecto es **la raíz del sitio**, que es lo que hace `npm run main`. Si se
> sirve desde una subcarpeta (`http://localhost/eternum/`), hay que ajustar esas
> rutas y el `RewriteBase` del `.htaccess`.

### Por qué el sitio nunca queda cacheado en desarrollo

El servidor embebido de PHP no manda cabeceras de caché para los archivos
estáticos, así que el navegador decide por su cuenta y termina mezclando
versiones: HTML nuevo con JavaScript viejo. Eso se ve como fallas raras (una
función que "no existe", un menú que no se actualiza) que se arreglan solas con
Ctrl+Shift+R, cosa que nadie se acuerda de hacer.

Por eso `npm run main` levanta PHP con `scripts/router.php`, que sirve los
estáticos agregando `Cache-Control: no-store`. Los `.php` los sigue ejecutando
el servidor. En el servidor Ubuntu no interviene: ahí manda Apache.

### Modo sin servidor (datos de ejemplo)

Para trabajar el frontend sin levantar la base, en `js/repositories/api.js`:

```js
var USA_EJEMPLOS = true;   // usa datos de ejemplo en localStorage
```

Las vistas no cambian: toda la diferencia queda dentro de la capa de datos.

---

## Diagnóstico

Si algo no arranca, este comando revisa el entorno entero y dice qué falta:

```bash
npm run doctor
```

Comprueba la versión de Node, que PHP exista y tenga `pdo_mysql`, que MariaDB o
MariaDB y PHP estén donde corresponde, si los puertos están libres u ocupados, si la
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
