package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/rpkfood/backend/internal/auth"
)

// randomToken returns a URL-safe random token for password-reset links.
func randomToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func sha256hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

// sendMail sends an HTML email via the configured SMTP server (e.g. Gmail).
// If SMTP isn't configured it logs the message instead of failing, so the
// reset flow still works in dev (the link is also logged by the caller).
func (s *Server) sendMail(to, subject, htmlBody string) error {
	cfg := s.cfg
	if cfg.SMTPHost == "" || cfg.SMTPUser == "" {
		log.Printf("[mail] SMTP not configured — skipping email to %s (%q)", to, subject)
		return nil
	}
	from := cfg.SMTPFrom
	if from == "" {
		from = cfg.SMTPUser
	}
	msg := []byte("From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" + htmlBody)
	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)
	addr := cfg.SMTPHost + ":" + cfg.SMTPPort
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

// POST /api/auth/forgot-password { email }
// Always returns 200 so the response doesn't reveal whether an email exists.
func (s *Server) handleForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Email) == "" {
		writeErr(w, 400, "email required")
		return
	}

	var uid int64
	var name string
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, name FROM users WHERE lower(email)=lower($1)`, strings.TrimSpace(req.Email)).Scan(&uid, &name)
	if err == nil {
		raw := randomToken()
		expires := time.Now().Add(1 * time.Hour)
		if _, e := s.pool.Exec(r.Context(),
			`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
			uid, sha256hex(raw), expires); e == nil {
			base := s.cfg.AppBaseURL
			if base == "" {
				base = "http://localhost:8081"
			}
			link := strings.TrimRight(base, "/") + "/reset-password?token=" + raw
			log.Printf("[reset] password reset link for %s: %s", req.Email, link)
			_ = s.sendMail(req.Email, "Reset your RPK password", resetEmailHTML(name, link))
		}
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

// POST /api/auth/reset-password { token, password }
func (s *Server) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil || req.Token == "" {
		writeErr(w, 400, "invalid request")
		return
	}
	if len(req.Password) < 6 {
		writeErr(w, 400, "password must be at least 6 characters")
		return
	}

	var id, uid int64
	var expires time.Time
	var used bool
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash=$1 ORDER BY id DESC LIMIT 1`,
		sha256hex(req.Token)).Scan(&id, &uid, &expires, &used)
	if err != nil || used || time.Now().After(expires) {
		writeErr(w, 400, "this reset link is invalid or has expired")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeErr(w, 500, "could not reset password")
		return
	}
	if _, err := s.pool.Exec(r.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, hash, uid); err != nil {
		writeErr(w, 500, "could not reset password")
		return
	}
	_, _ = s.pool.Exec(r.Context(), `UPDATE password_resets SET used=TRUE WHERE id=$1`, id)
	writeJSON(w, 200, map[string]string{"status": "reset"})
}

func resetEmailHTML(name, link string) string {
	greeting := "Hello"
	if strings.TrimSpace(name) != "" {
		greeting = "Hello " + name
	}
	return fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#2A2A2A">
  <h2 style="color:#E2231A">RPK Food Trading</h2>
  <p>%s,</p>
  <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="%s" style="background:#E2231A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;display:inline-block">Reset password</a>
  </p>
  <p style="color:#6B7280;font-size:13px">If the button doesn't work, copy this link into your browser:<br>%s</p>
  <p style="color:#6B7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
</div>`, greeting, link, link)
}
