# Liga 1 Admin - Panel Web Administrativo

Panel de administración web para gestionar la Liga 1 de Fútbol Peruano con actualizaciones en tiempo real de partidos, marcadores y tabla de posiciones.

## 🚀 Stack Tecnológico

### Framework Principal
- **Next.js 16.1.2** - Framework React con App Router y React Server Components
- **React 19.2.3** - Biblioteca de interfaz de usuario
- **TypeScript 5** - Tipado estático en modo estricto
- **Node.js v24.13.0** - Entorno de ejecución

### UI y Estilos
- **shadcn/ui** - Componentes de UI accesibles y personalizables
- **Radix UI** - Primitivos de UI sin estilos (Dialog, Select, Tabs, Dropdown, etc.)
- **Tailwind CSS 4** - Framework de utilidades CSS
- **Lucide React** - Iconos SVG optimizados
- **class-variance-authority** - Gestión de variantes de componentes
- **tailwind-merge** - Merge inteligente de clases Tailwind

### Backend y Base de Datos
- **Firebase Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Auth** - Autenticación de usuarios (Google Sign-In)
- **Firebase Admin SDK** - SDK para servidor (notificaciones push)

### Gestión de Estado y Datos
- **TanStack Query (React Query) v5** - Gestión de estado del servidor y caché
- **Zustand v5** - Gestión de estado global ligera
- **Sonner** - Sistema de notificaciones toast

### Utilidades
- **date-fns v4** - Manipulación y formateo de fechas
- **clsx** - Utilidad para construir nombres de clases condicionales
- **next-themes** - Soporte para temas claro/oscuro

## 📁 Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Limpia (Clean Architecture)** separando el código en capas independientes:

