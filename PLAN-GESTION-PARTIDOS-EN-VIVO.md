# Plan de Gestión de Partidos en Vivo - Liga 1

## 📋 Resumen Ejecutivo

Este plan describe la implementación completa del sistema de gestión de partidos en vivo para la Liga 1, incluyendo el cambio de estados, minutero en tiempo real, actualización de marcadores y sincronización automática con la tabla de posiciones.

---

## 🎯 Objetivos

1. **Gestión de Estados**: Permitir cambiar partidos de "pendiente" → "envivo" → "finalizado"
2. **Minutero en Vivo**: Mostrar cronómetro cuando el partido está en vivo
3. **Actualización de Marcador**: Editar goles mientras el partido está en vivo
4. **Sincronización de Tabla**: Actualizar tabla de posiciones automáticamente
5. **Restricciones de Negocio**: Validar que no se pueda finalizar durante los 90 minutos

---

## 🏗️ Arquitectura Propuesta

### 1. **Estructura de Datos**

#### 1.1. Extensión de la Entidad Match
```typescript
interface Match {
  // ... campos existentes
  estado: EstadoMatch;
  golesEquipoLocal: number;
  golesEquipoVisitante: number;
  
  // NUEVOS CAMPOS
  horaInicio?: Date;           // Fecha/hora cuando cambió a "envivo"
  minutoActual?: number;       // Minuto actual del partido (0-90+)
  tiempoAgregado?: number;     // Tiempo agregado en minutos
  primeraParte?: boolean;       // true = primera parte, false = segunda parte
}
```

#### 1.2. Servicio de Gestión de Partidos
Crear un servicio que maneje:
- Cambio de estados con validaciones
- Cálculo automático de minutos transcurridos
- Actualización de tabla de posiciones

---

## 📐 Componentes a Crear/Modificar

### 2.1. **Componente: MatchLiveController**
**Ubicación**: `src/presentation/components/features/matches/match-live-controller.tsx`

**Responsabilidades**:
- Botón para iniciar partido (pendiente → envivo)
- Minutero en tiempo real
- Botón para finalizar (solo después de 90 min)
- Indicador visual de estado

**Props**:
```typescript
interface MatchLiveControllerProps {
  match: Match;
  jornadaId: string;
  onStateChange: (newState: EstadoMatch) => Promise<void>;
  onScoreUpdate: (local: number, visitor: number) => Promise<void>;
}
```

### 2.2. **Componente: MatchScoreEditor**
**Ubicación**: `src/presentation/components/features/matches/match-score-editor.tsx`

**Responsabilidades**:
- Inputs para editar marcador (solo cuando está en vivo)
- Validación de valores numéricos
- Botones +/- para incrementar/decrementar goles

**Props**:
```typescript
interface MatchScoreEditorProps {
  match: Match;
  jornadaId: string;
  onScoreChange: (local: number, visitor: number) => Promise<void>;
  disabled?: boolean;
}
```

### 2.3. **Componente: LiveMatchTimer**
**Ubicación**: `src/presentation/components/features/matches/live-match-timer.tsx`

**Responsabilidades**:
- Mostrar minutero en formato "MM' +TT" (ej: "45' +2")
- Actualizar cada minuto automáticamente
- Indicar primera/segunda parte
- Mostrar tiempo agregado

**Props**:
```typescript
interface LiveMatchTimerProps {
  horaInicio: Date;
  primeraParte?: boolean;
  tiempoAgregado?: number;
}
```

### 2.4. **Hook: useMatchTimer**
**Ubicación**: `src/presentation/hooks/use-match-timer.tsx`

**Responsabilidades**:
- Calcular minutos transcurridos desde horaInicio
- Determinar si está en primera o segunda parte
- Calcular tiempo agregado automáticamente

**Retorna**:
```typescript
{
  minutoActual: number;
  primeraParte: boolean;
  tiempoAgregado: number;
  tiempoTranscurrido: number; // en segundos
}
```

---

## 🔧 Servicios y Lógica de Negocio

### 3.1. **Servicio: MatchStateService**
**Ubicación**: `src/domain/services/match-state.service.ts`

**Métodos**:

#### `startMatch(jornadaId, matchId): Promise<void>`
- Cambia estado de "pendiente" a "envivo"
- Establece `horaInicio` = fecha actual
- Inicializa `minutoActual` = 0
- Establece `primeraParte` = true
- Resetea marcador a 0-0 si no está ya establecido

#### `updateMatchScore(jornadaId, matchId, local, visitor): Promise<void>`
- Actualiza marcador del partido
- Solo permite si estado = "envivo"
- Actualiza tabla de posiciones en tiempo real

#### `finishMatch(jornadaId, matchId): Promise<void>`
- Valida que hayan pasado mínimo 90 minutos
- Cambia estado a "finalizado"
- Calcula estadísticas finales
- Actualiza tabla de posiciones definitivamente

#### `canFinishMatch(match): boolean`
- Valida si el partido puede ser finalizado
- Debe estar en "envivo"
- Debe haber transcurrido mínimo 90 minutos

