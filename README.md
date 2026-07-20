# Liga 1 Admin

Panel web privado para administrar la operación de la Liga 1: jornadas, partidos, marcadores en vivo, tablas de posiciones, noticias, usuarios autorizados y notificaciones push.

La aplicación utiliza Next.js para la interfaz y las funciones de servidor, mientras que Firebase proporciona autenticación, persistencia en tiempo real y mensajería.

## Contenido

- [Alcance funcional](#alcance-funcional)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Datos e integraciones](#datos-e-integraciones)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Operación y recuperación](#operación-y-recuperación)

## Alcance funcional

El panel permite:

- Autenticar administradores y proteger las rutas internas mediante sesión.
- Administrar jornadas, partidos y estados del encuentro.
- Actualizar marcadores y tablas de posiciones en tiempo real.
- Mantener las tablas del Apertura, Clausura y Acumulado.
- Crear y administrar noticias.
- Enviar notificaciones push mediante Firebase Cloud Messaging.
- Gestionar configuraciones operativas y usuarios autorizados.

Las rutas principales están bajo `/dashboard`. El detalle de cada caso de uso debe consultarse en el código de su feature y en las entidades del dominio; el README evita duplicar esa documentación para no quedar desactualizado.

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

El proyecto aplica una arquitectura en capas inspirada en Clean Architecture. La lógica del negocio se mantiene separada de Next.js y Firebase.

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

### Domain

`src/domain` contiene:

- Entidades y reglas del negocio.
- Interfaces de repositorios.
- Servicios de aplicación, como el manejo del estado de partidos.

No debe depender de componentes visuales ni de implementaciones concretas de Firestore.

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

### Reglas de dependencia

- El dominio no importa Firebase, Next.js ni componentes React.
- Data depende de los contratos del dominio, no al revés.
- La UI no debe acceder directamente a documentos de Firestore cuando existe un repositorio.
- Firebase Admin solo se utiliza en código de servidor.
- La conversión entre `Timestamp` y `Date` corresponde a los mappers.

## Estructura del proyecto

```text
src/
├── app/                    # App Router, layouts y API Routes
├── components/ui/          # Componentes base de interfaz
├── core/config/            # Firebase y constantes compartidas
├── data/
│   ├── dtos/              # Formatos persistidos
│   ├── mappers/           # Conversión DTO ↔ dominio
│   └── repositories/      # Implementaciones de Firestore
├── domain/
│   ├── entities/          # Entidades y reglas
│   ├── repositories/      # Interfaces de repositorios
│   └── services/          # Casos de uso
├── lib/                    # Utilidades generales
├── presentation/
│   ├── components/        # Layout, features y componentes compartidos
│   ├── hooks/             # Hooks de presentación
│   └── providers/         # Auth, tema y React Query
└── proxy.ts               # Protección de rutas

scripts/                      # Verificación, ejecución y recuperación
```

## Datos e integraciones

Firestore es la fuente de datos de la aplicación.

| Colección | Responsabilidad |
|---|---|
| `jornadas` | Calendario del Apertura y Clausura |
| `jornadas/{id}/matches` | Partidos y sus estados/marcadores |
| `apertura` | Posiciones del Torneo Apertura |
| `clausura` | Posiciones del Torneo Clausura |
| `acumulado` | Suma de Apertura y Clausura |
| `news` | Noticias publicadas o en borrador |
| `admins` | Usuarios autorizados y roles |

Convenciones relevantes:

- Las jornadas utilizan IDs como `apertura_01` y `clausura_01`.
- Los partidos utilizan IDs formados por los códigos de sus equipos, por ejemplo `ali_uni`.
- Las fechas se almacenan como `Timestamp` y se convierten a `Date` en la capa de datos.
- Las tablas de Apertura y Clausura se calculan de forma independiente.
- `acumulado` se recalcula sumando ambas tablas.

Firebase Authentication gestiona la identidad. Firebase Admin valida sesiones y ejecuta operaciones privilegiadas en el servidor. Firebase Cloud Messaging entrega las notificaciones push.

## Instalación local

### Requisitos

- Node.js 20.9 o superior.
- npm 10 o superior.
- Proyecto Firebase configurado.
- Credenciales de Firebase Admin para utilizar todas las API Routes.

### Preparación

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

Iniciar el entorno local:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

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

### Proceso recomendado para publicar

1. Integrar el cambio mediante PR hacia `develop`.
2. Revisar el Preview Deployment y ejecutar las pruebas funcionales.
3. Abrir el PR `develop → main`.
4. Confirmar que lint, tipos y build hayan pasado.
5. Fusionar el PR.
6. Esperar que el deployment de Vercel cambie a `Ready`.
7. Verificar la funcionalidad y los logs en producción.
8. Si `main` recibió cambios exclusivos, sincronizarlos nuevamente hacia `develop`.

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

## Historial de cambios

Los cambios relevantes se documentan en [`CHANGELOG.md`](./CHANGELOG.md).

## Licencia

Proyecto privado para uso interno.
