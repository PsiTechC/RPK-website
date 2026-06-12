package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

type registrationReq struct {
	CompanyName     string `json:"company_name"`
	BusinessType    string `json:"business_type"` // import / export / both
	Country         string `json:"country"`
	ContactPerson   string `json:"contact_person"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	ProductInterest string `json:"product_interest"`
	Message         string `json:"message"`
}

func (s *Server) handleCreateRegistration(w http.ResponseWriter, r *http.Request) {
	var req registrationReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.CompanyName == "" || req.Email == "" {
		writeErr(w, 400, "company_name and email are required")
		return
	}
	bt := req.BusinessType
	if bt != "import" && bt != "export" && bt != "both" {
		bt = "import"
	}

	var userID *int64
	if uid := auth.UserIDFrom(r.Context()); uid != 0 {
		userID = &uid
	}

	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO import_export_registrations
		 (user_id, company_name, business_type, country, contact_person, phone, email, product_interest, message)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		userID, req.CompanyName, bt, req.Country, req.ContactPerson, req.Phone, req.Email,
		req.ProductInterest, req.Message,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not submit registration")
		return
	}
	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "pending"})
}

func (s *Server) handleMyRegistrations(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	regs, err := s.queryRegistrations(r, `WHERE user_id=$1`, uid)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, regs)
}

func (s *Server) handleAdminListRegistrations(w http.ResponseWriter, r *http.Request) {
	where := ""
	args := []interface{}{}
	if st := r.URL.Query().Get("status"); st != "" {
		args = append(args, st)
		where = "WHERE status=$1"
	}
	regs, err := s.queryRegistrations(r, where, args...)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, regs)
}

func (s *Server) queryRegistrations(r *http.Request, where string, args ...interface{}) ([]models.Registration, error) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, user_id, company_name, business_type, country, contact_person, phone, email,
		        product_interest, message, status, created_at
		 FROM import_export_registrations `+where+` ORDER BY created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Registration{}
	for rows.Next() {
		var g models.Registration
		if err := rows.Scan(&g.ID, &g.UserID, &g.CompanyName, &g.BusinessType, &g.Country,
			&g.ContactPerson, &g.Phone, &g.Email, &g.ProductInterest, &g.Message, &g.Status,
			&g.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, nil
}

func (s *Server) handleAdminUpdateRegistration(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status string `json:"status"` // approved / rejected / pending
	}
	if err := readJSON(r, &req); err != nil || req.Status == "" {
		writeErr(w, 400, "status required")
		return
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE import_export_registrations SET status=$1 WHERE id=$2`, req.Status, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "registration not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}
