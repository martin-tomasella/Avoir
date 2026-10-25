# Supabase (Avoir)

## Proyecto
- **Project ref:** `ohmovnyeypeppswqxzhx` (reutiliza el proyecto antes llamado "VETCOM";
  tablas previas vacías, eliminadas). Región `us-east-1`. Postgres 17 + PostGIS.
- Renombrar el proyecto a "Avoir" se hace desde el **dashboard** (no vía MCP/API).

## Migraciones
- `migrations/0001_init.sql` — **APLICADA**. Esquema núcleo multi-tenant (16 tablas) con
  PostGIS y **RLS activada** en todas, aislamiento por `company_id`
  (`current_company_id()` / `is_super_admin()`).

## Estado de advisors (revisado tras 0001)
Los datos están protegidos: RLS gatea todas las tablas (un rol `anon` ve 0 filas).
Avisos restantes, triados:
- **spatial_ref_sys sin RLS (ERROR):** tabla de referencia de PostGIS (SRIDs), datos
  públicos. No se puede habilitar RLS (la posee la extensión). **Falso positivo, se ignora.**
- **postgis en schema `public` (WARN):** hardening futuro = mover a schema `extensions`.
- **GraphQL expone tablas a anon/authenticated (WARN):** es discoverability del esquema vía
  pg_graphql, no acceso a datos (RLS protege las filas). No usamos GraphQL; se puede
  deshabilitar pg_graphql o revocar `select` a `anon` donde no aplique.
- **Funciones SECURITY DEFINER ejecutables (WARN):** `current_company_id`/`is_super_admin`
  son helpers de las políticas RLS (necesitan ser ejecutables por `authenticated`); para
  `anon` devuelven null/false, no filtran nada. Las de PostGIS (`st_estimatedextent`) son ruido.

## Pendiente
- Configurar Auth (proveedores, plantillas), buckets de Storage (fotos/firmas de formularios),
  canales de Realtime (posiciones/alarmas).
- Seed de un tenant demo + primer usuario admin para validar RLS punta a punta.
- Generar tipos TypeScript para el front.
