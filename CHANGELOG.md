# Changelog

Los cambios relevantes de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto utilizará [Versionado Semántico](https://semver.org/lang/es/) cuando comience a publicar etiquetas de versión.

## [Unreleased]

### Added

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

- Reorganización completa del README para priorizar tecnologías, arquitectura, dependencias, instalación y operación.
- Simplificación del detalle operativo de las pantallas para mantener una descripción breve y sostenible de cada módulo.

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