```
liga1-admin-next/
├── src/
│   ├── app/                           # Next.js App Router (rutas y layouts)
│   │   ├── (auth)/                   # Rutas públicas (grupo de rutas)
│   │   │   └── login/                # Página de login
│   │   ├── (dashboard)/              # Rutas protegidas (grupo de rutas)
│   │   │   └── dashboard/            # Páginas del dashboard
│   │   │       ├── page.tsx          # Dashboard principal
│   │   │       ├── partidos/         # Gestión de partidos
│   │   │       ├── jornadas/         # Gestión de jornadas
│   │   │       ├── posiciones/       # Tabla de posiciones
│   │   │       ├── noticias/         # Gestión de noticias
│   │   │       └── configuracion/    # Configuración
│   │   ├── layout.tsx                # Layout raíz
│   │   ├── page.tsx                  # Página raíz
│   │   └── globals.css               # Estilos globales
│   │
│   ├── core/                         # Capa de Infraestructura
│   │   ├── config/                   # Configuraciones del sistema
│   │   │   ├── firebase.ts          # Configuración Firebase Client
│   │   │   └── firestore-constants.ts # Constantes de Firestore
│   │   └── lib/                      # Utilidades y helpers
│   │       ├── fcm/                  # Firebase Cloud Messaging
│   │       └── utils/                # Utilidades generales
│   │
│   ├── domain/                       # Capa de Dominio (Lógica de negocio pura)
│   │   ├── entities/                 # Entidades del dominio
│   │   │   ├── match.entity.ts      # Entidad Match (partido)
│   │   │   ├── team.entity.ts       # Entidad Team (equipo)
│   │   │   ├── jornada.entity.ts    # Entidad Jornada
│   │   │   └── news.entity.ts       # Entidad NewsItem (noticia)
│   │   ├── repositories/             # Interfaces de repositorios (contratos)
│   │   │   ├── match.repository.interface.ts
│   │   │   ├── team.repository.interface.ts
│   │   │   ├── jornada.repository.interface.ts
│   │   │   ├── news.repository.interface.ts
│   │   │   └── admin.repository.interface.ts
│   │   ├── services/                 # Servicios de dominio
│   │   │   └── match-state.service.ts # Lógica de negocio para partidos
│   │   └── use-cases/                # Casos de uso (futuro)
│   │
│   ├── data/                         # Capa de Datos (Implementación)
│   │   ├── dtos/                     # Data Transfer Objects (Firestore)
│   │   │   ├── match.dto.ts         # DTO para partidos
│   │   │   ├── team.dto.ts          # DTO para equipos
│   │   │   ├── jornada.dto.ts       # DTO para jornadas
│   │   │   ├── news.dto.ts          # DTO para noticias
│   │   │   └── admin.dto.ts         # DTO para administradores
│   │   ├── mappers/                  # Mappers (DTO ↔ Domain)
│   │   │   ├── match.mapper.ts      # Conversión Match DTO ↔ Entity
│   │   │   ├── team.mapper.ts       # Conversión Team DTO ↔ Entity
│   │   │   ├── jornada.mapper.ts    # Conversión Jornada DTO ↔ Entity
│   │   │   ├── news.mapper.ts       # Conversión News DTO ↔ Entity
│   │   │   └── admin.mapper.ts      # Conversión Admin DTO ↔ Entity
│   │   └── repositories/             # Implementaciones concretas de repositorios
│   │       ├── match.repository.ts  # Acceso a datos de partidos
│   │       ├── team.repository.ts   # Acceso a datos de equipos/tabla
│   │       ├── jornada.repository.ts # Acceso a datos de jornadas
│   │       ├── news.repository.ts   # Acceso a datos de noticias
│   │       └── admin.repository.ts  # Acceso a datos de usuarios
│   │
│   ├── presentation/                 # Capa de Presentación (UI)
│   │   ├── components/              # Componentes React
│   │   │   ├── ui/                  # Componentes UI base (shadcn/ui)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/              # Componentes de layout
│   │   │   │   ├── dashboard-layout.tsx # Layout principal del dashboard
│   │   │   │   ├── navbar.tsx       # Barra de navegación superior
│   │   │   │   └── sidebar.tsx      # Barra lateral de navegación
│   │   │   ├── features/            # Componentes de funcionalidades
│   │   │   │   ├── matches/         # Componentes de partidos
│   │   │   │   │   ├── match-live-controller.tsx # Controlador de partidos en vivo
│   │   │   │   │   ├── live-match-timer.tsx      # Timer de partido en vivo
│   │   │   │   │   ├── match-score-editor.tsx    # Editor de marcador
│   │   │   │   │   └── add-time-config.tsx       # Configuración de tiempo agregado
│   │   │   │   ├── jornadas/        # Componentes de jornadas
│   │   │   │   └── standings/       # Componentes de tabla de posiciones
│   │   │   └── shared/              # Componentes compartidos
│   │   │       ├── page-header.tsx  # Encabezado de página
│   │   │       └── stat-card.tsx    # Tarjeta de estadística
│   │   ├── hooks/                   # Custom React Hooks
│   │   │   ├── use-require-auth.tsx # Hook para proteger rutas
│   │   │   └── use-match-timer.tsx  # Hook para timer de partidos
│   │   ├── providers/               # Context Providers
│   │   │   └── auth-provider.tsx    # Proveedor de autenticación
│   │   └── store/                   # Stores de Zustand (futuro)
│   │
│   ├── components/                  # Componentes UI compartidos (alias para @/components)
│   │   └── ui/                      # Componentes shadcn/ui
│   │
│   ├── lib/                         # Utilidades de librería
│   │   └── utils.ts                 # Utilidades generales (cn, etc.)
│   │
│   └── di/                          # Inyección de Dependencias (futuro)
│
├── public/                          # Archivos estáticos
│   └── teams/                       # Logos de equipos (hua.png, ali.png, etc.)
│
├── scripts/                         # Scripts auxiliares
│   └── verify-env.mjs               # Script para verificar variables de entorno
│
└── .env.local                       # Variables de entorno (NO subir a Git)
```

## 🏗️ Principios de Arquitectura

### Separación de Responsabilidades
- **Domain Layer**: Contiene la lógica de negocio pura, independiente de frameworks y tecnologías
- **Data Layer**: Implementa el acceso a datos (Firestore), transforma entre DTOs y entidades
- **Presentation Layer**: Maneja la UI, eventos del usuario y renderizado
- **Core Layer**: Configuración y utilidades compartidas

### Inversión de Dependencias
- Las capas superiores dependen de interfaces (repositorios) definidas en `domain/`
- Las implementaciones concretas están en `data/`, cumpliendo los contratos de `domain/`

### Mapper Pattern
- Conversión explícita entre modelos de Firestore (DTOs) y entidades del dominio
- Permite independencia entre estructura de datos y modelo de negocio

## ✨ Funcionalidades Implementadas

### 🔐 Autenticación y Autorización
- ✅ Login con Google Sign-In (Firebase Auth)
- ✅ Protección de rutas con `useRequireAuth` hook
- ✅ Verificación de usuarios autorizados en Firestore
- ✅ Roles de usuario (admin/viewer)
- ✅ Registro de último login
- ✅ Redirecciones automáticas según estado de autenticación

### 📊 Dashboard Principal
- ✅ Vista general con tarjetas de estadísticas
- ✅ Información de partidos del día
- ✅ Navegación rápida a secciones principales

