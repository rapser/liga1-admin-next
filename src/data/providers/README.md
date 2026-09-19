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

El workflow requiere los secrets `CRON_SECRET` y
`VERCEL_AUTOMATION_BYPASS_SECRET`, además de la variable `ADMIN_BASE_URL` en
GitHub Actions. El segundo permite que el job llegue al endpoint sin desactivar
la protección de Vercel.

Para intervenir manualmente un partido, guardar `syncMode: "manual"` en su
documento. Al volver a `syncMode: "auto"` —o al retirar el campo— ESPN vuelve a
ser la fuente del encuentro.
