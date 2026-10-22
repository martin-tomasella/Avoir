# Avoir — Baseline de seguridad

> Lo que el incumbente hace flojo y nosotros resolvemos de entrada. Checklist vivo.

## Multi-tenant
- RLS activada en **toda** tabla de negocio; política por `company_id = current_company_id()`.
- El id de empresa **no** autoriza por estar en la URL. La autorización sale del JWT/sesión.
- Rol en claim verificado server-side (no confiar en el cliente).
- Tests de aislamiento entre tenants antes de cada release (lo que quedó pendiente de probar
  en el incumbente: IDOR por ObjectId en la URL).

## Transporte / API
- HTTPS en todo; HSTS. Nada de cleartext.
- Reverse proxy (Traefik/Nginx) delante de API y gateway: **rate-limiting**, reglas WAF
  básicas, límites de tamaño, timeouts. fail2ban en el VPS.
- CORS explícito (allowlist), no `*`.
- Cabeceras: CSP (con nonces), `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`. (El incumbente **no** tiene CSP ni XFO.)

## App móvil
- **Certificate pinning** (el APK actual no lo tiene).
- Permisos **mínimos** y pedidos en contexto, con consentimiento explícito y revocable.
- **Sin** device-admin anti-desinstalación. Cifrado en reposo del dato local + ruta de borrado.
- `minSdk` moderno (≥24). Firma v2+v3.

## Device Gateway (hardware)
- Autenticación/allowlist de dispositivos (IMEI/serial dado de alta antes de aceptar tramas).
- Validación estricta del parser (entradas no confiables, binario) — fuzzing de los codecs.
- Rate/flood protection por conexión; aislamiento del proceso.
- TLS/DTLS donde el equipo lo soporte; si no, túnel/APN privado.

## Datos / privacidad
- Secretos en gestor (no en repo ni en el cliente). `.env` fuera de git.
- Claves de mapa/API restringidas por dominio/app+SHA.
- Sin PII a terceros (el incumbente manda nombre+empresa a Google Analytics).
- Política de **retención** de posiciones y **borrado** por pedido (GDPR/datos laborales).
- Auditoría de accesos y acciones sensibles.

## Proceso
- Dependencias al día (Dependabot); SAST en CI.
- Revisión de `get_advisors` de Supabase tras cada cambio de esquema.
- Backups y plan de restauración.
