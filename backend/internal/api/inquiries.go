package api

import (
	"encoding/json"
	"fmt"
	"log"
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

	// Notify the admin inbox (async — don't block the response on SMTP).
	go func(req inquiryReq, id int64) {
		if err := s.sendMail(s.cfg.AdminEmail, "New inquiry from "+req.Name, inquiryEmailHTML(req, id)); err != nil {
			log.Printf("[mail] failed to send inquiry #%d notification to %s: %v", id, s.cfg.AdminEmail, err)
		}
	}(req, id)

	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "received"})
}

func inquiryEmailHTML(q inquiryReq, id int64) string {
	body := detailTable([]emailRow{
		{"Name", q.Name},
		{"Email", q.Email},
		{"Phone", q.Phone},
		{"Product", q.Product},
		{"Requirement", formatItems(q.Items)},
		{"Message", q.Message},
	})
	return emailShell(
		"New customer inquiry",
		"A customer just submitted an inquiry through the website.",
		body,
		fmt.Sprintf("Inquiry #%d · view it in the admin dashboard → Inquiries.", id),
	)
}

// formatItems turns the requirement JSON (e.g. [{"name":"Rice","unit":"BAG","qty":1}])
// into a human-readable line like "Rice ×1 BAG, …" for emails. Returns "" if empty.
func formatItems(raw json.RawMessage) string {
	s := strings.TrimSpace(string(raw))
	if s == "" || s == "[]" || s == "null" {
		return ""
	}
	var items []struct {
		Name string  `json:"name"`
		Unit string  `json:"unit"`
		Qty  float64 `json:"qty"`
	}
	if err := json.Unmarshal(raw, &items); err != nil {
		return ""
	}
	parts := make([]string, 0, len(items))
	for _, it := range items {
		name := strings.TrimSpace(it.Name)
		if name == "" {
			continue
		}
		line := name
		if it.Qty > 0 {
			line += " ×" + strconv.FormatFloat(it.Qty, 'f', -1, 64)
		}
		if u := strings.TrimSpace(it.Unit); u != "" {
			line += " " + u
		}
		parts = append(parts, line)
	}
	return strings.Join(parts, ", ")
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
