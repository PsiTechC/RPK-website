package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/rpkfood/backend/internal/api"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/config"
	"github.com/rpkfood/backend/internal/db"
)

func main() {
	cfg := config.Load()

	// Refuse to start with a guessable signing secret — otherwise anyone can mint
	// a valid admin JWT offline and take over the API.
	if cfg.JWTSecret == "" || cfg.JWTSecret == "dev_insecure_secret_change_me" || len(cfg.JWTSecret) < 16 {
		log.Fatal("JWT_SECRET must be set to a strong random value (>=16 chars). Generate one with: openssl rand -hex 32")
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Default admin password — change after first login.
	adminHash, err := auth.HashPassword("Admin@123")
	if err != nil {
		log.Fatalf("hash admin: %v", err)
	}
	if err := db.Seed(ctx, pool, adminHash); err != nil {
		log.Fatalf("seed: %v", err)
	}

	authSvc := auth.New(cfg.JWTSecret)
	srv := api.NewServer(pool, authSvc, cfg)

	httpServer := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      srv.Router(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // chatbot calls can take a while
	}

	log.Printf("RPK Food API listening on :%s", cfg.Port)
	log.Printf("Admin login: admin@rpkfood.ae / Admin@123")
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}