### 3.2. **Servicio: StandingsUpdateService**
**Ubicación**: `src/domain/services/standings-update.service.ts`

**Métodos**:

#### `updateStandingsFromMatch(match, torneo): Promise<void>`
- Calcula resultado del partido
- Actualiza estadísticas de ambos equipos:
  - Partidos jugados
  - Partidos ganados/empatados/perdidos
  - Goles a favor/contra
  - Diferencia de goles
  - Puntos
- Actualiza tabla acumulada también

#### `recalculateStandings(jornadaId, torneo): Promise<void>`
- Recalcula toda la tabla desde cero
- Útil para corregir inconsistencias

---

## 📱 Páginas a Modificar

### 4.1. **Página de Partidos** (`dashboard/partidos/page.tsx`)

**Modificaciones**:
- Agregar columna "Acciones" en la tabla de partidos
- Mostrar `MatchLiveController` para cada partido
- Mostrar `MatchScoreEditor` cuando está en vivo
- Mostrar `LiveMatchTimer` cuando está en vivo

### 4.2. **Página de Jornadas** (`dashboard/jornadas/page.tsx`)

**Modificaciones**:
- Agregar controles de gestión en cada partido
- Mostrar estado visual claro (pendiente/envivo/finalizado)
- Permitir iniciar partido desde aquí

---

## 🔄 Flujo de Trabajo

### 5.1. **Iniciar Partido**

```
1. Usuario hace clic en "Iniciar Partido"
2. Sistema valida que estado = "pendiente"
3. Sistema cambia estado a "envivo"
4. Sistema establece horaInicio = ahora
5. Sistema inicializa marcador 0-0
6. Sistema inicia minutero automático
7. UI muestra controles de edición de marcador
8. UI muestra minutero en tiempo real
```

### 5.2. **Actualizar Marcador Durante Partido**

```
1. Usuario edita marcador (inputs o botones +/-)
2. Sistema valida que estado = "envivo"
3. Sistema actualiza golesEquipoLocal/golesEquipoVisitante
4. Sistema actualiza tabla de posiciones en tiempo real:
   - Actualiza goles a favor/contra
   - Recalcula diferencia de goles
   - Reordena tabla si es necesario
5. UI refleja cambios inmediatamente
```

### 5.3. **Finalizar Partido**

```
1. Usuario hace clic en "Finalizar Partido"
2. Sistema valida:
   - Estado = "envivo"
   - Minutos transcurridos >= 90
3. Si válido:
   - Cambia estado a "finalizado"
   - Calcula estadísticas finales
   - Actualiza tabla de posiciones definitivamente
   - Detiene minutero
4. Si no válido:
   - Muestra error: "El partido debe tener mínimo 90 minutos"
```

---

## 🛡️ Validaciones y Restricciones

### 6.1. **Reglas de Negocio**

1. **Iniciar Partido**:
   - ✅ Solo si estado = "pendiente"
   - ✅ No se puede iniciar si ya está en otro estado

2. **Editar Marcador**:
   - ✅ Solo si estado = "envivo"
   - ✅ Valores >= 0
   - ✅ Números enteros únicamente

3. **Finalizar Partido**:
   - ✅ Solo si estado = "envivo"
   - ✅ Minutos transcurridos >= 90
   - ❌ No se puede finalizar durante los primeros 90 minutos

4. **Actualización de Tabla**:
   - ✅ Se actualiza en tiempo real mientras está en vivo
   - ✅ Se actualiza definitivamente al finalizar
   - ✅ Se actualiza tabla del torneo (apertura/clausura)
   - ✅ Se actualiza tabla acumulada

---

## 🎨 Diseño de UI

### 7.1. **Tarjeta de Partido en Vivo**

```
┌─────────────────────────────────────┐
│ [Badge: EN VIVO]      [Minutero: 45']│
│                                       │
│  [Escudo] Alianza Lima   2 - 1  [Escudo]│
│         Local              Visitante   │
│                                       │
│  [Editar Marcador] [+1 Local] [+1 Vis]│
│  [Input: 2]          [Input: 1]      │
│                                       │
│  [Botón: Finalizar Partido]          │
│  (Deshabilitado si < 90 min)         │
└─────────────────────────────────────┘
```

### 7.2. **Tarjeta de Partido Pendiente**

```
┌─────────────────────────────────────┐
│ [Badge: PENDIENTE]                  │
│                                       │
│  [Escudo] Alianza Lima   0 - 0  [Escudo]│
│         Local              Visitante   │
│                                       │
│  [Botón: Iniciar Partido]            │
└─────────────────────────────────────┘
```

### 7.3. **Tarjeta de Partido Finalizado**

```
┌─────────────────────────────────────┐
│ [Badge: FINALIZADO]                  │
│                                       │
│  [Escudo] Alianza Lima   2 - 1  [Escudo]│
│         Local              Visitante   │
│                                       │
│  Resultado final                     │
└─────────────────────────────────────┘
```

---

