# Liga 1 Admin

Panel web privado para administrar la operación de la Liga 1: jornadas, partidos, marcadores en vivo, tablas de posiciones, noticias, usuarios autorizados y notificaciones push.

La aplicación utiliza Next.js para la interfaz y las funciones de servidor, mientras que Firebase proporciona autenticación, persistencia en tiempo real y mensajería.

## Contenido

- [Alcance funcional](#alcance-funcional)
- [Módulos del sistema](#módulos-del-sistema)
- [Resumen de ingeniería](#resumen-de-ingeniería)
- [Inicio rápido en Terminal](#inicio-rápido-en-terminal)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Decisiones técnicas y trade-offs](#decisiones-técnicas-y-trade-offs)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos en Firestore](#modelo-de-datos-en-firestore)
- [Ejecución local con npm](#ejecución-local-con-npm)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Calidad, seguridad y confiabilidad](#calidad-seguridad-y-confiabilidad)
- [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Operación y recuperación](#operación-y-recuperación)
- [Limitaciones conocidas y roadmap](#limitaciones-conocidas-y-roadmap)
- [Referencias técnicas](#referencias-técnicas)

## Alcance funcional

El panel permite:

- Autenticar administradores y proteger las rutas internas mediante sesión.
- Administrar jornadas, partidos y estados del encuentro.
- Actualizar marcadores y tablas de posiciones en tiempo real.
- Mantener las tablas del Apertura, Clausura y Acumulado.
- Crear y administrar noticias.
- Enviar notificaciones push mediante Firebase Cloud Messaging.
- Gestionar configuraciones operativas y usuarios autorizados.

Las rutas principales están bajo `/dashboard`. La siguiente sección resume la responsabilidad de cada módulo; los casos de uso y reglas específicas se mantienen junto al código para evitar duplicar documentación sensible a cambios.

## Módulos del sistema

| Módulo | Ruta | Descripción |
|---|---|---|
| Autenticación | `/login` | Valida usuarios autorizados con Firebase Authentication, crea la sesión del panel y controla el acceso a las rutas privadas. |
| Dashboard | `/dashboard` | Presenta un resumen operativo con información relevante de jornadas, partidos y usuarios. |
| Partidos | `/dashboard/partidos` | Organiza encuentros en vivo, próximos, finalizados o suspendidos y permite gestionar su estado, marcador y tiempos de juego. |
| Jornadas | `/dashboard/jornadas` | Permite consultar las fechas del Apertura y Clausura, administrar su visibilidad y acceder a los partidos de cada jornada. |
| Tabla de posiciones | `/dashboard/posiciones` | Muestra en tiempo real las clasificaciones independientes del Apertura y Clausura, además de la tabla Acumulada. |
| Noticias | `/dashboard/noticias` | Permite crear, editar y administrar las noticias que consume la aplicación. |
| Configuración | `/dashboard/configuracion` | Reúne ajustes de cuenta, usuarios y operaciones administrativas, incluida la preparación del Torneo Clausura. |
| Servicios de servidor | `/api/*` | Contiene endpoints internos para sesiones, administración de usuarios, estadísticas y notificaciones push. |

Todos los módulos privados comparten el layout del dashboard y la protección de sesión definida en `src/proxy.ts`.

## Resumen de ingeniería

Más que un CRUD, el proyecto resuelve un dominio con eventos en vivo, datos derivados y operaciones administrativas sensibles. Estos son sus puntos técnicos principales:

| Capacidad | Implementación | Valor técnico |
|---|---|---|
| Aplicación full-stack | Next.js App Router, React y API Routes dentro del mismo repositorio | Unifica UI y servicios de servidor manteniendo fronteras explícitas |
| Separación por contratos | Entidades, interfaces y servicios separados de los repositorios Firebase | Reduce lógica de negocio en componentes y crea una ruta clara para desacoplar por completo la persistencia |
| Datos en tiempo real | Suscripciones `onSnapshot` para jornadas, partidos, noticias y posiciones | La UI reacciona a cambios operativos sin polling continuo |
| Consistencia de posiciones | Actualizaciones por lotes para ambos equipos y recálculo del Acumulado | Reduce escrituras parciales y centraliza las reglas de puntos y goles |
| Recuperación determinista | Reconstrucción del Clausura desde partidos finalizados | Permite auditar y reparar datos derivados usando una fuente de verdad |
| Frontera cliente/servidor | Firebase Client SDK en navegador y Firebase Admin en API Routes | Evita exponer credenciales privilegiadas en el bundle cliente |
| Sesión web | Cookie `httpOnly`, `sameSite=lax` y `secure` en producción | Reduce exposición del token y permite proteger el dashboard desde el servidor |
| Rendimiento de lectura | Consultas limitadas, carga diferida, `Promise.all` y caché con TanStack Query | Evita esperas seriales y lecturas innecesarias en pantallas operativas |
| Experiencia resiliente | `loading.tsx`, `error.tsx` y `not-found.tsx` por segmentos | Aísla fallos y mantiene feedback inmediato durante navegación y carga |
| Entrega continua | Preview Deployments por rama y producción desde `main` en Vercel | Permite validar cada PR en un entorno desplegado antes de publicar |

### Competencias demostradas

- Diseño y construcción de una aplicación web full-stack con Next.js y TypeScript.
- Modelado de un dominio real con estados, invariantes y datos calculados.
- Integración de autenticación, base de datos en tiempo real y mensajería.
- Separación de responsabilidades mediante contratos, repositorios, DTOs y mappers.
- Diseño de procesos de recuperación para datos derivados.
- Publicación controlada mediante GitHub, previews y despliegues de producción en Vercel.

> Este repositorio utiliza **Next.js**, no **NestJS**. Next.js cubre la aplicación React y sus servicios web mediante App Router y Route Handlers. NestJS es un framework backend distinto y no se declara como dependencia de este proyecto.

## Inicio rápido en Terminal

Esta es la secuencia completa para ejecutar el proyecto localmente en modo desarrollo.

### 1. Abrir una terminal

En macOS se puede abrir la aplicación **Terminal** desde Spotlight (`Cmd + Espacio` y escribir `Terminal`). También se puede utilizar la terminal integrada de Visual Studio Code.

### 2. Entrar en la carpeta del proyecto

En este equipo, el repositorio se encuentra en:

```bash
cd ~/Downloads/Codigo/liga1-admin-next
```

Confirmar que la terminal está en la carpeta correcta:

```bash
pwd
ls package.json
```

`ls package.json` debe mostrar `package.json`. Si indica que el archivo no existe, la terminal está ubicada en otra carpeta.

### 3. Comprobar Node.js y npm

```bash
node --version
npm --version
```

Se necesita Node.js 20.9 o superior y npm 10 o superior.

### 4. Instalar las dependencias

Este paso es obligatorio la primera vez y debe repetirse cuando cambie `package-lock.json`:

```bash
npm install
```

Al finalizar debe existir la carpeta `node_modules`.

### 5. Configurar las variables de entorno

Si `.env.local` todavía no existe, crearlo desde la plantilla:

```bash
cp .env.example .env.local
```

Abrir `.env.local` con el editor y completar las credenciales de Firebase. Por ejemplo, con Visual Studio Code:

```bash
code .env.local
```

Verificar que las variables requeridas estén presentes:

```bash
npm run verify-env
```

No se debe subir `.env.local` a GitHub.

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La terminal permanecerá ocupada mientras el servidor esté activo. Cuando Next.js termine de iniciar, mostrará una salida similar a:

```text
Local: http://localhost:3000
```

### 7. Abrir el proyecto en el navegador

Ingresar manualmente a:

- [http://localhost:3000](http://localhost:3000) — entrada de la aplicación.
- [http://localhost:3000/login](http://localhost:3000/login) — inicio de sesión.
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — panel protegido.

Los cambios en archivos `.ts`, `.tsx` o CSS se recompilan automáticamente. No es necesario reiniciar el servidor después de cada edición.

### 8. Detener el servidor

Regresar a la terminal donde se ejecutó `npm run dev` y presionar:

```text
Ctrl + C
```

### Uso diario

Después de completar la instalación inicial, normalmente solo se necesita:

```bash
cd ~/Downloads/Codigo/liga1-admin-next
npm run dev
```

Si primero se desea actualizar `develop` desde GitHub:

```bash
git switch develop
git pull --ff-only origin develop
npm install
npm run dev
```

`npm install` es seguro de repetir y garantiza que las dependencias coincidan con `package-lock.json`. Si no hubo cambios de dependencias, se puede ejecutar directamente `npm run dev`. No se debe cambiar a `develop` si existen modificaciones locales sin guardar; comprobar antes con `git status`.

### Si el puerto 3000 está ocupado

Next.js puede seleccionar otro puerto automáticamente. También se puede indicar uno, por ejemplo:

```bash
npm run dev -- -p 3001
```

En ese caso, abrir [http://localhost:3001](http://localhost:3001).

## Tecnologías

### Plataforma principal

| Tecnología | Versión | Responsabilidad |
|---|---:|---|
| Next.js | 16.1.6 | App Router, renderizado, API Routes, proxy y build |
| React | 19.2.3 | Componentes y estado de interfaz |
| TypeScript | 5.x | Tipado estricto y contratos entre capas |
| Node.js | 20.9 o superior | Runtime de desarrollo, build y servidor |
| npm | 10 o superior | Instalación y ejecución de scripts |

### Interfaz

| Dependencia | Uso |
|---|---|
| Tailwind CSS 4 | Estilos, tokens y composición visual |
| Radix UI | Primitivos accesibles de interfaz |
| shadcn/ui | Convenciones y componentes base en `src/components/ui` |
| Lucide React | Iconografía |
| Sonner | Notificaciones toast |
| next-themes | Tema claro y oscuro |
| class-variance-authority | Variantes de componentes |
| clsx y tailwind-merge | Composición segura de clases |
| tw-animate-css | Animaciones utilitarias |

### Datos, estado e integraciones

| Dependencia | Uso |
|---|---|
| Firebase Client SDK 12 | Authentication y Firestore desde el cliente |
| Firebase Admin SDK 13 | Sesiones, usuarios, Firestore y FCM desde el servidor |
| TanStack Query 5 | Caché y sincronización de estado remoto |
| Zustand 5 | Estado global ligero |
| date-fns 4 | Conversión y presentación de fechas |

### Calidad y compilación

- TypeScript está configurado con `strict`, `noImplicitAny`, `strictNullChecks` y `noUncheckedIndexedAccess`.
- ESLint 9 utiliza las reglas de Next.js Core Web Vitals y TypeScript.
- Turbopack está configurado como motor de desarrollo y build.
- El alias `@/*` apunta a `src/*`.

Las versiones exactas y la lista completa de paquetes se encuentran en [`package.json`](./package.json) y `package-lock.json`.

## Arquitectura

El proyecto utiliza **Clean Architecture adaptada a Next.js**, organizada por capas. El objetivo es que las reglas del negocio puedan evolucionar sin quedar acopladas a React, las rutas de Next.js o la estructura de documentos de Firebase.

No es una separación por módulos independientes: partidos, jornadas, noticias y posiciones comparten las mismas capas y convenciones.

```text
App Router / UI
       │
       ▼
Presentation
       │
       ▼
Domain ◄── contratos ── Data
                         │
                         ▼
                     Firestore

Core configura Firebase, constantes y servicios transversales.
```

### Flujo de una operación

Por ejemplo, al actualizar el marcador de un partido:

```text
Página o componente
       │ solicita la acción
       ▼
Servicio de dominio
       │ aplica reglas y usa una interfaz
       ▼
Repositorio de Data
       │ convierte la entidad con un mapper
       ▼
Firestore
       │ notifica cambios en tiempo real
       ▼
UI actualizada
```

### Responsabilidad de cada capa

| Capa | Ubicación | Responsabilidad | Dependencias objetivo |
|---|---|---|---|
| Domain | `src/domain` | Entidades, reglas, contratos y servicios del negocio | TypeScript y código del propio dominio |
| Data | `src/data` | Persistencia, DTOs, mappers y repositorios concretos | Domain y Firebase |
| Presentation | `src/presentation` | Componentes, hooks, providers y estado visual | React, Domain y componentes UI |
| App | `src/app` | Rutas, layouts, API Routes y composición de la aplicación | Next.js y las capas anteriores |
| Core | `src/core` | Configuración e infraestructura transversal | Firebase y utilidades compartidas |
| UI base | `src/components/ui` | Primitivos visuales reutilizables | React, Radix UI y Tailwind CSS |

### Domain

`src/domain` contiene:

- Entidades y reglas del negocio.
- Interfaces de repositorios.
- Servicios de aplicación, como el manejo del estado de partidos.

Su frontera objetivo evita dependencias de componentes visuales e implementaciones concretas de Firestore.

### Data

`src/data` implementa los contratos definidos por el dominio:

- Repositorios de Firestore.
- DTOs que representan documentos persistidos.
- Mappers entre DTOs y entidades.

Esta capa aísla al dominio de los nombres y formatos utilizados por Firebase.

### Presentation

`src/presentation` contiene componentes de features, layout, providers y hooks. Consume servicios e interfaces del dominio y presenta sus resultados.

### App

`src/app` utiliza el App Router de Next.js para definir:

- Rutas públicas y protegidas.
- Layouts y estados de carga/error.
- API Routes con responsabilidades de servidor.

`src/proxy.ts` protege `/dashboard/*` comprobando la cookie de sesión.

### Core

`src/core` centraliza la configuración del Firebase Client SDK, Firebase Admin, colecciones de Firestore y constantes compartidas.

### Reglas de dependencia objetivo

- El dominio debe evitar imports de Firebase, Next.js y componentes React.
- Data depende de los contratos del dominio, no al revés.
- La UI no debe acceder directamente a documentos de Firestore cuando existe un repositorio.
- Firebase Admin solo se utiliza en código de servidor.
- La conversión entre `Timestamp` y `Date` corresponde a los mappers.

La separación todavía no es estricta en todos los servicios: `clausura-generator.service.ts` utiliza tipos y operaciones de Firestore directamente, y algunos tipos compartidos provienen de Core. Extraer esas dependencias detrás de interfaces es una mejora arquitectónica pendiente. Documentar la diferencia entre arquitectura objetivo y estado real evita presentar como terminado un desacoplamiento que aún está en evolución.

## Decisiones técnicas y trade-offs

Un README de ingeniería debe explicar no solo qué tecnologías se eligieron, sino también por qué y qué costo tiene cada decisión.

| Decisión | Motivo | Trade-off y control aplicado |
|---|---|---|
| Firestore como base operativa | Ofrece listeners en tiempo real y elimina la necesidad de administrar infraestructura de base de datos | Introduce acoplamiento al proveedor; DTOs, mappers e interfaces de repositorio contienen ese acoplamiento dentro de Data |
| Tablas de posiciones materializadas | Leer una tabla precalculada es más rápido que recorrer todos los partidos en cada consulta | Los datos derivados pueden desincronizarse; se usan lotes, recálculo del Acumulado y una herramienta de reconstrucción auditable |
| Escrituras batched para equipos relacionados | Local y visitante deben cambiar como una sola unidad dentro de la tabla del torneo | El Acumulado se recalcula en un lote posterior, por lo que existe una ventana breve de consistencia eventual |
| Firebase Client y Admin separados | El cliente necesita interactividad en tiempo real; las credenciales privilegiadas deben permanecer en servidor | Obliga a revisar cuidadosamente qué operación pertenece a cada entorno y a proteger cada endpoint privilegiado |
| App Router con segmentos | Permite layouts anidados y estados de carga/error cercanos a cada ruta | Requiere distinguir componentes cliente y servidor para evitar enviar JavaScript innecesario al navegador |
| Suscripciones en tiempo real selectivas | Los marcadores y posiciones necesitan reflejar cambios inmediatamente | Cada listener tiene costo y ciclo de vida; los repositorios retornan funciones de desuscripción y las consultas se limitan por pantalla |
| Un repositorio full-stack | Simplifica tipos compartidos, despliegue y evolución de un equipo pequeño | Si el backend crece en complejidad o consumidores, puede justificarse extraer una API dedicada, por ejemplo con NestJS |
| `develop` y `main` | Separa integración continua de la versión productiva | Agrega pasos de merge y sincronización; los hotfix de `main` deben regresar a `develop` |

### Fronteras de ejecución

```text
NAVEGADOR
├── React Client Components
├── Firebase Authentication
├── Firestore listeners
└── TanStack Query / estado de UI

SERVIDOR NEXT.JS
├── API Routes
├── Firebase Admin SDK
├── Creación y limpieza de cookie de sesión
└── Notificaciones FCM y operaciones privilegiadas

PLATAFORMA
├── Firebase: Auth, Firestore y Cloud Messaging
└── Vercel: build, previews, producción y dominios
```

## Estructura del proyecto

El siguiente árbol muestra las carpetas relevantes y su función dentro de la arquitectura:

```text
liga1-admin-next/
├── public/                                # Recursos estáticos
├── scripts/
│   ├── run-next.mjs                   # Ejecución controlada de Next.js
│   ├── verify-env.mjs                 # Verificación de variables
│   └── rebuild-clausura-standings.mjs # Recuperación de posiciones
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/                # Inicio de sesión
│   │   ├── (dashboard)/
│   │   │   └── dashboard/
│   │   │       ├── partidos/          # Gestión de partidos
│   │   │       ├── jornadas/          # Gestión de jornadas
│   │   │       ├── posiciones/        # Tablas de posiciones
│   │   │       ├── noticias/          # Gestión de noticias
│   │   │       └── configuracion/     # Cuenta y administración
│   │   └── api/                       # Endpoints de servidor
│   │       ├── auth/                 # Sesión y logout
│   │       ├── admin/                # Operaciones administrativas
│   │       ├── push-notifications/   # Envío de notificaciones
│   │       └── stats/                # Estadísticas del sistema
│   ├── components/
│   │   └── ui/                        # Componentes visuales base
│   ├── core/
│   │   └── config/                    # Firebase y constantes
│   ├── data/
│   │   ├── dtos/                      # Documentos de Firestore tipados
│   │   ├── mappers/                   # Conversión DTO ↔ entidad
│   │   └── repositories/              # Acceso concreto a Firestore
│   ├── domain/
│   │   ├── entities/                  # Entidades y reglas del negocio
│   │   ├── repositories/              # Contratos de persistencia
│   │   └── services/                  # Casos de uso y orquestación
│   ├── lib/                        # Utilidades generales de la app
│   ├── presentation/
│   │   ├── components/
│   │   │   ├── features/              # Componentes por funcionalidad
│   │   │   ├── layout/                # Sidebar, navbar y estructura
│   │   │   └── shared/                # Componentes compartidos
│   │   ├── hooks/                     # Hooks de presentación
│   │   └── providers/                 # Auth, tema y React Query
│   └── proxy.ts                   # Protección de /dashboard
├── .env.example                       # Plantilla de variables
├── next.config.ts                     # Configuración de Next.js
├── tsconfig.json                      # Configuración TypeScript
├── eslint.config.mjs                  # Reglas de lint
├── package.json                       # Scripts y dependencias
├── README.md                          # Documentación técnica
└── CHANGELOG.md                       # Historial de cambios
```

Los archivos `page.tsx`, `layout.tsx`, `loading.tsx` y `error.tsx` dentro de `src/app` siguen las convenciones de Next.js. Los componentes reutilizables y la lógica de negocio deben mantenerse fuera de las páginas para conservar la separación entre capas.

## Modelo de datos en Firestore

Firestore es la fuente de datos de la aplicación. Los DTOs de `src/data/dtos` representan la estructura persistida y los mappers de `src/data/mappers` la convierten a las entidades utilizadas por el dominio.

### Jerarquía de colecciones

```text
firestore
├── jornadas/{jornadaId}
│   └── matches/{matchId}
├── apertura/{teamId}
├── clausura/{teamId}
├── acumulado/{teamId}
├── news/{newsId}
└── admins/{uid}
```

| Colección | Responsabilidad |
|---|---|
| `jornadas` | Calendario del Apertura y Clausura |
| `jornadas/{id}/matches` | Partidos y sus estados/marcadores |
| `apertura` | Posiciones del Torneo Apertura |
| `clausura` | Posiciones del Torneo Clausura |
| `acumulado` | Suma de Apertura y Clausura |
| `news` | Noticias publicadas o en borrador |
| `admins` | Usuarios autorizados y roles |

### Documento de jornada

Ruta de ejemplo: `jornadas/clausura_01`.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `fechaInicio` | `Timestamp` | Sí | Fecha y hora de inicio de la jornada |
| `mostrar` | `boolean` | Sí | Determina si se muestra en la aplicación |
| `fechaFin` | `Timestamp` | No | Fecha y hora de cierre |
| `esActiva` | `boolean` | No | Marca la jornada activa |
| `torneo` | `"apertura" \| "clausura"` | No | Puede inferirse desde el ID |
| `numero` | `number` | No | Puede inferirse desde el ID |

Los documentos existentes pueden almacenar solamente `fechaInicio` y `mostrar`. `JornadaMapper` obtiene el torneo y número desde IDs como `apertura_01` o `clausura_15`.

### Documento de partido

Ruta de ejemplo: `jornadas/clausura_01/matches/ali_uni`.

| Campo | Tipo | Descripción |
|---|---|---|
| `equipoLocalId` | `string \| null` | Código del equipo local; también puede inferirse desde el ID |
| `equipoVisitanteId` | `string \| null` | Código del visitante |
| `fecha` | `Timestamp` | Fecha y hora programada |
| `golesEquipoLocal` | `number` | Goles del equipo local |
| `golesEquipoVisitante` | `number` | Goles del visitante |
| `estado` | `string` | `pendiente`, `envivo`, `finalizado`, `anulado` o `suspendido` |
| `suspendido` | `boolean` | Indicador operativo de suspensión |
| `estadio` | `string` opcional | Lugar del partido |
| `jornadaNumero` | `number` opcional | Número de jornada |
| `horaInicio` | `Timestamp` opcional | Inicio efectivo del encuentro |
| `primeraParte` | `boolean` opcional | Indica si transcurre el primer tiempo |
| `enDescanso` | `boolean` opcional | Indica si el encuentro está en descanso |
| `horaInicioSegundaParte` | `Timestamp` opcional | Inicio efectivo del segundo tiempo |
| `tiempoAgregadoPrimeraParte` | `number` opcional | Adición del primer tiempo |
| `tiempoAgregado` | `number` opcional | Adición del segundo tiempo |

El ID habitual combina los equipos (`ali_uni`). Si los campos de equipo no existen, `MatchMapper` los extrae de ese ID.

### Documento de posiciones

Las colecciones `apertura`, `clausura` y `acumulado` comparten la misma estructura. El ID del documento es el código del equipo, por ejemplo `uni`.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre del equipo |
| `city` | `string` | Ciudad |
| `stadium` | `string` | Estadio |
| `logo` | `string` | URL, ruta o identificador del escudo |
| `matchesPlayed` | `number` | Partidos jugados |
| `matchesWon` | `number` | Partidos ganados |
| `matchesDrawn` | `number` | Partidos empatados |
| `matchesLost` | `number` | Partidos perdidos |
| `goalsScored` | `number` | Goles a favor |
| `goalsAgainst` | `number` | Goles en contra |
| `goalDifference` | `number` | Diferencia de goles |
| `points` | `number` | `matchesWon * 3 + matchesDrawn` |

`apertura` y `clausura` se calculan de forma independiente. `acumulado` suma las estadísticas de ambos torneos.

### Documento de noticia

Ruta de ejemplo: `news/{newsId}`.

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | `string` | Título |
| `contenido` | `string` | Contenido principal |
| `imagenUrl` | `string` opcional | Imagen asociada |
| `fechaPublicacion` | `Timestamp` | Fecha de publicación |
| `publicada` | `boolean` | Indica si está publicada o permanece como borrador |
| `autor` | `string` opcional | Autor o fuente |
| `categoria` | `string` opcional | Categoría editorial |
| `tags` | `string[]` opcional | Etiquetas |
| `urlExterna` | `string` opcional | Enlace a una fuente externa |

### Documento de administrador

Ruta de ejemplo: `admins/{uid}`. El ID debe coincidir con el UID de Firebase Authentication.

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | `string` | Correo del usuario |
| `displayName` | `string` opcional | Nombre visible |
| `photoURL` | `string` opcional | Fotografía de perfil |
| `role` | `"admin" \| "viewer"` | Nivel de acceso |
| `createdAt` | `Timestamp` | Fecha de creación |
| `lastLoginAt` | `Timestamp` opcional | Último acceso registrado |

### Convenciones e integraciones

- Las jornadas utilizan IDs como `apertura_01` y `clausura_01`.
- Los partidos utilizan IDs formados por los códigos de sus equipos, por ejemplo `ali_uni`.
- Las fechas se almacenan como `Timestamp` y se convierten a `Date` en la capa de datos.
- Las tablas de Apertura y Clausura se calculan de forma independiente.
- `acumulado` se recalcula sumando ambas tablas.

Firebase Authentication gestiona la identidad. Firebase Admin valida sesiones y ejecuta operaciones privilegiadas en el servidor. Firebase Cloud Messaging entrega las notificaciones push.

## Ejecución local con npm

### Requisitos

- Node.js 20.9 o superior.
- npm 10 o superior.
- Proyecto Firebase configurado.
- Credenciales de Firebase Admin para utilizar todas las API Routes.

### Primera ejecución

```bash
git clone <url-del-repositorio>
cd liga1-admin-next
npm install
cp .env.example .env.local
```

Completar `.env.local` y verificar la configuración:

```bash
npm run verify-env
```

Iniciar Next.js en modo desarrollo:

```bash
npm run dev
```

Abrir en el navegador:

- Aplicación: [http://localhost:3000](http://localhost:3000)
- Login: [http://localhost:3000/login](http://localhost:3000/login)
- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

El proceso continúa activo en la terminal y recompila al guardar cambios. Para detenerlo, presionar `Ctrl + C`.

### Ejecuciones posteriores

Cuando las dependencias y `.env.local` ya existen:

```bash
cd liga1-admin-next
npm run dev
```

Si `package-lock.json` cambió después de actualizar la rama, ejecutar `npm install` antes de iniciar.

### Probar localmente el modo producción

```bash
npm run build
npm run start
```

`npm run start` utiliza el build generado y también sirve la aplicación normalmente en [http://localhost:3000](http://localhost:3000).

Los comandos deben ejecutarse desde la raíz del repositorio para que Next.js y Tailwind resuelvan correctamente sus dependencias.

## Variables de entorno

Usar [`.env.example`](./.env.example) como plantilla. `.env.local` no debe incluirse en Git.

### Firebase Client SDK

Estas variables se incorporan al bundle del navegador:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Firebase Admin SDK

Estas variables son privadas y solo deben existir en entornos de servidor:

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

La clave privada debe conservar los saltos de línea escapados como `\n` cuando se configura en un proveedor de hosting.

## Scripts

| Comando | Propósito |
|---|---|
| `npm run dev` | Inicia Next.js en desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run start` | Sirve localmente un build generado |
| `npm run lint` | Ejecuta ESLint |
| `npm run verify-env` | Comprueba las variables requeridas |
| `npm run repair:clausura` | Compara la tabla con los partidos finalizados sin escribir |
| `npm run repair:clausura -- --apply` | Reconstruye Clausura y Acumulado en Firestore |

El comando con `--apply` es una herramienta operativa de recuperación. No forma parte del flujo normal de cada partido y debe ejecutarse sin encuentros en vivo, después de revisar la vista previa.

### Validación antes de un PR

```bash
npm run lint
npx tsc --noEmit
npm run build
```

El build necesita las variables de entorno requeridas.

## Calidad, seguridad y confiabilidad

### Controles implementados

| Área | Control actual |
|---|---|
| Tipado | TypeScript estricto con verificaciones adicionales de null, índices y tipos implícitos |
| Estática | ESLint con reglas de Next.js Core Web Vitals y TypeScript |
| Errores de UI | Error boundaries y estados de carga por segmento del App Router |
| Datos | Validación de marcadores, estados de partido y existencia de equipos antes de escribir |
| Atomicidad | `writeBatch` para cambios relacionados dentro de una tabla |
| Recuperación | Vista previa y reconstrucción protegida de posiciones desde partidos finalizados |
| Sesiones | Cookie `httpOnly`, `sameSite=lax`, expiración de cinco días y `secure` en producción |
| Secretos | Variables privadas sin prefijo `NEXT_PUBLIC_` y Firebase Admin limitado al servidor |
| Entrega | Preview de cada rama/PR y despliegue productivo separado en Vercel |

### Integridad de la tabla de posiciones

Las posiciones son una vista materializada: se guardan para ofrecer lecturas rápidas, pero su fuente funcional son los resultados de los partidos.

```text
Partido finalizado
       │
       ├──► estadísticas del torneo (Apertura o Clausura)
       │
       └──► Acumulado = Apertura + Clausura
```

Principios aplicados:

- Apertura y Clausura nunca utilizan la tabla del otro torneo como base.
- Los puntos se derivan de `partidosGanados * 3 + partidosEmpatados`.
- Los dos equipos de un partido se actualizan juntos mediante un batch.
- La reconstrucción del Clausura utiliza solamente partidos finalizados de jornadas `clausura_*`.
- La herramienta de reparación se detiene si hay partidos en vivo o no existen resultados finalizados.

### Modelo de seguridad actual

1. Firebase Authentication valida las credenciales en el cliente.
2. El cliente intercambia el ID token por una cookie de sesión mediante `/api/auth/session`.
3. La cookie se configura como `httpOnly` y no puede leerse desde JavaScript del navegador.
4. `src/proxy.ts` controla el acceso inicial a `/dashboard/*`.
5. Firebase Admin ejecuta en el servidor las acciones que requieren privilegios.

La seguridad no debe depender solamente de ocultar rutas en la UI. Las reglas de Firestore y la verificación de la cookie en endpoints privilegiados forman parte del hardening prioritario descrito en el roadmap.

### Rendimiento

- Lecturas independientes se paralelizan con `Promise.all`.
- Las pantallas usan listeners solo cuando necesitan actualización inmediata.
- Las funciones de suscripción devuelven `unsubscribe` para liberar recursos al desmontar componentes.
- Las consultas de noticias pueden limitar el número de documentos.
- TanStack Query controla caché y revalidación según el tipo de pantalla.
- La tabla se consulta como datos materializados en vez de recalcular todos los partidos durante cada render.

### Criterio de finalización de una tarea

Un cambio está listo para PR cuando:

- La implementación respeta las fronteras arquitectónicas.
- TypeScript no reporta errores nuevos.
- Lint y build fueron ejecutados y sus resultados quedaron documentados.
- Se revisaron estados de carga, error y ausencia de datos.
- Se probó el comportamiento principal y sus casos límite.
- El Preview Deployment fue validado antes de llegar a `main`.
- Los cambios de esquema, variables o operación quedaron documentados.

## Flujo de trabajo con Git

El repositorio utiliza `develop` como rama de integración y `main` como rama de producción.

| Tipo de trabajo | Rama base | Destino del PR |
|---|---|---|
| Nueva funcionalidad | `develop` | `develop` |
| Fix de la siguiente versión | `develop` | `develop` |
| Estabilización de versión | `develop` → `release/*` | `main` y posteriormente `develop` |
| Hotfix de producción | `main` | `main` y posteriormente `develop` |

Ejemplo para una tarea normal:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/nombre-descriptivo
```

Después de implementar y validar:

```bash
git add <archivos>
git commit -m "feat(area): describir cambio"
git push -u origin feature/nombre-descriptivo
```

Se abre un PR hacia `develop`. Cuando el conjunto de cambios está listo para producción, se abre un PR de `develop` hacia `main`.

Reglas recomendadas:

- Proteger `main` y `develop`; no hacer push directo.
- Exigir PR y verificaciones exitosas.
- No hacer rebase ni force push sobre ramas compartidas.
- Se puede usar squash para `feature/* → develop`.
- Para `develop` o `release/* → main`, preferir un merge commit.
- Todo hotfix de `main` debe regresar a `develop` mediante un back-merge.
- Eliminar las ramas temporales después del merge.

## Despliegue en Vercel

No es necesario ejecutar `vercel --prod` para el flujo normal: GitHub y la integración de Vercel realizan el despliegue automáticamente cuando el cambio llega a la rama configurada.

### Configuración inicial del proyecto

1. Importar el repositorio desde GitHub en Vercel.
2. Seleccionar Next.js como Framework Preset.
3. Configurar como Root Directory la raíz que contiene `package.json`.
4. Mantener `npm run build` como Build Command.
5. Registrar todas las variables del Firebase Client y Admin SDK.
6. Configurar `main` como Production Branch en:

   ```text
   Project Settings → Environments → Production → Branch Tracking
   ```

7. Configurar también las variables necesarias para Preview si se probarán PRs contra Firebase.

El repositorio no contiene `vercel.json`; la rama de producción, dominios y variables se administran desde el proyecto de Vercel.

Esta configuración se realiza una sola vez. Para los despliegues siguientes se utiliza el flujo de Pull Requests descrito a continuación.

### Flujo de despliegue

```text
feature/* o fix/*
        │
        ▼
 PR hacia develop ──► Preview Deployment
        │
        ▼
      develop
        │
        ▼
 PR hacia main
        │
        ▼
       main ──► Production Deployment ──► dominio público
```

Con la integración de Git habilitada:

- Cada push o PR de una rama distinta de `main` genera normalmente un Preview Deployment.
- El merge hacia `main` inicia un Production Deployment.
- Vercel actualiza el dominio productivo solamente cuando el build termina correctamente.

### Publicar un cambio existente

1. Subir la rama de trabajo a GitHub y abrir un PR hacia `develop`.
2. Esperar que Vercel publique el Preview Deployment asociado al PR.
3. Abrir la URL del preview y ejecutar las pruebas funcionales.
4. Aprobar y fusionar el PR hacia `develop`.
5. Cuando `develop` esté listo para publicarse, abrir un nuevo PR `develop → main`.
6. Confirmar en GitHub que las verificaciones y el build hayan pasado.
7. Fusionar el PR hacia `main`.
8. Entrar a `Vercel → Project → Deployments` y localizar el deployment de `main`.
9. Esperar hasta que su estado cambie a `Ready`; si aparece `Error`, revisar los Build Logs.
10. Abrir el dominio de producción y verificar el cambio.
11. Si `main` recibió cambios exclusivos, sincronizarlos nuevamente hacia `develop`.

Resumen:

```text
push de rama → Preview de Vercel → PR a develop
develop aprobado → PR a main → Producción en Vercel
```

Las variables de entorno se leen durante el build. Si se agrega o modifica una variable en Vercel, se debe generar un nuevo deployment para que el cambio tenga efecto.

### Rollback

Si una publicación falla funcionalmente:

- Revertir el PR en GitHub y fusionar el revert hacia `main`, o
- Promover nuevamente un deployment estable desde el panel de Vercel.

Después de un rollback se debe sincronizar el estado resultante de `main` hacia `develop` para evitar reintroducir el problema.

## Operación y recuperación

La tabla del Clausura puede auditarse sin modificar datos:

```bash
npm run repair:clausura
```

Si la vista previa detecta diferencias y no existen partidos en vivo, un administrador con credenciales válidas puede reconstruirla:

```bash
npm run repair:clausura -- --apply
```

El script usa como fuente de verdad los partidos finalizados de jornadas `clausura_*`, recalcula todas las estadísticas y actualiza también el Acumulado.

## Seguridad

- Nunca subir `.env.local`, cuentas de servicio ni claves privadas.
- No utilizar variables `FIREBASE_ADMIN_*` en componentes cliente.
- Mantener las reglas de Firestore y los usuarios de `admins` con el mínimo privilegio necesario.
- Revisar que Preview y Production utilicen las variables y proyectos Firebase esperados.
- Proteger las ramas principales y exigir verificaciones antes del merge.

## Limitaciones conocidas y roadmap

Esta sección diferencia capacidades existentes de mejoras planificadas. No deben interpretarse los siguientes puntos como funcionalidades ya implementadas.

### Prioridad 0 — seguridad

- Verificar criptográficamente la cookie con Firebase Admin en cada API Route privilegiada; actualmente el proxy comprueba su presencia para el acceso al dashboard.
- Autorizar cada operación según el rol almacenado en `admins`, no solo según la visibilidad de los controles en la UI.
- Versionar y probar las reglas de Firestore dentro del repositorio.
- Incorporar protección adicional para operaciones administrativas sensibles y un registro de auditoría.

### Prioridad 1 — calidad automatizada

- Resolver la deuda existente de ESLint y establecer una línea base sin errores.
- Agregar GitHub Actions con `npm ci`, lint, verificación de tipos y build por cada PR.
- Incorporar pruebas unitarias para reglas del dominio, especialmente transiciones de marcador y cálculo de posiciones.
- Agregar pruebas de integración con Firebase Emulator Suite para repositorios, sesiones y reglas.
- Agregar pruebas end-to-end de los flujos críticos con Playwright.

### Prioridad 1 — concurrencia e integridad

- Evaluar transacciones para operaciones que calculan un valor a partir del estado leído y pueden recibir actualizaciones concurrentes.
- Reducir la ventana de consistencia eventual entre la tabla del torneo y el Acumulado.
- Hacer idempotentes las operaciones administrativas de mayor impacto.

### Prioridad 2 — observabilidad y operación

- Incorporar logs estructurados con identificadores de jornada, partido, usuario y deployment.
- Centralizar excepciones y alertas con una herramienta de error tracking.
- Definir métricas operativas: errores de actualización, latencia, lecturas de Firestore y fallos de notificación.
- Agregar health checks y una guía de respuesta a incidentes.

### Prioridad 2 — evolución arquitectónica

- Retirar dependencias directas de Firebase que aún permanecen en servicios del dominio.
- Centralizar la composición de repositorios y servicios mediante inyección de dependencias.
- Extraer una API backend dedicada solo si aparecen múltiples clientes, procesos asíncronos complejos o necesidades de escalado independiente. NestJS sería una alternativa razonable en ese escenario, pero no una dependencia necesaria para el alcance actual.

## Referencias técnicas

Las decisiones y mejoras propuestas se contrastaron con documentación primaria:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js: estructura y organización del proyecto](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js: Server y Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js: checklist de producción](https://nextjs.org/docs/app/guides/production-checklist)
- [Firebase: transacciones y batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Vercel: despliegues desde Git](https://vercel.com/docs/git)
- [Vercel: entornos Local, Preview y Production](https://vercel.com/docs/deployments/overview)
- [GitHub: protección de ramas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

## Historial de cambios

Los cambios relevantes se documentan en [`CHANGELOG.md`](./CHANGELOG.md).

## Licencia

Proyecto privado para uso interno.
