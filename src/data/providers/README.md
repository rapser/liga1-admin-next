# Sincronización en vivo con ESPN

La web y la app consumen Firestore; únicamente el backend consulta ESPN y
normaliza sus datos antes de guardarlos. No se usa scraping ni otro proveedor.

## Operación automática

cron-job.org llama a `/api/live-sync` directamente sobre el dominio de
producción (`https://www.ligaoneper.uno`):

- `mode=live` cada minuto. Solo monitorea jornadas con `mostrar: true` desde
  cinco minutos antes del inicio hasta el cierre del partido.
- `mode=fixtures` cada seis horas para reflejar reprogramaciones, suspensiones
  y cancelaciones.
- `mode=reconcile` una vez al día como verificación de respaldo.

Cada job envía el header `Authorization: Bearer <CRON_SECRET>`. No se usa
`VERCEL_AUTOMATION_BYPASS_SECRET` porque el proyecto no tiene activado Vercel
Deployment Protection; el propio endpoint ya valida `CRON_SECRET` en código.

Antes se usaba un workflow de GitHub Actions (`schedule` cada 5 min), pero sus
disparos podían atrasarse más de una hora sin aviso (GitHub no da SLA a los
triggers `schedule`). Se reemplazó por cron-job.org, que sí es puntual.

Para intervenir manualmente un partido, guardar `syncMode: "manual"` en su
documento. Al volver a `syncMode: "auto"` —o al retirar el campo— ESPN vuelve a
ser la fuente del encuentro.
