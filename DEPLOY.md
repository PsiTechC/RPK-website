# Deploying RPK on a VPS with Docker

The whole stack — **Postgres + Go API + Expo web (nginx)** — runs from one
`docker compose` file. nginx serves the static site and proxies `/api` and
`/uploads` to the backend, so the browser only ever talks to one origin.

## Prerequisites (on the VPS, once)

- A Linux VPS (Ubuntu/Debian recommended) with **2 GB+ RAM** (the web build needs it).
- Docker Engine + the Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Port **80** open in the firewall / security group.

## 1. Get the code onto the server

```bash
git clone <your-repo-url> rpk && cd rpk
# (or copy the folder up with scp/rsync)
```

## 2. Configure secrets

```bash
cp .env.example .env
nano .env          # set POSTGRES_PASSWORD and JWT_SECRET (required)
```
Generate a strong JWT secret with: `openssl rand -hex 32`.
Add `ANTHROPIC_API_KEY` if you want the AI chatbot (optional).

## 3. Build & start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
First build takes a few minutes (Go compile + Expo web export). On boot the
backend auto-migrates the schema and seeds 11 categories / 76 products.

Visit **http://YOUR_VPS_IP/** — the store is live.
Default admin login (created by the seed): `admin@rpkfood.ae` / `Admin@123`
— **change this password after first login.**

## Everyday commands

```bash
docker compose -f docker-compose.prod.yml ps              # status
docker compose -f docker-compose.prod.yml logs -f backend # logs
docker compose -f docker-compose.prod.yml up -d --build   # redeploy after code changes
docker compose -f docker-compose.prod.yml down            # stop (keeps data)
```

Data persists in named volumes: `pgdata` (database) and `uploads`
(admin-uploaded product images). They survive `down`/`up`; remove with
`down -v` only if you want a clean slate.

## Add a domain + HTTPS (recommended)

The compose file serves plain HTTP on port 80. To put it on a domain with a
free TLS certificate, the simplest path is to add **Caddy** in front:

1. Point your domain's A record at the VPS IP.
2. Change the `web` service to publish on an internal port instead of 80:
   ```yaml
   web:
     ports: []
     expose: ["80"]
   ```
3. Add a Caddy service that reverse-proxies your domain to `web`:
   ```yaml
   caddy:
     image: caddy:2-alpine
     restart: unless-stopped
     ports: ["80:80", "443:443"]
     command: caddy reverse-proxy --from yourdomain.com --to web:80
     volumes: ["caddy_data:/data"]
   # add `caddy_data:` under top-level volumes
   ```
Caddy fetches and renews the Let's Encrypt certificate automatically.

## Notes

- The frontend auto-detects same-origin in production (no API URL is baked in),
  so you don't need to configure a backend URL.
- Product **catalogue** images currently hot-link from Wikimedia Commons.
  Admin-**uploaded** images are stored in the `uploads` volume and served via
  the backend. For heavy traffic, move uploads to object storage (S3/R2).
- Postgres is **not** published to the host (only reachable inside the Docker
  network) for safety.
