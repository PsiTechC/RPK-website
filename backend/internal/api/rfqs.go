package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

// isPartner reports whether the role may use the partner RFQ workflow.
func isPartner(role string) bool {
	return role == "import_partner" || role == "export_partner" || role == "admin"
}

// handleCreateRFQ lets an approved partner raise a request-for-quotation.
func (s *Server) handleCreateRFQ(w http.ResponseWriter, r *http.Request) {
	if !isPartner(auth.RoleFrom(r.Context())) {
		writeErr(w, 403, "only approved partners can request quotations")
		return
	}
	var req struct {
		Items              json.RawMessage `json:"items"`
		DestinationCountry string          `json:"destination_country"`
		Message            string          `json:"message"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if normHighlights(req.Items) == "[]" && req.Message == "" {
		writeErr(w, 400, "add at least one product or a message")
		return
	}

	uid := auth.UserIDFrom(r.Context())
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO rfqs (user_id, items, destination_country, message)
		 VALUES ($1,$2::jsonb,$3,$4) RETURNING id`,
		uid, normHighlights(req.Items), req.DestinationCountry, req.Message,
	).Scan(&id); err != nil {
		writeErr(w, 500, "could not submit RFQ")
		return
	}

	go func(items json.RawMessage, dest, msg string, id int64) {
		body := detailTable([]emailRow{
			{"RFQ", "#" + strconv.FormatInt(id, 10)},
			{"Destination", dest},
			{"Requirement", formatItems(items)},
			{"Message", msg},
		})
		html := emailShell("New quotation request", "A partner requested a quotation.", body,
			"View it in the admin dashboard → RFQ Requests.")
		if err := s.sendMail(s.cfg.AdminEmail, "New RFQ #"+strconv.FormatInt(id, 10), html); err != nil {
			log.Printf("[mail] RFQ #%d notification failed: %v", id, err)
		}
	}(req.Items, req.DestinationCountry, req.Message, id)

	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "open"})
}

// handleMyRFQs lists the signed-in partner's RFQs with their quotations.
func (s *Server) handleMyRFQs(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	rfqs, err := s.queryRFQs(r.Context(), `WHERE r.user_id=$1`, uid)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, rfqs)
}

// handleRespondQuotation lets the owning partner approve / reject a quotation.
func (s *Server) handleRespondQuotation(w http.ResponseWriter, r *http.Request) {
	qid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status string `json:"status"` // approved / rejected
	}
	if err := readJSON(r, &req); err != nil || (req.Status != "approved" && req.Status != "rejected") {
		writeErr(w, 400, "status must be approved or rejected")
		return
	}
	uid := auth.UserIDFrom(r.Context())

	// Verify the quotation belongs to one of this partner's RFQs.
	var rfqID int64
	err := s.pool.QueryRow(r.Context(),
		`SELECT q.rfq_id FROM quotations q JOIN rfqs r ON r.id=q.rfq_id
		 WHERE q.id=$1 AND r.user_id=$2`, qid, uid).Scan(&rfqID)
	if err != nil {
		writeErr(w, 404, "quotation not found")
		return
	}

	if _, err := s.pool.Exec(r.Context(), `UPDATE quotations SET status=$1 WHERE id=$2`, req.Status, qid); err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	// Approving a quotation closes out the RFQ as approved.
	rfqStatus := "quoted"
	if req.Status == "approved" {
		rfqStatus = "approved"
	}
	_, _ = s.pool.Exec(r.Context(), `UPDATE rfqs SET status=$1 WHERE id=$2`, rfqStatus, rfqID)

	// Phase 6: approving a quotation creates a partner order (idempotent via the
	// UNIQUE(quotation_id) constraint, so re-approving never double-books).
	if req.Status == "approved" {
		_, _ = s.pool.Exec(r.Context(),
			`INSERT INTO partner_orders (user_id, rfq_id, quotation_id, items, amount, currency)
			 SELECT r.user_id, r.id, q.id, r.items, q.price, q.currency
			 FROM quotations q JOIN rfqs r ON r.id = q.rfq_id
			 WHERE q.id = $1
			 ON CONFLICT (quotation_id) DO NOTHING`, qid)
	}

	writeJSON(w, 200, map[string]string{"status": "updated"})
}

// handleAdminListRFQs returns every RFQ with partner identity + quotations.
func (s *Server) handleAdminListRFQs(w http.ResponseWriter, r *http.Request) {
	where := ""
	args := []interface{}{}
	if st := r.URL.Query().Get("status"); st != "" {
		args = append(args, st)
		where = "WHERE r.status=$1"
	}
	rfqs, err := s.queryRFQs(r.Context(), where, args...)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, rfqs)
}

// handleAdminCreateQuotation adds a quotation to an RFQ and marks it "quoted".
func (s *Server) handleAdminCreateQuotation(w http.ResponseWriter, r *http.Request) {
	rfqID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Price    float64 `json:"price"`
		Currency string  `json:"currency"`
		Validity string  `json:"validity"`
		Notes    string  `json:"notes"`
		FileURL  string  `json:"file_url"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.Currency == "" {
		req.Currency = "AED"
	}

	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO quotations (rfq_id, price, currency, validity, notes, file_url)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		rfqID, req.Price, req.Currency, req.Validity, req.Notes, req.FileURL,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not save quotation")
		return
	}
	// Only advance an open RFQ to "quoted" — never override an approved one.
	_, _ = s.pool.Exec(r.Context(), `UPDATE rfqs SET status='quoted' WHERE id=$1 AND status='open'`, rfqID)

	writeJSON(w, 201, map[string]interface{}{"id": id})
}

// queryRFQs loads RFQs (with the given WHERE on alias r) plus their quotations.
func (s *Server) queryRFQs(ctx context.Context, where string, args ...interface{}) ([]models.RFQ, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT r.id, r.user_id, COALESCE(u.name,''), COALESCE(u.email,''),
		        r.items, r.destination_country, r.message, r.status, r.created_at
		 FROM rfqs r LEFT JOIN users u ON u.id = r.user_id
		 `+where+` ORDER BY r.created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.RFQ{}
	ids := []int64{}
	idx := map[int64]int{}
	for rows.Next() {
		var q models.RFQ
		if err := rows.Scan(&q.ID, &q.UserID, &q.PartnerName, &q.PartnerEmail,
			&q.Items, &q.DestinationCountry, &q.Message, &q.Status, &q.CreatedAt); err != nil {
			return nil, err
		}
		q.Quotations = []models.Quotation{}
		idx[q.ID] = len(out)
		out = append(out, q)
		ids = append(ids, q.ID)
	}
	if len(ids) == 0 {
		return out, nil
	}

	qrows, err := s.pool.Query(ctx,
		`SELECT id, rfq_id, price, currency, validity, notes, file_url, status, created_at
		 FROM quotations WHERE rfq_id = ANY($1) ORDER BY created_at ASC`, ids)
	if err != nil {
		return nil, err
	}
	defer qrows.Close()
	for qrows.Next() {
		var qt models.Quotation
		if err := qrows.Scan(&qt.ID, &qt.RFQID, &qt.Price, &qt.Currency, &qt.Validity,
			&qt.Notes, &qt.FileURL, &qt.Status, &qt.CreatedAt); err != nil {
			return nil, err
		}
		if i, ok := idx[qt.RFQID]; ok {
			out[i].Quotations = append(out[i].Quotations, qt)
		}
	}
	return out, nil
}
