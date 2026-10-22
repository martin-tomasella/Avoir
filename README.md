# Avoir — Plataforma de gestión de recursos en campo

Plataforma multi-tenant de localización y operación de fuerza de trabajo en campo.
Reemplazo conceptual y modernización de GeoGestión, construido API-first.

> Estado: **bootstrap** (Fase 0). Objetivo: piloto con clientes amigos en ~60 días.

## Alcance del MVP
- **Localización**: posición en tiempo real, geozonas, puntos de control.
- **Organización**: grupos, usuarios, equipos/activos.
- **Alarmas**: atención/lone-worker, geozona, velocidad; asignación y cierre.
- **Formularios** y **Tareas** (field service, offline).
- **Panel de control**: usuarios de plataforma, roles, jornadas de trabajo.

Fuera del MVP (después): comercial (pedidos/almacén/CRM/facturación), reportes avanzados, white-label completo.

## Monorepo
```
apps/web        Frontend web (React + TS + Vite)
apps/mobile     App de campo (Flutter) — tracking background, offline
services/gateway  Device Gateway: ingesta de hardware GPS por protocolo de aire (TCP/UDP)
services/ingest   Normalización/persistencia de posiciones y eventos
packages/shared   Tipos y contratos compartidos
supabase/         Migraciones y config de la base (Postgres + PostGIS + RLS)
infra/            Docker / EasyPanel / reverse-proxy
docs/             Arquitectura y seguridad
```

## Fuentes de reporte
1. **App móvil** (Flutter) — posición en background, fichaje, tareas, formularios.
2. **Hardware GPS propietario** — personal trackers y GPS con periféricos (p. ej. sensores
   de temperatura, entradas digitales usadas como botón de pánico). Cada modelo habla su
   **protocolo de aire** (binario, TCP/UDP). El **Device Gateway** parsea y normaliza al
   modelo común `position`/`event`.

Ver `docs/ARCHITECTURE.md` y `docs/SECURITY.md`.
