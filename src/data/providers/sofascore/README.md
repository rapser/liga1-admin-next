# Sincronización en vivo

Los adaptadores se usan solo en el servidor; la app/web únicamente leen
Firestore. `LIVE_DATA_PROVIDER=espn` es el valor predeterminado y fue verificado
con los 306 encuentros de Liga 1 2026. `sofascore` queda disponible si se cuenta
con acceso autorizado estable; `auto` intenta SofaScore y usa ESPN si falla.

SofaScore no ofrece aquí un contrato de API pública y su host web respondió 403
desde servidor durante la implementación. No se deben eludir sus controles
antibot. Mantener ESPN o configurar una URL autorizada en `SOFASCORE_BASE_URL`.

## Activación segura

1. Configurar `CRON_SECRET`, credenciales Firebase Admin y las variables de
   proveedor del `.env.example`.
2. Desplegar con `LIVE_SYNC_ENABLED=false`.
3. Ejecutar `GET /api/live-sync?mode=reconcile&dryRun=true` con la cabecera
   `Authorization: Bearer <CRON_SECRET>` y revisar `unmatched`.
4. Corregir alias o partidos de Firestore que no coincidan; repetir hasta que
   todos los encuentros esperados estén enlazados.
5. Activar `LIVE_SYNC_ENABLED=true` y ejecutar una vez
   `mode=reconcile&adopt=true`. Esta adopción explícita enlaza los documentos
   sin `syncMode`, no toca los que ya estén en `manual` y no envía pushes.
6. El scheduler externo ya está automatizado en
   `.github/workflows/live-sync.yml` (mismos secrets que
   `weather-refresh.yml`): `mode=live` cada 5 minutos, `mode=fixtures` cada 6
   horas y `mode=reconcile` una vez de madrugada. No requiere pasos manuales
   adicionales una vez mergeado a `main`.

Para proteger un partido y operarlo desde el admin, guardar
`syncMode: "manual"` en su documento. Para devolverlo al proveedor usar
`syncMode: "auto"`.

Para una activación controlada de un solo encuentro se puede añadir
`eventId=<id del proveedor>&adopt=true`; los demás partidos no se procesan.

Para monitorear localmente un solo partido usar
`npm run monitor:live -- <eventId>`. El proceso ejecuta una última
sincronización cuando el proveedor informa `finalizado` o `anulado` y luego se
cierra automáticamente. También tiene un límite de seguridad de seis horas,
configurable con `LIVE_MONITOR_MAX_DURATION_MS`; el intervalo se configura con
`LIVE_MONITOR_INTERVAL_MS` (45 segundos por defecto).

Si el horario ya es conocido, se puede dejar programado sin consumir consultas
durante la espera. Por ejemplo, para activarlo cinco minutos antes:
`LIVE_MONITOR_START_AT=2026-09-19T00:55:00Z npm run monitor:live -- <eventId>`.

Las escrituras actualizan el partido, reconstruyen Apertura/Clausura/Acumulado
y registran cada push en `liveSyncEvents` para no repetir goles, inicio o final.
