# 🎨 Guía de Diseño: Adaptación Soft UI Dashboard

Este documento define cómo adaptaremos el diseño visual de la plantilla Soft UI Dashboard a nuestro proyecto Next.js + shadcn/ui.

## 📋 Resumen de Integración

**Estrategia**: Adaptar solo el diseño visual (colores, estilos, estructura)
- ✅ Mantener: Next.js 16 + shadcn/ui + Tailwind CSS
- ✅ Adoptar: Paleta de colores + Estilo Soft UI + Layout estructura
- ❌ NO migrar: Material UI, Create React App, React Router

---

## 🎨 Paleta de Colores Soft UI

### Colores Base

```css
/* Background */
--soft-bg-default: #f8f9fa;
--soft-bg-white: #ffffff;

/* Text */
--soft-text-main: #67748e;
--soft-text-dark: #344767;

/* Primary (Liga 1 - podemos personalizar) */
--soft-primary: #cb0c9f;
--soft-primary-hover: #ad0a87;

/* Secondary */
--soft-secondary: #8392ab;

/* Status Colors */
--soft-info: #17c1e8;
--soft-success: #82d616;
--soft-warning: #fbcf33;
--soft-error: #ea0606;

/* Dark */
--soft-dark: #344767;

/* Grises */
--soft-grey-100: #f8f9fa;
--soft-grey-200: #e9ecef;
--soft-grey-300: #dee2e6;
--soft-grey-500: #adb5bd;
--soft-grey-700: #495057;
--soft-grey-900: #212529;
```

### Gradientes

```css
/* Primary Gradient */
background: linear-gradient(195deg, #7928ca, #ff0080);

/* Info Gradient */
background: linear-gradient(195deg, #2152ff, #21d4fd);

/* Success Gradient */
background: linear-gradient(195deg, #17ad37, #98ec2d);

/* Dark Gradient */
background: linear-gradient(195deg, #141727, #3a416f);
```

---

## 🧩 Componentes a Adaptar en FASE 4

### 1. Layout Principal

**Referencia**: `/plantilla/src/examples/LayoutContainers/DashboardLayout/`

**Estructura**:
```
┌─────────────────────────────────────────┐
│  Navbar (top, fijo)                     │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Contenido Principal         │
│ (left)   │  (con padding)               │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Características**:
- Sidebar colapsable en móvil
- Navbar con breadcrumbs
- Background: `#f8f9fa`
- Cards con sombra suave

### 2. Sidebar

**Referencia**: `/plantilla/src/examples/Sidenav/`

**Características**:
- Width: 250px
- Background: gradient o blanco
- Items con hover suave
- Iconos con Lucide React (en lugar de MUI icons)
- Active state con background degradado

**Items del Sidebar**:
- 🏠 Dashboard
- ⚽ Partidos
- 📊 Tabla de Posiciones
- 📅 Jornadas
- 📰 Noticias
- ⚙️ Configuración

### 3. Navbar

**Referencia**: `/plantilla/src/examples/Navbars/DashboardNavbar/`

**Características**:
- Background: transparente con blur
- Height: 64px
- Breadcrumbs a la izquierda
- Usuario y notificaciones a la derecha

### 4. Cards

**Referencia**: `/plantilla/src/examples/Cards/`

**Estilos a adoptar**:
```css
.soft-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 27px 0 rgba(0,0,0,0.05);
  padding: 24px;
}

.soft-card-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
  padding-bottom: 16px;
}
```

**Tipos de Cards**:
- **StatCard**: Partidos en vivo, total de equipos, etc.
- **MatchCard**: Tarjeta de partido individual
- **StandingsCard**: Tabla de posiciones
- **NewsCard**: Tarjeta de noticia

### 5. Tablas

**Referencia**: `/plantilla/src/examples/Tables/`

**Características**:
- Headers con background `#f8f9fa`
- Filas con hover suave
- Bordes redondeados
- Paginación al estilo Soft UI

### 6. Botones

**Estilos a adoptar**:
```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(195deg, #cb0c9f, #ad0a87);
  border-radius: 8px;
  box-shadow: 0 4px 7px -1px rgba(0,0,0,0.11), 0 2px 4px -1px rgba(0,0,0,0.07);
  transition: all 0.15s ease-in;
}

/* Info Button */
.btn-info {
  background: linear-gradient(195deg, #17c1e8, #3acaeb);
}

/* Success Button */
.btn-success {
  background: linear-gradient(195deg, #82d616, #95dc39);
}
```

