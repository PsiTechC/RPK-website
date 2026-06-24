package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

type registrationReq struct {
	CompanyName       string          `json:"company_name"`
	BusinessType      string          `json:"business_type"` // import / export / both
	Country           string          `json:"country"`
	ContactPerson     string          `json:"contact_person"`
	Phone             string          `json:"phone"`
	Email             string          `json:"email"`
	ProductInterest   string          `json:"product_interest"`
	Message           string          `json:"message"`
	Items             json.RawMessage `json:"items"`
	WhatsApp          string          `json:"whatsapp"`
	MonthlyCapacity   string          `json:"monthly_capacity"`
	TargetCountries   string          `json:"target_countries"`
	TradeLicenseURL   string          `json:"trade_license_url"`
	VATCertificateURL string          `json:"vat_certificate_url"`
	CompanyProfileURL string          `json:"company_profile_url"`
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
		 (user_id, company_name, business_type, country, contact_person, phone, email, product_interest, message, items,
		  whatsapp, monthly_capacity, target_countries, trade_license_url, vat_certificate_url, company_profile_url)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16) RETURNING id`,
		userID, req.CompanyName, bt, req.Country, req.ContactPerson, req.Phone, req.Email,
		req.ProductInterest, req.Message, normHighlights(req.Items),
		req.WhatsApp, req.MonthlyCapacity, req.TargetCountries,
		req.TradeLicenseURL, req.VATCertificateURL, req.CompanyProfileURL,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not submit registration")
		return
	}
	// Notify the admin inbox (async — don't block the response on SMTP).
	go func(req registrationReq, id int64) {
		if err := s.sendMail(s.cfg.AdminEmail, "New import/export registration from "+req.CompanyName, registrationEmailHTML(req, id)); err != nil {
			log.Printf("[mail] failed to send registration #%d notification to %s: %v", id, s.cfg.AdminEmail, err)
		}
	}(req, id)

	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "pending"})
}

func registrationEmailHTML(g registrationReq, id int64) string {
	body := detailTable([]emailRow{
		{"Company", g.CompanyName},
		{"Business type", g.BusinessType},
		{"Country", g.Country},
		{"Contact", g.ContactPerson},
		{"Email", g.Email},
		{"Phone", g.Phone},
		{"Product interest", g.ProductInterest},
		{"Requirement", formatItems(g.Items)},
		{"Message", g.Message},
	})
	return emailShell(
		"New import / export registration",
		"A business just registered for import / export through the website.",
		body,
		fmt.Sprintf("Registration #%d · view it in the admin dashboard → Registrations.", id),
	)
}

func (s *Server) handleMyRegistrations(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	// Show registrations linked to this user, OR submitted with their email
	// (covers ones created while logged out / before user_id linking existed).
	regs, err := s.queryRegistrations(r,
		`WHERE user_id=$1 OR lower(email) = (SELECT lower(email) FROM users WHERE id=$1)`, uid)
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
		        product_interest, message, items,
		        whatsapp, monthly_capacity, target_countries, trade_license_url, vat_certificate_url, company_profile_url,
		        status, created_at
		 FROM import_export_registrations `+where+` ORDER BY created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Registration{}
	for rows.Next() {
		var g models.Registration
		if err := rows.Scan(&g.ID, &g.UserID, &g.CompanyName, &g.BusinessType, &g.Country,
			&g.ContactPerson, &g.Phone, &g.Email, &g.ProductInterest, &g.Message, &g.Items,
			&g.WhatsApp, &g.MonthlyCapacity, &g.TargetCountries,
			&g.TradeLicenseURL, &g.VATCertificateURL, &g.CompanyProfileURL,
			&g.Status, &g.CreatedAt); err != nil {
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
		// Optional: which partner role to grant on approval. When empty it is
		// derived from the application's business_type.
		PartnerRole string `json:"partner_role"` // import_partner / export_partner
	}
	if err := readJSON(r, &req); err != nil || req.Status == "" {
		writeErr(w, 400, "status required")
		return
	}

	// Update status and read back the linked user + business type so we can
	// promote the account to a partner role when approved.
	var userID *int64
	var businessType string
	err := s.pool.QueryRow(r.Context(),
		`UPDATE import_export_registrations SET status=$1 WHERE id=$2
		 RETURNING user_id, business_type`, req.Status, id,
	).Scan(&userID, &businessType)
	if err != nil {
		writeErr(w, 404, "registration not found")
		return
	}

	grantedRole := ""
	if req.Status == "approved" && userID != nil {
		grantedRole = partnerRoleFor(req.PartnerRole, businessType)
		// Never demote an admin; only promote a regular account to a partner role.
		if _, err := s.pool.Exec(r.Context(),
			`UPDATE users SET role=$1 WHERE id=$2 AND role <> 'admin'`, grantedRole, *userID); err != nil {
			writeErr(w, 500, "could not assign partner role")
			return
		}
	}

	writeJSON(w, 200, map[string]string{"status": "updated", "granted_role": grantedRole})
}

// partnerRoleFor resolves the partner role to grant. An explicit, valid choice
// wins; otherwise it is derived from the application's business type (export ->
// export_partner, anything else -> import_partner).
func partnerRoleFor(explicit, businessType string) string {
	if explicit == "import_partner" || explicit == "export_partner" {
		return explicit
	}
	if businessType == "export" {
		return "export_partner"
	}
	return "import_partner"
}
