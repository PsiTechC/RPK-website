package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	AnthropicAPIKey string
	AnthropicModel  string
	CORSOrigins     []string
	MigrationsDir   string
}

func Load() Config {
	// Best-effort: load .env if present. Ignore error so real env vars still work.
	_ = godotenv.Load()

	return Config{
		Port:            get("PORT", "8090"),
		DatabaseURL:     get("DATABASE_URL", "postgres://rpk:rpk_password@localhost:5440/rpk_food?sslmode=disable"),
		JWTSecret:       get("JWT_SECRET", "dev_insecure_secret_change_me"),
		AnthropicAPIKey: get("ANTHROPIC_API_KEY", ""),
		AnthropicModel:  get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
		CORSOrigins:     splitCSV(get("CORS_ORIGINS", "http://localhost:8081,http://localhost:19006,http://localhost:3000")),
		MigrationsDir:   get("MIGRATIONS_DIR", "migrations"),
	}
}

func get(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
