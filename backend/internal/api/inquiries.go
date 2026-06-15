package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Inquiry struct {
	ID        int64           `json:"id"`
	Name      string          `json:"name"`
	Email     string          `json:"email"`
	Phone     string          `json:"phone"`
	Product   string          `json:"product"`
	Message   string          `json:"message"`
	Items     json.RawMessage `json:"items"`
	Status    string          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
}

type inquiryReq struct {
	Name    string          `json:"name"`
	Email   string          `json:"email"`
	Phone   string          `json:"phone"`
	Product string          `json:"product"`
	Message string          `json:"message"`
	Items   json.RawMessage `json:"items"`
}

// handleCreateInquiry stores a "Call to Inquiry" / contact-form submission.
func (s *Server) handleCreateInquiry(w http.ResponseWriter, r *http.Request) {
	var req inquiryReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Name == "" || (req.Email == "" && req.Phone == "") {
		writeErr(w, 400, "name and an email or phone are required")
		return
	}

	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO inquiries (name, email, phone, product, message, items)
		 VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
		req.Name, req.Email, req.Phone, req.Product, req.Message, normHighlights(req.Items),
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not submit inquiry")
		return
	}
	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "received"})
}

func (s *Server) handleAdminListInquiries(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, name, email, phone, product, message, items, status, created_at
		 FROM inquiries ORDER BY created_at DESC`)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()

	out := []Inquiry{}
	for rows.Next() {
		var q Inquiry
		if err := rows.Scan(&q.ID, &q.Name, &q.Email, &q.Phone, &q.Product, &q.Message, &q.Items, &q.Status, &q.CreatedAt); err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, q)
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleAdminUpdateInquiry(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status string `json:"status"`
	}
	if err := readJSON(r, &req); err != nil || req.Status == "" {
		writeErr(w, 400, "status required")
		return
	}
	ct, err := s.pool.Exec(r.Context(), `UPDATE inquiries SET status=$1 WHERE id=$2`, req.Status, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "inquiry not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}