### 7. Badges (Estados de Partido)

**Para los estados de partidos**:
```css
/* Pendiente */
.badge-secondary {
  background: #e4e8ed;
  color: #5974a2;
}

/* En Vivo */
.badge-success {
  background: #cdf59b;
  color: #67b108;
  animation: pulse 2s infinite;
}

/* Finalizado */
.badge-dark {
  background: #8097bf;
  color: #1e2e4a;
}

/* Suspendido */
.badge-warning {
  background: #fef5d3;
  color: #fbc400;
}
```

---

## 🎯 Personalización para Liga 1

### Colores Personalizados

Podemos ajustar algunos colores para la identidad de la Liga 1:

```css
/* Primary - Azul Liga 1 */
--liga1-primary: #0047BB;
--liga1-primary-hover: #003D9E;

/* Accent - Verde Liga 1 */
--liga1-accent: #00B140;

/* Equipos */
--team-alianza: #0066CC;
--team-universitario: #8B0000;
--team-cristal: #89CFF0;
```

---

## 📐 Tipografía

**Fuente**: Inter (ya incluida en Next.js)

```css
/* Headings */
h1, h2, h3 {
  font-weight: 700;
  color: #344767;
}

/* Body */
body {
  font-family: 'Inter', -apple-system, sans-serif;
  color: #67748e;
  font-size: 14px;
  line-height: 1.6;
}

/* Small text */
.text-sm {
  font-size: 12px;
  color: #8392ab;
}
```

---

## 🔄 Componentes Soft UI → shadcn/ui

| Componente Soft UI | shadcn/ui Equivalente | Personalización |
|--------------------|----------------------|-----------------|
| SoftBox | `<div>` con Tailwind | Usar clases custom |
| SoftButton | `<Button>` | Agregar variantes gradient |
| SoftInput | `<Input>` | Estilo soft focus |
| SoftBadge | `<Badge>` | Colores soft |
| SoftTypography | `<h1>`, `<p>` | Clases Tailwind |
| SoftAvatar | `<Avatar>` | Ya compatible |
| SoftAlert | `<Alert>` + sonner | Colores soft |

---

## 📅 Implementación en Fases

### FASE 2: Capa de Datos
- Implementar repositorios Firestore
- No requiere diseño

### FASE 3: Autenticación
- Login page básica (refinada después)

### **FASE 4: UI Components** 👈 AQUÍ usaremos esta guía
- ✅ Crear tema Tailwind con colores Soft UI
- ✅ Layout (Sidebar + Navbar)
- ✅ Cards personalizadas
- ✅ Botones con gradientes
- ✅ Badges para estados

### FASE 5-8:
- Usar componentes creados en FASE 4

---

## 🎨 Archivo Tailwind Config (Preview)

```js
// tailwind.config.ts - Se creará en FASE 4
export default {
  theme: {
    extend: {
      colors: {
        soft: {
          primary: '#cb0c9f',
          secondary: '#8392ab',
          info: '#17c1e8',
          success: '#82d616',
          warning: '#fbcf33',
          error: '#ea0606',
          dark: '#344767',
          text: '#67748e',
          bg: '#f8f9fa',
        },
        liga1: {
          primary: '#0047BB',
          accent: '#00B140',
        }
      },
      boxShadow: {
        'soft': '0 20px 27px 0 rgba(0,0,0,0.05)',
        'soft-lg': '0 8px 26px -4px rgba(20,20,20,0.15)',
      },
      borderRadius: {
        'soft': '16px',
      }
    }
  }
}
```

---

## ✅ Checklist de Adaptación

### FASE 4 (Próxima):
- [ ] Configurar Tailwind con colores Soft UI
- [ ] Crear componentes de Layout (Sidebar, Navbar)
- [ ] Adaptar Cards con estilos Soft UI
- [ ] Crear botones con gradientes
- [ ] Adaptar Badges para estados de partidos
- [ ] Copiar iconos y assets necesarios

### Referencias Visuales:
- `/plantilla/src/layouts/dashboard/` - Layout principal
- `/plantilla/src/examples/Sidenav/` - Sidebar
- `/plantilla/src/examples/Cards/` - Cards
- `/plantilla/src/assets/theme/` - Tema completo

---

**Siguiente paso**: Completar FASE 2 (Capa de Datos), luego implementar este diseño en FASE 4.
