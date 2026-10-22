# Device Gateway

Servicio de larga duración (EasyPanel/VPS) que recibe tramas del **hardware GPS** por su
**protocolo de aire** (TCP/UDP), las parsea y las normaliza al modelo común de Avoir.

## Por qué separado de la API
El hardware habla binario sobre sockets persistentes. Serverless (Vercel/Supabase Edge) no
sirve: no hay TCP crudo ni sesiones largas. El gateway corre como proceso Docker dedicado.

## Diseño pluggable (un codec por protocolo)
```
services/gateway/
  src/
    server/        listeners TCP/UDP (por puerto/protocolo)
    codecs/        un módulo por protocolo: teltonika/, queclink/, concox/, ...
    core/          interfaz Codec + modelo normalizado + registro de dispositivos
    sink/          publica a ingest (posición/evento normalizado)
  sim/             simulador de tramas para tests sin hardware
```

Agregar un protocolo nuevo = agregar un `codec` que implemente:

```ts
interface Codec {
  protocol: string;
  // decodifica un buffer entrante → mensajes normalizados (0..n)
  decode(buf: Buffer, ctx: ConnContext): DecodedMessage[];
  // respuesta/ack que el equipo espera (keep-alive, confirmaciones)
  ack?(msg: DecodedMessage): Buffer | null;
}

type DecodedMessage =
  | { kind: 'position'; identifier: string; ts: string; lat: number; lon: number;
      speed?: number; heading?: number; altitude?: number; satellites?: number;
      attributes?: Record<string, unknown> }   // IO: temp, entradas, batería
  | { kind: 'event'; identifier: string; ts: string; type: string;
      lat?: number; lon?: number; payload?: Record<string, unknown> };
```

`core` resuelve `identifier` → `device` (alta previa; allowlist), aplica company_id y
delega en `sink`. Los periféricos (sensor de temperatura, entradas digitales = pánico)
viajan en `attributes`/`payload` y se mapean a eventos/alarmas en la ingesta.

## Pendiente
- Specs de aire de cada equipo del piloto (las pasa Martín). Hasta entonces el gateway
  se desarrolla contra `sim/` con un codec de referencia.
- Decisión Node vs Go (spike con el primer protocolo real).
