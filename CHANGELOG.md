# Changelog

Los cambios relevantes de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto utilizará [Versionado Semántico](https://semver.org/lang/es/) cuando comience a publicar etiquetas de versión.

## [Unreleased]

### Added

- Documentación del flujo Git desde feature/fix hasta producción.
- Guía de configuración, despliegue, verificación y rollback en Vercel.
- Documento inicial de historial de cambios.

### Changed

- Reorganización completa del README para priorizar tecnologías, arquitectura, dependencias, instalación y operación.
- Simplificación de la descripción de módulos y pantallas.

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
