package api

import (
	"net/http"
	"strings"

	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

type registerReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone"`
	Role     string `json:"role"` // optional: customer (default) or business
}

type authResp struct {
	Token string       `json:"token"`
	User  models.User  `json:"user"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" || len(req.Password) < 6 {
		writeErr(w, http.StatusBadRequest, "name, email and a 6+ char password are required")
		return
	}
	// Customers and business users may self-register; admins cannot.
	role := "customer"
	if req.Role == "business" {
		role = "business"
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	var u models.User
	err = s.pool.QueryRow(r.Context(),
		`INSERT INTO users (name, email, password_hash, phone, role)
		 VALUES ($1,$2,$3,$4,$5)
		 RETURNING id, name, email, phone, role, created_at`,
		req.Name, req.Email, hash, req.Phone, role,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			writeErr(w, http.StatusConflict, "email already registered")
			return
		}
		writeErr(w, http.StatusInternalServerError, "could not create user")
		return
	}

	token, _ := s.auth.Issue(u.ID, u.Role)
	writeJSON(w, http.StatusCreated, authResp{Token: token, User: u})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var u models.User
	var hash string
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, name, email, phone, role, created_at, password_hash FROM users WHERE email=$1`,
		req.Email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.CreatedAt, &hash)
	if err != nil || !auth.CheckPassword(hash, req.Password) {
		writeErr(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, _ := s.auth.Issue(u.ID, u.Role)
	writeJSON(w, http.StatusOK, authResp{Token: token, User: u})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	var u models.User
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, name, email, phone, role, created_at FROM users WHERE id=$1`, uid,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.CreatedAt)
	if err != nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// POST /api/auth/change-password { current_password, new_password }
// Authenticated: verifies the caller's current password before setting a new one.
func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.NewPassword) < 6 {
		writeErr(w, http.StatusBadRequest, "new password must be at least 6 characters")
		return
	}
	var hash string
	if err := s.pool.QueryRow(r.Context(),
		`SELECT password_hash FROM users WHERE id=$1`, uid,
	).Scan(&hash); err != nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	if !auth.CheckPassword(hash, req.CurrentPassword) {
		writeErr(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	if auth.CheckPassword(hash, req.NewPassword) {
		writeErr(w, http.StatusBadRequest, "new password must be different from the current one")
		return
	}
	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not update password")
		return
	}
	if _, err := s.pool.Exec(r.Context(),
		`UPDATE users SET password_hash=$1 WHERE id=$2`, newHash, uid,
	); err != nil {
		writeErr(w, http.StatusInternalServerError, "could not update password")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "changed"})
}