## 📊 Actualización de Tabla de Posiciones

### 8.1. **Algoritmo de Actualización**

Cuando un partido está en vivo o se finaliza:

1. **Obtener equipos involucrados**:
   - equipoLocalId
   - equipoVisitanteId

2. **Calcular resultado**:
   - Victoria local: golesLocal > golesVisitante
   - Victoria visitante: golesVisitante > golesLocal
   - Empate: golesLocal === golesVisitante

3. **Actualizar estadísticas de equipo local**:
   ```typescript
   partidosJugados += 1
   if (victoria) partidosGanados += 1, puntos += 3
   if (empate) partidosEmpatados += 1, puntos += 1
   if (derrota) partidosPerdidos += 1
   golesFavor += golesLocal
   golesContra += golesVisitante
   diferenciaGoles = golesFavor - golesContra
   ```

4. **Actualizar estadísticas de equipo visitante**:
   ```typescript
   partidosJugados += 1
   if (victoria) partidosGanados += 1, puntos += 3
   if (empate) partidosEmpatados += 1, puntos += 1
   if (derrota) partidosPerdidos += 1
   golesFavor += golesVisitante
   golesContra += golesLocal
   diferenciaGoles = golesFavor - golesContra
   ```

5. **Reordenar tabla**:
   - Por puntos (descendente)
   - Por diferencia de goles (descendente)
   - Por goles a favor (descendente)

6. **Actualizar en Firestore**:
   - Tabla del torneo (apertura/clausura)
   - Tabla acumulada

---

## 🔄 Sincronización en Tiempo Real

### 9.1. **Estrategia**

1. **Usar Firestore Listeners**:
   - `observeMatches()` para escuchar cambios en partidos
   - `observeStandings()` para escuchar cambios en tabla

2. **Actualización Optimista**:
   - Actualizar UI inmediatamente
   - Sincronizar con Firestore en background
   - Manejar errores y revertir si es necesario

3. **Debouncing**:
   - Agrupar múltiples actualizaciones de marcador
   - Actualizar tabla cada 5-10 segundos máximo

---

## 🧪 Casos de Prueba

### 10.1. **Escenarios a Validar**

1. ✅ Iniciar partido desde estado pendiente
2. ✅ No permitir iniciar partido ya iniciado
3. ✅ Editar marcador mientras está en vivo
4. ✅ No permitir editar marcador si no está en vivo
5. ✅ No permitir finalizar antes de 90 minutos
6. ✅ Permitir finalizar después de 90 minutos
7. ✅ Actualizar tabla correctamente al cambiar marcador
8. ✅ Actualizar tabla al finalizar partido
9. ✅ Minutero se actualiza correctamente
10. ✅ Múltiples partidos en vivo simultáneos

---

## 📝 Implementación por Fases

### **Fase 1: Estructura Base** (Prioridad Alta)
- [ ] Extender entidad Match con campos nuevos
- [ ] Crear servicio MatchStateService
- [ ] Crear hook useMatchTimer
- [ ] Actualizar repositorio con métodos necesarios

### **Fase 2: Componentes UI** (Prioridad Alta)
- [ ] Crear MatchLiveController
- [ ] Crear MatchScoreEditor
- [ ] Crear LiveMatchTimer
- [ ] Integrar en página de partidos

### **Fase 3: Lógica de Negocio** (Prioridad Alta)
- [ ] Implementar validaciones de estados
- [ ] Implementar cálculo de minutos
- [ ] Implementar restricción de 90 minutos

### **Fase 4: Actualización de Tabla** (Prioridad Media)
- [ ] Crear StandingsUpdateService
- [ ] Implementar actualización en tiempo real
- [ ] Implementar recálculo completo

### **Fase 5: Testing y Refinamiento** (Prioridad Media)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
- [ ] Ajustes de UI/UX
- [ ] Optimización de rendimiento

---

## 🚀 Consideraciones Técnicas

### 11.1. **Performance**
- Usar debouncing para actualizaciones frecuentes
- Cachear cálculos de tabla
- Lazy loading de componentes pesados

### 11.2. **Seguridad**
- Validar permisos antes de cambiar estados
- Validar datos antes de actualizar
- Manejar errores gracefully

### 11.3. **Escalabilidad**
- Soportar múltiples partidos simultáneos
- Manejar actualizaciones concurrentes
- Optimizar queries de Firestore

---

## 📚 Documentación Adicional

- [ ] Documentar API de servicios
- [ ] Documentar componentes
- [ ] Crear guía de usuario
- [ ] Crear guía de troubleshooting

---

## ✅ Checklist de Implementación

- [ ] Fase 1: Estructura Base
- [ ] Fase 2: Componentes UI
- [ ] Fase 3: Lógica de Negocio
- [ ] Fase 4: Actualización de Tabla
- [ ] Fase 5: Testing y Refinamiento
- [ ] Documentación completa
- [ ] Deploy a producción

---

**Fecha de Creación**: 2024
**Última Actualización**: 2024
**Versión**: 1.0
