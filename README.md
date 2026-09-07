# SentryVMS — Web-Based Video Management System

A reference implementation of a web-based VMS covering: JWT authentication with
role-based access control, camera management, live monitoring, recording &
playback, event management, search, Docker deployment, and OpenAPI docs.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full system design
(architecture diagram, data model, RBAC model, streaming/recording pipeline).

## Stack

| Layer | Technology |
|---|---|
| Backend API | NestJS (TypeScript), PostgreSQL, Redis, Socket.IO |
| Media relay | [MediaMTX](https://github.com/bluenviron/mediamtx) (RTSP ingest → HLS/WebRTC) |
| Recording | FFmpeg segment recorder → MinIO (S3-compatible) |
| Frontend | React + TypeScript, Vite, Tailwind, hls.js |
| Deployment | Docker Compose |

## Quick start

```bash
git clone <this repo>
cd vms

cp backend/.env.example backend/.env
# edit backend/.env — set real secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# CAMERA_SECRET_KEY, S3_SECRET_KEY, etc.) before any non-local deployment

docker compose up -d --build
```

Services once up:

| Service | URL |
|---|---|
| Web app | http://localhost:8080 |
| API + Swagger docs | http://localhost:3000/api/docs |
| MinIO console | http://localhost:9001 |
| MediaMTX RTSP ingest | rtsp://localhost:8554/\<mediaPath\> |

### Create the first admin user

```bash
docker compose exec backend node dist/seed.js
# creates admin@example.com / ChangeMe123! by default
# override with ADMIN_EMAIL / ADMIN_PASSWORD env vars on the container
```

Log in at http://localhost:8080/login, then change the password and add
real users under **Users** (admin only — currently managed via the API/Swagger;
see `POST /api/users`).

### Adding a camera

1. Sign in as an admin → **Cameras** → **Add camera**.
2. Enter the camera's RTSP URL (e.g. `rtsp://192.168.1.50:554/stream1`) and
   credentials if required. Credentials are encrypted at rest (AES-256-GCM).
3. On save, the backend registers a pull-source path with MediaMTX so it
   starts relaying the stream — no MediaMTX config file edits needed.
4. The camera appears on the **Live Monitoring** dashboard once MediaMTX
   confirms the source is ready (a few seconds after registration).
5. Recording starts automatically per the camera's `recordingMode`
   (continuous/motion/scheduled/disabled). `RecordingsService` reconciles
   running recorders against camera config on startup and every 5 minutes
   (see `RecordingsService.syncRecorders`), so mode changes made via the API
   take effect without a restart, just with up to a 5-minute delay.

## Roles

| Role | Can do |
|---|---|
| Admin | Everything: manage users, cameras, retention, view audit trail |
| Operator | Live view, playback, acknowledge events, cannot manage users/cameras |
| Viewer | Live view + playback only, optionally scoped to specific camera groups |

## API documentation

Full interactive OpenAPI/Swagger docs are served by the running backend at
**`/api/docs`**, and the raw spec at **`/api/docs-json`**. Every endpoint,
DTO, and required role is documented there — it's generated directly from
the NestJS controllers, so it never drifts from the actual implementation.

## Project layout

```
vms/
├── docs/
│   └── ARCHITECTURE.md      # full system design
├── backend/                 # NestJS API (auth, cameras, streaming,
│   └── src/                 #   recordings, events, search)
├── frontend/                # React SPA
├── docker-compose.yml       # full stack: postgres, redis, minio,
└── ...                      #   mediamtx, backend, frontend
```

## Known limitations of this reference build

This is a solid, working starting point — not a hardened production system.
Before going live, plan for:

- **TLS**: put a reverse proxy (nginx/Traefik) with real certificates in
  front of everything; the bundled nginx container serves plain HTTP.
- **Migrations**: the backend uses TypeORM `synchronize: true` for
  convenience. Replace with versioned migrations before production use.
- **Recorder resilience**: `RecorderManagerService` runs one ffmpeg process
  per camera inside the API container, reconciled against camera config on
  startup and every 5 minutes (`RecordingsService.syncRecorders`). At real
  20–100 camera scale, split recording into its own service/containers (one
  per camera group) so a crash doesn't affect the API, and add tighter
  process supervision/auto-restart than the periodic reconcile loop.
- **ONVIF discovery/PTZ**: only a generic RTSP URL + optional ONVIF URL field
  are modeled; PTZ control and auto-discovery are not implemented.
- **AI/motion analytics**: the `Events` module accepts events from any
  producer via `POST /api/events/ingest` (motion, tamper, offline, etc.) —
  wire in an analytics sidecar or MediaMTX webhook to actually produce them.
- **Secrets**: all example secrets in `.env.example` must be replaced.
- **Horizontal scaling**: the API is stateless and can be replicated behind
  a load balancer; MediaMTX/recorders need their own scaling story per the
  architecture doc.