### ⚽ Gestión de Jornadas y Partidos
- ✅ Listado de jornadas con partidos programados
- ✅ Inicio de partidos (cambio de estado: `pendiente` → `envivo`)
- ✅ Timer en tiempo real con indicador de primer/segundo tiempo
- ✅ Actualización de marcador durante el partido en vivo
- ✅ Configuración de minutos adicionales (tiempo agregado)
- ✅ Visualización de tiempo agregado (ej: "90' +5")
- ✅ Finalización de partidos (cambio de estado: `envivo` → `finalizado`)
- ✅ Validación de tiempo mínimo (90 minutos + tiempo agregado)

### 📈 Tabla de Posiciones (Tiempo Real)
- ✅ Actualización automática en tiempo real mientras el partido está en vivo
- ✅ Actualización de estadísticas al iniciar partido:
  - Incrementa `partidosJugados` (+1) para ambos equipos
- ✅ Actualización de estadísticas durante el partido en vivo:
  - Goles a favor (`golesFavor`)
  - Goles en contra (`golesContra`)
  - Diferencia de goles (`diferenciaGoles`)
  - Partidos ganados/empatados/perdidos (`partidosGanados`, `partidosEmpatados`, `partidosPerdidos`)
  - Puntos (`puntos` = partidosGanados * 3 + partidosEmpatados)
- ✅ Ordenamiento automático por:
  1. Partidos jugados (descendente)
  2. Puntos (descendente)
  3. Diferencia de goles (descendente)
  4. Goles a favor (descendente)
  5. Nombre del equipo (alfabético)
- ✅ Soporte para torneo Apertura (colección `apertura`)

### 📰 Gestión de Noticias
- ✅ Listado de noticias con diseño en grid (3 columnas)
- ✅ Crear nueva noticia con formulario:
  - Título
  - Imagen (URL)
  - Categoría
  - Periódico/medio
  - URL externa
  - Estado (Publicada/Borrador)
  - Marcar como destacada
- ✅ Editar noticia existente
- ✅ Visualización de noticias con:
  - Imagen destacada
  - Título (máximo 3 líneas)
  - Fecha de publicación
  - Badge de estado (Publicada/Borrador)
- ✅ Tarjetas de noticias con altura fija (350px)

### ⚙️ Configuración
- ✅ Página de configuración (estructura base)

## 🔥 Firestore - Estructura de Datos

```
liga1-739fc/
├── jornadas/                        # Colección de jornadas
│   └── {jornadaId}/                 # ej: "apertura_01"
│       ├── mostrar: boolean         # Si se debe mostrar en la app
│       ├── fechaInicio: Timestamp   # Fecha de inicio de la jornada
│       └── matches/                 # Subcolección de partidos
│           └── {matchId}/           # ej: "hua_ali" (id formato: localId_visitanteId)
│               ├── equipoLocalId: string      # "hua"
│               ├── equipoVisitanteId: string  # "ali"
│               ├── estado: string             # "pendiente" | "envivo" | "finalizado"
│               ├── golesEquipoLocal: number
│               ├── golesEquipoVisitante: number
│               ├── horaInicio: Timestamp      # Cuando inició el partido
│               ├── minutoActual: number       # Minuto actual del partido
│               ├── tiempoAgregado: number     # Minutos adicionales configurados
│               └── primeraParte: boolean      # true = 1er tiempo, false = 2do tiempo
│
├── apertura/                        # Tabla de posiciones - Torneo Apertura
│   └── {teamId}/                    # ej: "hua", "ali", "uni"
│       ├── name: string             # "Sport Huancayo"
│       ├── logo: string             # "hua"
│       ├── city: string             # "Huancayo"
│       ├── stadium: string          # "Estadio Huancayo"
│       ├── matchesPlayed: number    # Partidos jugados
│       ├── matchesWon: number       # Partidos ganados
│       ├── matchesDrawn: number     # Partidos empatados
│       ├── matchesLost: number      # Partidos perdidos
│       ├── goalsScored: number      # Goles a favor
│       ├── goalsAgainst: number     # Goles en contra
│       ├── goalDifference: number   # Diferencia de goles
│       └── points: number           # Puntos (matchesWon * 3 + matchesDrawn)
│
├── clausura/                        # Tabla de posiciones - Torneo Clausura (futuro)
│   └── {teamId}/
│       └── ... (mismos campos que apertura)
│
└── users/                           # Usuarios autorizados (admins)
    └── {userId}/
        ├── email: string
        └── role: string             # "admin" | "viewer"
```

**Nota**: La colección `acumulado` no existe en Firestore. Es un cálculo local que combina `apertura` + `clausura` (a implementar en el futuro).

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia `.env.example` a `.env.local` y completa con tus credenciales de Firebase:

