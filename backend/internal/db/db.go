package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pooled connection, retrying briefly so it works right after
// `docker compose up` while Postgres is still warming up.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10

	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 10; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				return pool, nil
			} else {
				err = pingErr
				pool.Close()
			}
		}
		time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
	}
	return nil, fmt.Errorf("could not connect to postgres: %w", err)
}

// Migrate applies the schema file (idempotent CREATE IF NOT EXISTS statements).
func Migrate(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	path := filepath.Join(migrationsDir, "schema.sql")
	sql, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read schema (%s): %w", path, err)
	}
	if _, err := pool.Exec(ctx, string(sql)); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}
	return nil
}
