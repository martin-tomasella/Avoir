# Avoir Web

Front web (React + TS + Vite + Supabase + MapLibre GL).

## Correr en local
```bash
cd apps/web
cp .env.example .env     # completar con la URL y la clave publishable del proyecto
npm install
npm run dev              # http://localhost:5173
```

## Build
```bash
npm run build            # genera dist/ (estático)
npm run preview          # sirve el build
```

## Demo
Usuario sembrado: **demo@avoir.app / avoir1234** (tenant "Inteltech Demo").
Al entrar: mapa en vivo con 6 activos alrededor de Buenos Aires, lista lateral,
tabla de activos y alarmero.

## Despliegue (EasyPanel)
El build es estático (`dist/`). Servir con Nginx o similar (imagen `nginx:alpine`
copiando `dist/` a `/usr/share/nginx/html`). Variables `VITE_*` se inyectan en build.

## Estado
- Implementado: Auth (login), Mapa en vivo (MapLibre + Realtime), Activos, Alarmero.
- Placeholders: Geozonas, Jornadas, Formularios, Tareas, Usuarios (próximas iteraciones).
- Mapa usa tiles demo de MapLibre; reemplazar por MapTiler/otro con `VITE_MAP_STYLE`.