```bash
cp .env.example .env.local
```

**Variables requeridas en `.env.local`:**

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=liga1-739fc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=liga1-739fc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=liga1-739fc.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Firebase Admin SDK (para notificaciones push)
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@liga1-739fc.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Cómo obtener las credenciales:**
1. **Firebase Client SDK**: Firebase Console → Project Settings → General → Your apps → Web app
2. **Firebase Admin SDK**: Firebase Console → Project Settings → Service accounts → Generate new private key

### 3. Verificar Configuración

```bash
npm run verify-env
```

Este script verifica que todas las variables de entorno estén configuradas correctamente.

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 5. Compilar para Producción

```bash
npm run build
npm start
```

## 📝 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Compilar para producción
npm start            # Ejecutar build de producción
npm run lint         # Ejecutar linter ESLint
npm run verify-env   # Verificar variables de entorno
```

## 🔄 Flujo de Actualización en Tiempo Real

### Inicio de Partido
1. Usuario presiona "Iniciar Partido" en la sección Jornadas
2. `MatchStateService.startMatch()`:
   - Cambia estado: `pendiente` → `envivo`
   - Establece `horaInicio` (timestamp actual)
   - Inicializa `minutoActual: 0`, `primeraParte: true`, `tiempoAgregado: 0`
   - **Incrementa `partidosJugados` +1 para ambos equipos en tabla `apertura`**

### Durante el Partido en Vivo
1. Timer cuenta minutos desde `horaInicio`
2. Usuario actualiza marcador con botones `+` / `-` y presiona "Actualizar Marcador"
3. `MatchStateService.updateMatchScore()`:
   - Actualiza `golesEquipoLocal` / `golesEquipoVisitante` en el partido
   - Llama `updateStandingsScore()` que **actualiza en tiempo real**:
     - Revertir resultado anterior (quitar puntos/estadísticas previas)
     - Aplicar resultado actual (sumar puntos/estadísticas nuevas)
     - Actualizar goles, diferencia, PG/PE/PP, puntos
     - **NO toca `partidosJugados`** (ya fue incrementado al inicio)

### Configuración de Tiempo Agregado
1. Cuando el partido llega a 90 minutos, aparece control para minutos adicionales
2. Usuario ingresa minutos (ej: 5) y presiona "Guardar"
3. `MatchStateService.updateAddedTime()` actualiza `tiempoAgregado` en el partido
4. Timer muestra "90' +1", "90' +2", ... hasta "90' +5"

### Finalización de Partido
1. Después de 90 minutos + tiempo agregado, aparece botón "Finalizar Partido"
2. `MatchStateService.finishMatch()`:
   - Cambia estado: `envivo` → `finalizado`
   - **NO actualiza estadísticas** (ya fueron actualizadas durante el partido)

### Actualización de Tabla de Posiciones
- Las actualizaciones se reflejan **inmediatamente** en Firestore
- Los componentes React se actualizan automáticamente usando listeners en tiempo real (`onSnapshot`)
- La tabla se reordena automáticamente según los criterios establecidos

## 🛠️ Tecnologías y Patrones Utilizados

### Patrones de Diseño
- **Repository Pattern**: Abstracción del acceso a datos
- **Mapper Pattern**: Conversión entre capas de datos
- **Service Layer**: Lógica de negocio encapsulada
- **Dependency Injection**: Inyección de dependencias (preparado)

### Arquitectura
- **Clean Architecture**: Separación en capas (Domain, Data, Presentation)
- **SOLID Principles**: Principios de diseño orientado a objetos
- **Single Responsibility**: Cada clase/componente tiene una responsabilidad

### React Patterns
- **Custom Hooks**: Reutilización de lógica de estado
- **Compound Components**: Componentes que trabajan juntos (Dialog + Form)
- **Provider Pattern**: Context API para estado global

## 📚 Recursos y Documentación

- [Next.js 16 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [TanStack Query (React Query)](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs)

## 🚧 Funcionalidades Futuras

- [ ] Notificaciones Push (Firebase Cloud Messaging)
- [ ] Gestión completa de usuarios y permisos
- [ ] Estadísticas avanzadas y reportes
- [ ] Exportación de datos (CSV, PDF)
- [ ] Historial de cambios en partidos
- [ ] Dashboard con gráficos y métricas
- [ ] Modo oscuro/claro
- [ ] Soporte para torneo Clausura
- [ ] Cálculo de tabla Acumulado (apertura + clausura)

## 📄 Licencia

Proyecto privado - Liga 1 Perú Admin Panel

---

**Desarrollado para la gestión administrativa de la Liga 1 de Fútbol Peruano** ⚽🇵🇪
