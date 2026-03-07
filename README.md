# Liga 1 Admin – Panel Web Administrativo

Panel de administración web para gestionar la **Liga 1 de Fútbol Peruano**: partidos, jornadas, noticias, tabla de posiciones y configuración, con actualizaciones en tiempo real y notificaciones push.

---

## Contenido (índice)

| Sección | Qué encontrarás |
|--------|------------------|
| [Descripción](#descripción) | Qué es el proyecto y qué hace. |
| [Qué aprovechamos del framework (Next.js 16)](#qué-aprovechamos-del-framework-nextjs-16) | App Router, loading/error, proxy, API Routes, Turbopack. |
| [Firebase como backend de datos](#firebase-como-backend-de-datos) | Uso de Auth, Firestore y Admin SDK. |
| [Stack técnico](#stack-técnico) | Frameworks, librerías y herramientas (Next, React, Tailwind, Firebase, React Query, etc.). |
| [Arquitectura del proyecto](#arquitectura-del-proyecto) | Capas (domain, data, presentation, core, app) y Clean Architecture. |
| [Estructura de carpetas](#estructura-de-carpetas-resumen) | Árbol de `src/` y qué hay en cada carpeta. |
| [Navegación](#navegación) | Cómo funcionan las rutas, el sidebar y la protección (proxy, login → dashboard). |
| [Secciones de la web](#secciones-de-la-web) | Para qué sirve cada pantalla del panel (login, dashboard, partidos, jornadas, noticias, posiciones, configuración). |
| [Requisitos / Instalación / Variables / Scripts](#requisitos) | Cómo instalar, configurar y ejecutar. |
| [Firestore – Colecciones y documentos](#firestore--colecciones-y-documentos) | Jornadas, partidos, apertura/clausura: estructura de colecciones, documentos y fechas/horas. |
| [Funcionalidades principales](#funcionalidades-principales) | Listado de features. |
| [Build y despliegue](#build-y-despliegue) | Compilar y desplegar. |

---

## Descripción

Aplicación web interna para administradores. Incluye autenticación protegida por sesión, dashboard con resumen y gestión de partidos (en vivo y por editar), jornadas, noticias, posiciones y configuración. **Todos los datos viven en Firebase**: autenticación con Firebase Auth y persistencia en Firestore; el panel es cliente Next.js que consume y actualiza esos datos.

---

## Qué aprovechamos del framework (Next.js 16)

El proyecto está alineado con las convenciones de Next.js 16 para no introducir deuda técnica y sacar partido al ecosistema:

- **App Router**  
  Rutas bajo `src/app/` con layouts por segmento: `(auth)` para login, `(dashboard)` para el panel. Un solo layout del dashboard envuelve todas las páginas internas (sidebar, navbar, contenido).

- **Estados de UI integrados**  
  `loading.tsx` y `error.tsx` por segmento (raíz, auth, login, dashboard y cada subruta). Suspense muestra “Cargando…” y los errores muestran mensaje + “Reintentar”. `not-found.tsx` global para 404 con enlace a login.

- **Protección de rutas con proxy (Next 16)**  
  En lugar de middleware clásico se usa la convención **proxy**: `src/proxy.ts` redirige a `/login` si no hay cookie de sesión en rutas `/dashboard/*`. La sesión se crea en el servidor vía API (`/api/auth/session`) con Firebase Admin; el cliente solo redirige cuando la cookie está lista.

- **API Routes para lógica de servidor**
  `POST /api/auth/session` (crear cookie de sesión), `POST /api/auth/logout` (borrar cookie), `/api/push-notifications/send` para notificaciones y `GET /api/stats/users` para el conteo real de usuarios registrados. Firebase Admin solo se usa en servidor (API routes y proxy).

- **Turbopack**  
  Desarrollo y build con Turbopack por defecto; no hay configuración webpack custom.

- **React 19**  
  Uso de React 19 con el modelo de componentes y hooks actual.

---

## Firebase como backend de datos

**Todos los datos de la aplicación están en Firebase.** No hay otra base de datos.

- **Firebase Auth**  
  Login con email/contraseña (y preparado para Google). El cliente usa el SDK de Firebase; el servidor usa Firebase Admin para crear la cookie de sesión a partir del `idToken` y para validar la sesión en el proxy.

- **Firestore**  
  Persistencia principal: jornadas y partidos (estado, marcador, tiempo, tiempo agregado), tabla de posiciones (apertura/clausura), noticias, usuarios autorizados (admins). Los repositorios en `src/data/repositories/` leen y escriben en Firestore; la capa de dominio no conoce Firestore, solo interfaces de repositorios.

- **Firebase Admin SDK**  
  Solo en el servidor (Node): creación de sesión (cookie), logout y envío de notificaciones push (FCM). Las variables `FIREBASE_ADMIN_*` no se exponen al navegador.

La capa de datos (`data/`) traduce entre el modelo de dominio (entidades) y el modelo de Firestore (DTOs) mediante mappers; así el dominio sigue siendo agnóstico del proveedor de base de datos.

---

## Stack técnico

### Framework y lenguaje

- **Next.js 16.1.6** – App Router, Turbopack, proxy, API Routes.
- **React 19.2.3** – UI y hooks.
- **TypeScript 5** – Tipado estricto.

### UI y estilos

- **Tailwind CSS 4** – Utilidades y tema (incl. `@tailwindcss/postcss`, `tw-animate-css`).
- **Radix UI** – Primitivos (Dialog, Select, Tabs, Dropdown, etc.).
- **Componentes tipo shadcn** – En `src/components/ui/` (Button, Card, Input, Table, etc.).
- **Lucide React** – Iconos.
- **class-variance-authority**, **tailwind-merge**, **clsx** – Variantes y clases.
- **Sonner** – Toasts.
- **next-themes** – Tema claro/oscuro (si se usa).

### Backend y datos

- **Firebase Auth** – Autenticación en el cliente.
- **Firestore** – Base de datos; lecturas/escrituras desde el cliente (repositorios).
- **Firebase Admin SDK** – Servidor: sesión, logout, FCM.

### Estado y caché

- **TanStack Query (React Query) v5** – Caché de datos del servidor (dashboard, partidos, jornadas, noticias, posiciones); `staleTime` para no refetchear en cada cambio de sección.
- **Zustand** – Estado global ligero cuando se necesite.

### Utilidades

- **date-fns** – Fechas.
- **Script `verify-env`** – Comprueba variables de entorno antes de correr la app.

---

## Requisitos

- **Node.js** 18+ (recomendado 20 LTS).
- **npm** 10+ (o pnpm/yarn).

---

## Instalación y uso

1. Clonar y entrar en la carpeta del proyecto:

   ```bash
   cd liga1-admin-next
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Configurar variables de entorno (ver sección siguiente). Copiar `.env.example` a `.env.local` y completar valores.

4. Verificar variables (opcional):

   ```bash
   npm run verify-env
   ```

5. Desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

6. Producción:

   ```bash
   npm run build
   npm run start
   ```

**Importante:** Ejecutar siempre `npm run dev`, `npm run build` y `npm start` desde la **raíz del proyecto** (`liga1-admin-next`). Ejecutar desde una carpeta padre puede provocar errores de resolución de módulos (p. ej. Tailwind).

---

## Variables de entorno

Crear **`.env.local`** en la raíz. Usar `.env.example` como plantilla.

### Firebase Client SDK (público – navegador)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API Key del proyecto Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Auth (ej. `proyecto.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID para FCM |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID de Firebase |

### Firebase Admin SDK (privado – solo servidor)

| Variable | Descripción |
|----------|-------------|
| `FIREBASE_ADMIN_PROJECT_ID` | Mismo project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Email de la cuenta de servicio |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Clave privada (respeta `\n` como salto de línea) |

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | ESLint |
| `npm run verify-env` | Verificar variables de entorno |

---

## Arquitectura del proyecto

Arquitectura en capas (Clean Architecture): dominio independiente de frameworks y base de datos; Firebase y Next son detalles de implementación.

- **Domain** (`src/domain/`): entidades, interfaces de repositorios y servicios. Sin dependencias de Next ni Firestore.
- **Data** (`src/data/`): implementación de repositorios contra Firestore, DTOs y mappers (entidad ↔ Firestore).
- **Presentation** (`src/presentation/`): providers (auth, React Query), componentes de layout y features, hooks.
- **Core** (`src/core/`): configuración (Firebase cliente y admin, constantes de Firestore/FCM).
- **App** (`src/app/`): rutas, layouts, loading/error/not-found y API routes; orquesta la UI y el proxy.

Inversión de dependencias: la presentación y la app dependen de interfaces del dominio; la capa de datos implementa esas interfaces usando Firestore.

---

## Estructura de carpetas (resumen)

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login y rutas públicas
│   ├── (dashboard)/        # Dashboard y subrutas (partidos, jornadas, noticias, posiciones, config)
│   ├── api/                # API Routes (auth/session, auth/logout, push-notifications, stats/users)
│   ├── layout.tsx, loading.tsx, error.tsx, not-found.tsx
│   └── page.tsx            # Página raíz
├── core/config/             # Firebase (cliente + admin), constantes Firestore/FCM
├── domain/                  # Entidades, interfaces de repositorios/servicios
├── data/                    # Repositorios (Firestore), DTOs, mappers
├── presentation/            # Providers, componentes (layout, features, shared), hooks
├── components/ui/           # Componentes UI base (botones, inputs, tablas, etc.)
├── lib/                     # Utilidades
└── proxy.ts                 # Proxy Next 16 – protección de /dashboard
```

---

## Navegación

- **Rutas públicas (sin sesión):**  
  `/` (página raíz) y `/login`. Cualquiera puede acceder. Si el usuario ya tiene sesión, la página de login redirige a `/dashboard`.

- **Rutas protegidas:**  
  Todo lo que está bajo `/dashboard/*` (dashboard principal, partidos, jornadas, noticias, posiciones, configuración). El **proxy** (`src/proxy.ts`) se ejecuta antes de servir esas rutas: si no hay cookie de sesión `__session`, responde con una redirección a `/login?from=...`. La cookie se crea en el servidor al hacer login vía `POST /api/auth/session`.

- **Cómo se navega dentro del panel:**  
  El **layout del dashboard** (`src/app/(dashboard)/layout.tsx`) renderiza el **DashboardLayout** (sidebar + navbar + área de contenido). El **sidebar** tiene enlaces a cada sección usando `next/link`: `/dashboard`, `/dashboard/partidos`, `/dashboard/jornadas`, `/dashboard/noticias`, `/dashboard/posiciones`, `/dashboard/configuracion`. Al hacer clic se hace navegación client-side (App Router); cada ruta tiene su `page.tsx`, y opcionalmente `loading.tsx` y `error.tsx` para ese segmento.

- **Tras el login:**  
  El cliente (AuthProvider) llama a `/api/auth/session` con el `idToken` de Firebase; cuando el servidor responde con la cookie establecida, se actualiza el estado y se hace `router.push('/dashboard')`. El proxy ya ve la cookie y deja pasar a `/dashboard`.

- **Resumen:**  
  Rutas definidas por la estructura de carpetas en `src/app/`; protección con proxy por cookie; navegación entre secciones con `<Link>` y `router.push`; layout compartido para todo el dashboard.

---

## Secciones de la web

Cada sección del panel tiene un propósito claro. Así la persona que lea el README entiende **para qué sirve** cada pantalla.

| Sección | Ruta | Para qué sirve |
|--------|------|-----------------|
| **Login** | `/login` | Entrada al panel. Solo usuarios autorizados (registrados en Firestore en `admins`) pueden iniciar sesión con email y contraseña. Tras el login se crea la cookie de sesión y se redirige al dashboard. |
| **Dashboard (inicio)** | `/dashboard` | Página principal una vez dentro. Muestra un resumen: partidos del día/próximos, jornada actual, total real de usuarios registrados en la app móvil (consultado vía Firebase Admin Auth) y funcionalidades disponibles. |
| **Partidos** | `/dashboard/partidos` | Ver y gestionar partidos. Muestra tabs: En Vivo, Próximos, Finalizados y Suspendidos. Finalizados incluye partidos de **todas** las jornadas (independiente de si `mostrar` es true/false); Próximos y En Vivo solo muestran partidos de jornadas visibles (`mostrar: true`) con actualización en tiempo real. Permite iniciar, actualizar marcador, configurar tiempo agregado y finalizar partidos. |
| **Jornadas** | `/dashboard/jornadas` | Ver y gestionar jornadas del torneo (Apertura/Clausura). Lista jornadas con sus partidos; desde aquí se puede abrir una jornada para iniciar partidos o ver el estado. Las fechas de inicio/fin y si la jornada se muestra en la app se gestionan con los datos de la colección `jornadas`. |
| **Noticias** | `/dashboard/noticias` | Gestionar las noticias que consume la app (u otro canal). Crear, editar y listar noticias: título, imagen, categoría unificada (general, resultado, fixture, comunicado, destacado, partidos, fichajes, equipos, jugadores, tabla, estadísticas), medio, URL y estado (publicada/borrador). Los datos están en la colección `news`. |
| **Posiciones** | `/dashboard/posiciones` | Ver la tabla de posiciones (Apertura, Clausura o Acumulado). Muestra por equipo: partidos jugados, ganados, empatados, perdidos, goles a favor/en contra, diferencia y puntos. Se actualiza en tiempo real según los partidos; los datos vienen de las colecciones `apertura`, `clausura` y `acumulado`. |
| **Configuración** | `/dashboard/configuracion` | Ajustes del panel y del perfil de usuario. Permite editar el nombre (actualiza Firebase Auth), gestionar seguridad (reset de contraseña por email o info de cuenta Google), y ver información de la cuenta. Sección de configuración del sistema solo visible para administradores. |

Todas las secciones bajo `/dashboard/*` comparten el mismo layout: sidebar a la izquierda con enlaces a estas rutas, barra superior (navbar) y área de contenido a la derecha.

---

## Firestore – Colecciones y documentos

Todos los datos persistentes están en Firestore (proyecto configurado en `.env.local`). Las constantes de colecciones y los DTOs están en `src/core/config/firestore-constants.ts` y `src/data/dtos/`. Las fechas y horas se guardan como **Timestamp** de Firestore; en el dominio y en la UI se usan como **Date** (los mappers convierten). Para formatear fechas/días usamos **date-fns** y `src/lib/date-utils.ts` (por ejemplo `normalizeDate` para comparar solo día/mes/año en formato `YYYY-MM-DD`).

---

### Colecciones que usamos

| Colección | Uso |
|-----------|-----|
| **`jornadas`** | Una jornada por documento. ID con formato `{torneo}_{numero}` (ej. `apertura_01`, `clausura_15`). |
| **`jornadas/{jornadaId}/matches`** | Subcolección de partidos de esa jornada. Cada partido es un documento (ID ej. `ali_uni`). |
| **`apertura`** | Tabla de posiciones del Torneo Apertura. Un documento por equipo (ID = código del equipo, ej. `ali`, `uni`). |
| **`clausura`** | Igual que `apertura` para el Torneo Clausura. |
| **`acumulado`** | Tabla acumulada (apertura + clausura); misma estructura que apertura/clausura si se usa. |
| **`news`** | Noticias (título, imagen, categoría, estado, etc.). |
| **`admins`** | Usuarios autorizados (email, role: admin/viewer). |

---

### Estructura de jornadas

Cada documento en **`jornadas`** tiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `torneo` | `string` | `"apertura"` o `"clausura"` |
| `numero` | `number` | Número de jornada (1–38) |
| `mostrar` | `boolean` | Si la jornada se muestra en la app |
| `fechaInicio` | `Timestamp` | Fecha/hora de inicio de la jornada |
| `fechaFin` | `Timestamp` (opcional) | Fecha/hora de fin |
| `esActiva` | `boolean` (opcional) | Si es la jornada activa actual |

El **ID del documento** se arma así: `apertura_01`, `clausura_12`, etc. (torneo + número con 2 dígitos). Ver `generateJornadaId` en `src/domain/entities/jornada.entity.ts`.

---

### Estructura de partidos (subcolección `matches`)

Cada documento en **`jornadas/{jornadaId}/matches`** tiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `equipoLocalId` | `string` | Código del equipo local (ej. `ali`, `uni`) |
| `equipoVisitanteId` | `string` | Código del equipo visitante |
| `fecha` | `Timestamp` | Fecha y hora programada del partido |
| `golesEquipoLocal` / `golesEquipoVisitante` | `number` | Marcador |
| `estado` | `string` | `"pendiente"` \| `"envivo"` \| `"finalizado"` \| `"anulado"` \| `"suspendido"` |
| `suspendido` | `boolean` | Si está suspendido |
| `estadio` | `string` (opcional) | Nombre del estadio |
| `jornadaNumero` | `number` (opcional) | Número de jornada |
| **En vivo:** | | |
| `horaInicio` | `Timestamp` (opcional) | Cuándo pasó a "envivo" |
| `primeraParte` | `boolean` (opcional) | `true` = 1.er tiempo, `false` = 2.º tiempo |
| `enDescanso` | `boolean` (opcional) | Si está en descanso |
| `horaInicioSegundaParte` | `Timestamp` (opcional) | Inicio del 2.º tiempo |
| `tiempoAgregadoPrimeraParte` | `number` (opcional) | Minutos agregados al 1.er tiempo |
| `tiempoAgregado` | `number` (opcional) | Minutos agregados al 2.º tiempo |

El **minuto mostrado** en el timer se calcula en el dominio a partir de `horaInicio` (y `horaInicioSegundaParte` en 2.ª parte), con `date-fns`/Date; no se guarda un campo “minuto actual” en Firestore. Ver `getMatchElapsedMinutes`, `getFormattedMatchMinute`, `canFinishMatch`, etc. en `src/domain/entities/match.entity.ts`.

---

### Estructura de apertura / clausura (tabla de posiciones)

Cada documento en **`apertura`** o **`clausura`** (ID = código del equipo, ej. `hua`, `ali`, `uni`):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | `string` | Nombre completo del equipo |
| `city` | `string` | Ciudad |
| `stadium` | `string` | Estadio |
| `logo` | `string` | Código o path del logo |
| `matchesPlayed` | `number` | Partidos jugados |
| `matchesWon` | `number` | Ganados |
| `matchesDrawn` | `number` | Empatados |
| `matchesLost` | `number` | Perdidos |
| `goalsScored` | `number` | Goles a favor |
| `goalsAgainst` | `number` | Goles en contra |
| `goalDifference` | `number` | Diferencia de goles |
| `points` | `number` | Puntos (ganados×3 + empatados) |

La tabla se ordena por: partidos jugados (desc), puntos (desc), diferencia de goles (desc), goles a favor (desc). Al iniciar un partido se incrementa `matchesPlayed` en ambos equipos; durante/final del partido se actualizan goles, PG/PE/PP y puntos (lógica en `MatchStateService` y repositorio de equipos).

---

### Códigos de equipos y fechas

- **Códigos de equipo:** Definidos en `firestore-constants.ts` (`TEAM_CODES`, `TEAM_NAMES`). Se usan como ID de documento en apertura/clausura y como `equipoLocalId` / `equipoVisitanteId` en partidos.
- **Fechas y horas:** En Firestore siempre **Timestamp**. En la app se convierten a **Date** en los mappers. Para mostrar o comparar días se usa **date-fns** y `normalizeDate()` de `src/lib/date-utils.ts` cuando interesa solo año/mes/día.

---

## Funcionalidades principales

- **Autenticación**: Login email/contraseña y Google; sesión con cookie segura; proxy que protege `/dashboard`; verificación de usuarios autorizados en Firestore; roles admin/viewer.
- **Dashboard**: Resumen con partidos próximos o del día, jornada actual, contador real de usuarios registrados en la app móvil (vía `GET /api/stats/users` con Firebase Admin Auth).
- **Menú de usuario (navbar)**: Botón "Perfil" abre un modal con avatar, nombre, email, rol y último acceso. Botón "Configuración" navega a la página de configuración.
- **Partidos**: Tabs En Vivo, Próximos, Finalizados y Suspendidos. Finalizados abarca **todas** las jornadas (historial completo); Próximos y En Vivo solo jornadas visibles con suscripciones en tiempo real (`onSnapshot`). Iniciar partido, actualizar marcador, tiempo agregado y finalizar.
- **Jornadas**: Listado de jornadas y sus partidos; gestión de visibilidad (`mostrar`) y jornada activa (`esActiva`).
- **Posiciones**: Tabla de posiciones (Apertura, Clausura y Acumulado) actualizada según los partidos.
- **Noticias**: Crear, editar y listar noticias con campo `categoria` unificado (11 valores: general, resultado, fixture, comunicado, destacado, partidos, fichajes, equipos, jugadores, tabla, estadísticas).
- **Configuración de cuenta**: Editar nombre (actualiza Firebase Auth con `updateProfile`); reset de contraseña por email (`sendPasswordResetEmail`) o información de cuenta Google; dialogs para notificaciones y apariencia.
- **Notificaciones push**: Envío por FCM a tópicos de equipos (`team_*`) o al canal general (`liga1_all`).
- **APIs de servidor**: `/api/auth/session`, `/api/auth/logout`, `/api/push-notifications/send`, `/api/stats/users` — todas usando Firebase Admin SDK.

---

## Build y despliegue

1. Configurar en el entorno las mismas variables que en `.env.local` (en Vercel/otro host: panel de variables de entorno).
2. Ejecutar desde la raíz del proyecto:
   ```bash
   npm run build
   npm run start
   ```
   En Vercel (o similar) el build se lanza desde la raíz del repo que contenga `liga1-admin-next` (o desde la raíz del monorepo según configuración).

---

## Licencia

Proyecto privado. Uso interno Liga 1.
