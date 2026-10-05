# Changelog

Los cambios relevantes de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto utilizará [Versionado Semántico](https://semver.org/lang/es/) cuando comience a publicar etiquetas de versión.

## [Unreleased]

## [0.2.0] - 2026-10-04

> ⚠️ **Antes de desplegar**: la app iOS solo muestra jornadas con `horariosConfirmados: true`. Hay que confirmar las jornadas ya cargadas (`npm run backfill:horarios -- --apply`) y pegar `firestore.squads.rules` en la consola de Firebase para habilitar la lectura pública de las plantillas.

### Added

- Campo `horariosConfirmados` en las jornadas: indica que los partidos ya tienen fecha y hora oficial. La página de Jornadas permite confirmarlo o quitarlo; confirmar exige los 9 partidos, sin la fecha placeholder del generador y sin que todos compartan el mismo instante (señal de fecha provisional), y guarda el rango real en `fechaInicio` y `fechaFin`.
- Editor de fecha y hora (hora de Lima) en cada partido pendiente. Al fijar la hora a mano se guarda `fechaManual: true`, para que el proveedor en vivo no la sobrescriba; "Volver al proveedor" la libera.
- `npm run fixtures:wikipedia -- --jornada 14,15`: carga fechas y horas oficiales del Clausura desde Wikipedia. Muestra una vista previa y solo escribe con `--apply`; confirma una jornada únicamente si sus 9 partidos quedan con fecha y hora válidas, y no toca las jornadas con problemas.
- `npm run backfill:horarios`: marca como confirmadas las jornadas que ya tenían horarios cargados (vista previa por defecto, `--apply` para escribir, `--max-clausura` para limitar el Clausura).
- Página Equipos (`/dashboard/equipos`): plantilla de cada equipo, importación desde ESPN, búsqueda de fotos en Wikidata y edición manual de la URL de la foto de cada jugador.
- Endpoints `POST /api/squads/import` (plantillas desde ESPN) y `POST /api/squads/photos` (fotos desde Wikidata), con `?dryRun=true`. Autorizan con `Authorization: Bearer $CRON_SECRET` o con la sesión de un admin (`isAuthorizedAdminRequest`). El importador no pisa fotos manuales y da de baja (`active: false`) a quien ya no está en el plantel.
- Colección `equipos/{code}/players` y `firestore.squads.rules` con su regla de lectura pública y escritura solo para admins.
- Workflow de GitHub Actions que refresca el clima de las sedes cada 6 horas invocando `POST /api/weather/refresh`, con disparo manual desde la pestaña Actions.
- Documentación del refresco programado del clima y de sus dos disparadores (Vercel Cron y GitHub Actions).
- Documentación del flujo Git desde feature/fix hasta producción.
- Guía de configuración, despliegue, verificación y rollback en Vercel.
- Resumen de los módulos funcionales, sus rutas y responsabilidades.
- Referencia de la jerarquía, documentos y campos principales de Firestore.
- Guía explícita para ejecutar la aplicación con npm en `localhost:3000`.
- Inicio rápido paso a paso desde la apertura de Terminal hasta la ejecución del servidor de desarrollo.
- Diagrama de Clean Architecture, flujo de dependencias y árbol ampliado de carpetas del proyecto.
- Resumen de ingeniería, decisiones técnicas, trade-offs y fronteras cliente/servidor.
- Controles actuales de calidad, seguridad, rendimiento, integridad y recuperación.
- Limitaciones conocidas y roadmap priorizado de seguridad, pruebas, CI, observabilidad y arquitectura.
- Referencias oficiales de Next.js, Firebase, Vercel y GitHub utilizadas como base técnica.
- Documento inicial de historial de cambios.

### Changed

- La página de Jornadas lista todas las jornadas (antes solo las activas), de modo que una jornada sin confirmar también se puede editar, y abre en la próxima jornada confirmada que aún no termina.
- El sync en vivo y el refresco de clima trabajan solo con jornadas con `horariosConfirmados`. El sync en vivo respeta `fechaManual`.
- Dashboard y Partidos listan las jornadas con horarios confirmados (`fetchConfirmedJornadas`).
- El generador del Clausura crea las jornadas con `horariosConfirmados: false` y usa una fecha placeholder explícita en hora de Lima.
- Versión del paquete: 0.1.0 → 0.2.0.
- El cron de clima en `vercel.json` pasa de cada 12 horas a una vez al día: el plan Hobby de Vercel rechaza en el despliegue cualquier expresión más frecuente.
- Reorganización completa del README para priorizar tecnologías, arquitectura, dependencias, instalación y operación.
- Simplificación del detalle operativo de las pantallas para mantener una descripción breve y sostenible de cada módulo.

### Removed

- El campo `mostrar` de las jornadas: ya no se lee ni se escribe, y desaparecieron el badge y el botón "Activa/Inactiva", `fetchVisibleJornadas` y `toggleJornadaVisibility`. Los documentos antiguos lo conservan sin efecto.

## [0.1.0] - 2026-07-19

Primera versión documentada del estado actual del panel administrativo.

### Added

- Panel administrativo con autenticación y rutas protegidas.
- Gestión de jornadas, partidos, noticias, posiciones y configuración.
- Actualizaciones en tiempo real con Firestore.
- Tablas independientes de Apertura y Clausura, además de la tabla Acumulada.
- Transición operativa del Apertura al Clausura y generación de jornadas.
- Notificaciones push mediante Firebase Cloud Messaging.
- Herramienta `repair:clausura` para auditar y reconstruir las posiciones desde partidos finalizados.

### Changed

- Optimización de consultas y suscripciones en dashboard, jornadas, partidos y posiciones.
- Recalculo automático del Acumulado después de actualizar estadísticas.

### Fixed

- Corrección del cálculo del Clausura para leer exclusivamente las estadísticas del torneo correspondiente.
- Reconstrucción de los datos de Clausura y Acumulado afectados por valores heredados del Apertura.
