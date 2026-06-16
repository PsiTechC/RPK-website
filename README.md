# RPK For Food Trading — E-commerce Platform

Full-stack e-commerce site for **RPK FOR FOOD TRADING CO. L.L.C** (Dubai, UAE).
Sells groceries & food products, supports international **import/export** business
registration, an **AI chatbot**, and a full **admin panel** for managing products,
orders, payments and registrations.

## Stack

| Layer    | Tech                                             |
|----------|--------------------------------------------------|
| Frontend | React Native Web (Expo) + Expo Router            |
| Backend  | Go (chi router) REST API                         |
| Database | PostgreSQL 16                                     |
| Auth     | JWT (customer / business / admin roles)          |
| Chatbot  | Claude API (Anthropic)                            |
| Payments | Mock gateway (pluggable for Stripe/PayTabs later)|

## Brand

White theme with the RPK logo palette: orange `#F26A1B`, chili red `#E2231A`,
navy accent `#1B3A8B`.

## Project layout

```
RPK Website/
├── docker-compose.yml        # Postgres for local dev
├── backend/                  # Go REST API
│   ├── cmd/server/main.go
│   ├── internal/...
│   ├── migrations/schema.sql
│   └── .env.example
└── frontend/                 # Expo (React Native Web) app
```

## Quick start

### 1. Database

Either Docker:

```bash
docker compose up -d postgres        # Postgres on host port 5440
```

…or any reachable Postgres instance:

```bash
createdb rpk_food                    # then point DATABASE_URL at your DB host
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + ANTHROPIC_API_KEY (chatbot)
go mod tidy
go run ./cmd/server
# API listens on $PORT (default 8090); auto-migrates + seeds 11 categories / 76 products on first run
```

Default admin login (created by the seed):
`admin@rpkfood.ae` / `Admin@123`  — change the password after first login.

### 3. Frontend

```bash
cd frontend
npm install
EXPO_PUBLIC_API_URL=$API_URL npm run web   # set API_URL to your backend's base URL
# Expo Router web app. Default port 8081; if busy it will offer another (e.g. 8085).
```

If you run the web app on a non-default port, add that origin to `CORS_ORIGINS`
in `backend/.env` and restart the backend.

### Configuration

| Env var (where)                 | Purpose                                                        |
|---------------------------------|---------------------------------------------------------------|
| `ANTHROPIC_API_KEY` (backend)   | Enables the AI chatbot. Without it the bot returns a fallback. |
| `EXPO_PUBLIC_API_URL` (frontend)| Backend base URL the app calls.                               |
| `EXPO_PUBLIC_HERO_VIDEO` (frontend) | MP4 URL for the home hero background video.               |
| `CORS_ORIGINS` (backend)        | Comma-separated allowed web origins.                          |

## Roles

- **Customer** — browse, cart, checkout (mock payment), track orders.
- **Business (import/export)** — register company for import/export, status reviewed by admin.
- **Admin** — add/edit products, manage categories, view orders & payments,
  review import/export registrations, dashboard stats.
