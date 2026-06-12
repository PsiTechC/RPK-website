# ---- build stage ----
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- run stage ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget \
 && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/server /app/server
COPY migrations /app/migrations
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app
ENV PORT=8090 \
    MIGRATIONS_DIR=/app/migrations \
    UPLOADS_DIR=/app/uploads
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8090/health >/dev/null 2>&1 || exit 1
CMD ["/app/server"]
