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
	UploadsDir      string
	// Email (password reset) + the public site URL used to build reset links.
	SMTPHost   string
	SMTPPort   string
	SMTPUser   string
	SMTPPass   string
	SMTPFrom   string
	AppBaseURL string
	AdminEmail string // inbox that receives inquiry/registration notifications
}

func Load() Config {
	// Best-effort: load .env if present. Ignore error so real env vars still work.
	_ = godotenv.Load()

	return Config{
		Port:            get("PORT", "8090"),
		DatabaseURL:     get("DATABASE_URL", ""),
		JWTSecret:       get("JWT_SECRET", "dev_insecure_secret_change_me"),
		AnthropicAPIKey: get("ANTHROPIC_API_KEY", ""),
		AnthropicModel:  get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
		CORSOrigins:     splitCSV(get("CORS_ORIGINS", "")),
		MigrationsDir:   get("MIGRATIONS_DIR", "migrations"),
		UploadsDir:      get("UPLOADS_DIR", "uploads"),
		SMTPHost:        get("SMTP_HOST", ""),
		SMTPPort:        get("SMTP_PORT", "587"),
		SMTPUser:        get("SMTP_USER", ""),
		SMTPPass:        get("SMTP_PASS", ""),
		SMTPFrom:        get("SMTP_FROM", ""),
		AppBaseURL:      get("APP_BASE_URL", ""),
		AdminEmail:      get("ADMIN_EMAIL", "importexportrpk@gmail.com"),
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
