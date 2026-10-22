# Avoir — Arquitectura

> Decisiones de arranque. Vivo; se actualiza por fase. Contexto completo del dominio:
> ver docs del proyecto Claude (`entendimiento-servicio.md`, `plan-desarrollo.md`).

## Principios
- **API-first**: web y móvil consumen la misma API. Nada de backend partido (el incumbente
  tiene web en un host y controladores móviles en otro; no lo heredamos).
- **Multi-tenant por diseño**: aislamiento por `company_id` con RLS en Postgres. El id de
  empresa **nunca** viaja suelto en la URL como autorización.
- **Tiempo real nativo**: posiciones/alarmas/chat vía Supabase Realtime.
- **Privacy-by-design**: permisos mínimos, consentimiento, retención, ruta de borrado.

## Componentes
```
┌──────────┐   ┌──────────┐        ┌───────────────────────┐
│ Web (SPA)│   │ App móvil │        │  Hardware GPS (campo) │
│ React/TS │   │ Flutter   │        │  trackers + periféricos│
└────┬─────┘   └────┬──────┘        └───────────┬───────────┘
     │ HTTPS/WSS    │ HTTPS/WSS                  │ TCP/UDP (protocolo de aire)
     ▼              ▼                            ▼
┌─────────────────────────────┐        ┌───────────────────────┐
│        Supabase             │        │     Device Gateway     │
│ Auth · Postgres+PostGIS     │◄───────┤  parser por protocolo  │
│ Realtime · Storage · RLS    │  write │  → normaliza a posición │
│ Edge Functions (lógica)     │        │  /evento común         │
└─────────────────────────────┘        └───────────────────────┘
           ▲  persistencia posiciones/eventos (worker de ingesta)
```

- **Supabase** = fuente de verdad (datos, auth, realtime, storage). Lógica server-side en
  Edge Functions.
- **Device Gateway** (`services/gateway`) = servicio de **larga duración** en EasyPanel/VPS.
  Serverless (Vercel/Edge) **no sirve** acá: el hardware usa TCP/UDP crudo y sesiones
  persistentes. Un codec por protocolo (Teltonika, Queclink, Concox/GT06, …) parsea la trama,
  la normaliza y la escribe vía el worker de ingesta. Diseño pluggable: agregar un protocolo =
  agregar un codec, sin tocar el resto.
- **Ingesta** (`services/ingest`) = normaliza y persiste posiciones/eventos; deriva alarmas
  (geozona, velocidad, pánico) y publica a Realtime.

## Stack
| Capa | Elección | Motivo |
|---|---|---|
| Web | React + TypeScript + Vite | moderno, rápido, ecosistema |
| Mapa | MapLibre GL (tiles configurables) | vectorial, sin lock-in de Google |
| Móvil | Flutter | background location + offline maduros |
| Backend/datos | Supabase (Postgres 17 + PostGIS) | auth+realtime+storage+RLS integrados |
| Gateway/ingesta | Node o Go (a decidir en el spike) | TCP persistente; Go si el volumen lo pide |
| Infra | Docker en EasyPanel + reverse proxy | alineado al stack actual de Martín |

## Escalabilidad (plan por fases)
- **Hoy (piloto ~100 equipos, pocas pos/seg):** Postgres + PostGIS alcanza de sobra.
- **Crecimiento del stream de posiciones:** migrar la tabla `position` a **TimescaleDB**
  (extensión de Postgres: hypertables, compresión, retención — sin reescribir la app) o
  particionado nativo por tiempo. Analítica pesada → ClickHouse como store aparte.
- `position` se diseña desde ya como candidata a hypertable (clave temporal + company/asset).

## Modelo de datos (núcleo MVP)
`company` · `app_user`(+rol) · `group` · `asset` · `device` · `position` · `event` ·
`geozone` · `control_point` · `work_schedule` · `alarm` · `form_template` · `form_submission` · `task`.
Aislamiento: RLS por `company_id` en toda tabla de negocio. Ver `supabase/migrations/0001_init.sql`.

## Decisiones abiertas (técnicas)
- Gateway en Node vs Go → se define en el spike con el primer protocolo real.
- Partición/Timescale de `position` → cuando el volumen lo justifique.
- Proveedor de tiles de mapa.
