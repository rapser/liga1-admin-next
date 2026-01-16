# Liga 1 Admin - Panel Web Administrativo

Panel de administración web para gestionar la Liga 1 de Fútbol Peruano con actualizaciones en tiempo real.

## 🚀 Stack Tecnológico

- **Framework**: Next.js 16.1.2 (App Router + React Server Components)
- **Librería UI**: shadcn/ui + Tailwind CSS
- **Gestión de Estado**: Zustand + React Query
- **Backend**: Firebase Firestore + Firebase Cloud Messaging
- **Autenticación**: Firebase Auth
- **Lenguaje**: TypeScript (modo estricto)
- **Node**: v24.13.0

## 📁 Estructura del Proyecto (Arquitectura Limpia)

```
liga1-admin-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Rutas públicas (login)
│   │   └── (dashboard)/       # Rutas protegidas
│   │
│   ├── core/                  # Capa de Infraestructura
│   │   ├── config/            # Configuración Firebase, constantes
│   │   └── lib/               # Utilidades, FCM
│   │
│   ├── domain/                # Capa de Dominio (lógica pura)
│   │   ├── entities/          # Match, Team, Jornada
│   │   └── repositories/      # Interfaces de repositorios
│   │
│   ├── data/                  # Capa de Datos
│   │   ├── dtos/              # Objetos de transferencia Firestore
│   │   ├── mappers/           # DTO ↔ Domain
│   │   └── repositories/      # Implementaciones concretas
│   │
│   ├── presentation/          # Capa de Presentación
│   │   ├── components/        # Componentes React
│   │   │   ├── ui/           # shadcn/ui
│   │   │   ├── layout/       # Navbar, Sidebar
│   │   │   ├── features/     # Matches, Jornadas, Standings
│   │   │   └── shared/       # Compartidos
│   │   ├── hooks/            # React Query hooks
│   │   ├── providers/        # Context providers
│   │   └── store/            # Zustand stores
│   │
│   └── di/                    # Inyección de Dependencias
│
├── public/
│   └── teams/                 # Logos de equipos
│
└── .env.local                 # Variables de entorno (NO subir a Git)
```

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Firebase

Copia `.env.example` a `.env.local` y completa con tus credenciales de Firebase:

```bash
cp .env.example .env.local
```

Necesitarás obtener de tu proyecto Firebase `liga1-739fc`:
- **Firebase Client SDK**: API Key, Auth Domain, App ID, etc.
- **Firebase Admin SDK**: Client Email y Private Key (para notificaciones push)

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 4. Compilar para Producción

```bash
npm run build
npm start
```

## 🔥 Firestore - Estructura de Datos

```
liga1-739fc/
├── jornadas/
│   └── {jornadaId}/           # ej: "apertura_01"
│       ├── mostrar: boolean
│       ├── fechaInicio: Timestamp
│       └── matches/           # Subcolección
│           └── {matchId}/     # ej: "ali_uni"
│
├── apertura/                  # Tabla de posiciones
│   └── {teamId}/
│
├── clausura/
│   └── {teamId}/
│
├── acumulado/
│   └── {teamId}/
│
└── users/                     # Admins autorizados
    └── {userId}/
        ├── email: string
        └── role: 'admin' | 'viewer'
```

## 📝 Roadmap de Implementación

### ✅ FASE 0 - Preparación (Completada)
- ✅ Proyecto Next.js 16.1 inicializado
- ✅ Dependencias instaladas (Firebase, React Query, Zustand, shadcn/ui)
- ✅ Estructura de carpetas (Arquitectura Limpia)
- ✅ Archivos de configuración base
- ✅ TypeScript en modo estricto

### 🔜 FASE 1 - Capa de Dominio
- Crear entidades (Match, Team, Jornada, NewsItem)
- Definir interfaces de repositorios
- Configurar tipos y enums compartidos

### 🔜 FASE 2 - Capa de Datos
- Crear DTOs para Firestore
- Implementar Mappers (DTO ↔ Domain)
- Implementar repositorios con listeners en tiempo real

### 🔜 FASE 3 - Autenticación
- Configurar Firebase Auth Provider
- Página de Login con Google Sign-In
- Middleware de protección de rutas
- Verificación de usuarios autorizados

### 🔜 FASE 4 - UI Components
- Layout (Navbar, Sidebar)
- Componentes de Features (MatchCard, StandingsTable, etc.)
- Configurar providers (Query, Auth, Toast)

### 🔜 FASE 5 - Gestión de Estado
- Stores Zustand (Auth, Matches, UI)
- Hooks React Query (useMatches, useTeams, etc.)
- Listeners en tiempo real

### 🔜 FASE 6 - Dashboard Pages
- Página de resumen (partidos en vivo)
- Gestión de partidos
- Tabla de posiciones
- Gestión de jornadas

### 🔜 FASE 7 - Notificaciones Push
- Configurar Firebase Admin SDK
- API route para envío de notificaciones
- Integración con edición de marcadores

### 🔜 FASE 8 - Testing & Deploy
- Pruebas de funcionalidad
- Optimización de rendimiento
- Despliegue a Vercel

## 📚 Recursos

- [Next.js 16 Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs)

## 📄 Licencia

Proyecto privado - Liga 1 Perú Admin Panel
