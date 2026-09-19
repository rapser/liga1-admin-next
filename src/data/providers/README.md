# Sincronización en vivo con ESPN

La web y la app consumen Firestore; únicamente el backend consulta ESPN y
normaliza sus datos antes de guardarlos. No se usa scraping ni otro proveedor.

## Operación automática

- GitHub Actions ejecuta `mode=live` cada cinco minutos. Solo monitorea
  jornadas con `mostrar: true` desde cinco minutos antes del inicio hasta el
  cierre del partido.
- `mode=fixtures` se ejecuta cada seis horas para reflejar reprogramaciones,
  suspensiones y cancelaciones.
- `mode=reconcile` se ejecuta una vez al día como verificación de respaldo.

Para intervenir manualmente un partido, guardar `syncMode: "manual"` en su
documento. Al volver a `syncMode: "auto"` —o al retirar el campo— ESPN vuelve a
ser la fuente del encuentro.
