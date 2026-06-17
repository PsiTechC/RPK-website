package api

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/rpkfood/backend/internal/auth"
)

// loginAuth implements the SMTP "LOGIN" auth mechanism. Some servers
// (cPanel/Dovecot, used by psitech.co.in) reject "PLAIN" and require "LOGIN",
// which Go's standard library does not provide out of the box.
type loginAuth struct{ user, pass string }

func (a *loginAuth) Start(*smtp.ServerInfo) (string, []byte, error) { return "LOGIN", nil, nil }
func (a *loginAuth) Next(from []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}
	switch string(from) {
	case "Username:":
		return []byte(a.user), nil
	case "Password:":
		return []byte(a.pass), nil
	default:
		return nil, errors.New("smtp login: unexpected server challenge: " + string(from))
	}
}

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
	// A valid Date and Message-ID lower the spam score; many filters penalise
	// their absence. Message-ID is scoped to the sending domain.
	domain := "localhost"
	if i := strings.LastIndex(cfg.SMTPUser, "@"); i >= 0 {
		domain = cfg.SMTPUser[i+1:]
	}
	msg := []byte("From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"Date: " + time.Now().Format(time.RFC1123Z) + "\r\n" +
		"Message-ID: <" + randomToken() + "@" + domain + ">\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" + htmlBody)

	addr := cfg.SMTPHost + ":" + cfg.SMTPPort
	tlsCfg := &tls.Config{ServerName: cfg.SMTPHost}

	// Establish the connection: implicit TLS on 465, otherwise plain + STARTTLS.
	var c *smtp.Client
	var err error
	if cfg.SMTPPort == "465" {
		conn, e := tls.Dial("tcp", addr, tlsCfg)
		if e != nil {
			return e
		}
		c, err = smtp.NewClient(conn, cfg.SMTPHost)
	} else {
		if c, err = smtp.Dial(addr); err == nil {
			if ok, _ := c.Extension("STARTTLS"); ok {
				err = c.StartTLS(tlsCfg)
			}
		}
	}
	if err != nil {
		return err
	}
	defer c.Close()

	// LOGIN auth works on both cPanel/Dovecot and Gmail.
	if err := c.Auth(&loginAuth{cfg.SMTPUser, cfg.SMTPPass}); err != nil {
		return err
	}
	// Envelope sender is the authenticated account (keeps SPF aligned), even if
	// the human-readable From header carries a display name.
	if err := c.Mail(cfg.SMTPUser); err != nil {
		return err
	}
	if err := c.Rcpt(to); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
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
			if err := s.sendMail(req.Email, "Reset your RPK password", resetEmailHTML(name, link)); err != nil {
				log.Printf("[mail] failed to send password reset to %s: %v", req.Email, err)
			}
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
	greeting := "there"
	if strings.TrimSpace(name) != "" {
		greeting = html.EscapeString(name)
	}
	safeLink := html.EscapeString(link)
	body := fmt.Sprintf(`<p style="margin:0 0 14px;color:#444;font-size:14px;line-height:22px;">Hello %s,</p>
<p style="margin:0 0 22px;color:#444;font-size:14px;line-height:22px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#E2231A;">
  <a href="%s" style="display:inline-block;padding:13px 30px;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;">Reset password</a>
</td></tr></table>
<p style="margin:22px 0 0;color:#9A9A9A;font-size:12px;line-height:18px;">If the button doesn't work, copy this link into your browser:<br>%s</p>
<p style="margin:10px 0 0;color:#9A9A9A;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>`, greeting, safeLink, safeLink)
	return emailShell("Reset your password", "", body, "This is an automated message from RPK Food Trading.")
}
