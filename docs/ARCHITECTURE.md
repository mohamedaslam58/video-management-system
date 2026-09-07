# Video Management System (VMS) — Architecture & Design

## 1. Scope & assumptions

- Target scale: **20–100 IP cameras** (RTSP/ONVIF), single-site or small multi-site deployment.
- Stack: **NestJS (TypeScript) + PostgreSQL + Redis** backend, **React + TypeScript** frontend,
  **MediaMTX** as the RTSP ingestion/relay engine, **FFmpeg** for segment recording,
  **MinIO (S3-compatible)** for recording storage, all orchestrated with **Docker Compose**.
- This repo is a working, runnable **reference implementation** of the core platform
  (auth/RBAC, camera registry, live view, recording pipeline, event bus, search, API docs).
  Wiring it to real physical cameras only requires pointing camera RTSP URLs at MediaMTX —
  no code changes needed. Advanced analytics (VMD/AI object detection) is stubbed as an
  event-producer interface so a detection microservice can be dropped in later.

## 2. High-level architecture

```
                                   ┌─────────────────────────────────────────┐
                                   │              Cameras (RTSP)              │
                                   └───────────────┬───────────────────────-─┘
                                                    │ RTSP push/pull
                                                    ▼
┌───────────────┐   HLS/WebRTC   ┌───────────────────────────┐   segments   ┌─────────────┐
│   React SPA    │◄──────────────┤        MediaMTX             │────────────►│   FFmpeg     │
│ (nginx-served) │                │  (RTSP ingest + relay)      │  (recorder)  │  workers     │
└───────┬───────┘                └───────────────┬────────────┘              └──────┬──────┘
        │ REST/WS (JWT)                            │ stream status/webhooks           │ MP4/TS
        ▼                                          ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────┐     ┌───────────────┐
│                          NestJS API Gateway                            │     │  MinIO (S3)    │
│  Auth · Users · Cameras · Streaming · Recordings · Events · Search     │◄────┤  recordings/   │
│  REST controllers + Swagger + WS gateway (live events)                 │     │  thumbnails/   │
└───────────┬───────────────────────────────────────┬───────────────────┘     └───────────────┘
            │                                         │
            ▼                                         ▼
     ┌─────────────┐                           ┌─────────────┐
     │ PostgreSQL   │                           │    Redis     │
     │ (system data)│                           │ cache/pubsub │
     └─────────────┘                           └─────────────┘
```

**Why this split:** camera protocol handling (RTSP/ONVIF, transcoding, HLS/WebRTC packaging)
is a solved, CPU/IO-heavy problem — MediaMTX + FFmpeg handle it natively and scale
independently of the API. The NestJS API stays stateless and only deals with
metadata, auth, orchestration and search, so it can be horizontally scaled behind a
load balancer without touching media pipelines.

## 3. Core domains / modules

| Module | Responsibility |
|---|---|
| **Auth** | Login, JWT access + refresh tokens, password hashing (argon2), token rotation, logout/blacklist via Redis |
| **Users** | User CRUD, role assignment, profile, account lockout after failed attempts |
| **Cameras** | Camera & camera-group CRUD, connection test, ONVIF metadata, enable/disable, health/status |
| **Streaming** | Issues short-lived signed live-view tokens, proxies MediaMTX status, live stream URL resolution (HLS/WebRTC) |
| **Recordings** | Recording profile config (continuous/motion/scheduled), segment metadata index, retention policy, playback URL generation |
| **Events** | Event ingestion (motion, camera offline/online, disk full, tamper, manual bookmark), WebSocket fan-out, acknowledgment workflow |
| **Search** | Cross-entity search: recordings by camera+time range, events by type/severity/camera/time, saved filters |
| **Audit** | Immutable audit trail of security-relevant actions (login, RBAC changes, camera config changes, export) |

## 4. Role-based access control

| Role | Permissions |
|---|---|
| **Admin** | Full access: user management, camera/system config, retention policy, audit log |
| **Operator** | Live monitoring, PTZ control, acknowledge events, playback/export, cannot manage users or system config |
| **Viewer** | Live monitoring + playback (read-only), no export, no ack, scoped to assigned camera groups |

Implemented via a `@Roles()` decorator + `RolesGuard` reading the JWT payload, plus a
`CameraGroupGuard` for per-resource scoping (a Viewer can be restricted to specific
camera groups, e.g. "Building A only").

## 5. Data model (simplified ERD)

```
User ──< UserRole >── Role
  │
  └─< AuditLog

Camera ──< CameraGroupMembership >── CameraGroup
  │  1
  │  │
  ├──< RecordingProfile (schedule, retention, quality)
  ├──< RecordingSegment (path, start, end, size, checksum)
  └──< Event (type, severity, timestamp, payload, acknowledgedBy)
```

Key entities and fields are implemented as TypeORM entities under
`backend/src/**/*.entity.ts`.

## 6. Streaming & recording pipeline

1. Admin registers a camera with its RTSP URL + credentials → API stores it encrypted
   at rest (AES-256-GCM, key from env/secret manager) and pushes a **path config**
   to MediaMTX via its REST control API.
2. MediaMTX pulls the RTSP stream and re-serves it as **HLS** (broad browser support)
   and **WebRTC** (low latency) for the frontend `<video>` player.
3. A per-camera **FFmpeg recorder** (spawned/managed by the `recordings` module,
   one process/container per active recording profile) segments the stream into
   fixed-length MP4/TS chunks (default 5 min), uploads them to MinIO, and writes a
   `RecordingSegment` row with time range + checksum.
4. **Playback** resolves a requested time range to the covering segments and either
   streams them directly (single segment) or serves an HLS playlist stitched from
   multiple segments (multi-segment range).
5. **Retention**: a scheduled job purges segments older than the camera's retention
   policy from both MinIO and the DB index.
6. **Events**: motion/tamper/offline events are POSTed to `/events/ingest` (from
   MediaMTX webhooks, an analytics sidecar, or FFmpeg motion filters) and fan out to
   connected clients over a WebSocket gateway (`events.gateway.ts`) and are
   persisted for search/audit.

## 7. Non-functional design notes

- **Horizontal scaling**: API is stateless (JWT, no sticky sessions); scale via
  replicas behind nginx/ALB. MediaMTX and FFmpeg workers scale per-camera-group on
  separate hosts if needed for 100+ cameras.
- **Security**: TLS termination at nginx, JWT short-lived (15 min) + rotating
  refresh tokens, argon2id password hashing, RBAC + per-resource scoping, camera
  credentials encrypted at rest, audit log for all privileged actions, rate limiting
  on auth endpoints.
- **Observability**: structured JSON logs, `/health` and `/metrics` (Prometheus
  format) endpoints, camera heartbeat/offline detection.
- **API docs**: OpenAPI 3 generated from NestJS decorators, served at `/api/docs`
  (Swagger UI) and exported as `openapi.json`.

## 8. What's intentionally out of scope here

- AI-based video analytics (object/face detection) — designed as a pluggable event
  producer, not implemented.
- Multi-site federation / edge-cloud sync.
- Mobile native apps (the React app is responsive but not a native client).
- Hardware NVR integration beyond generic RTSP/ONVIF.

These are natural v2 extensions once the core platform is deployed.
