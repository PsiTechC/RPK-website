package api

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

// handleMyPartnerOrders lists the signed-in partner's orders.
func (s *Server) handleMyPartnerOrders(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	orders, err := s.queryPartnerOrders(r.Context(), `WHERE o.user_id=$1`, uid)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, orders)
}

// handleAdminListPartnerOrders returns all partner orders with partner identity.
func (s *Server) handleAdminListPartnerOrders(w http.ResponseWriter, r *http.Request) {
	where := ""
	args := []interface{}{}
	if st := r.URL.Query().Get("status"); st != "" {
		args = append(args, st)
		where = "WHERE o.status=$1"
	}
	orders, err := s.queryPartnerOrders(r.Context(), where, args...)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, orders)
}

// handleAdminUpdatePartnerOrder updates fulfilment / payment status.
func (s *Server) handleAdminUpdatePartnerOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status        string `json:"status"`
		PaymentStatus string `json:"payment_status"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.Status == "" && req.PaymentStatus == "" {
		writeErr(w, 400, "nothing to update")
		return
	}
	// COALESCE NULLIF keeps the existing value when a field is left blank.
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE partner_orders
		 SET status = COALESCE(NULLIF($1,''), status),
		     payment_status = COALESCE(NULLIF($2,''), payment_status),
		     updated_at = now()
		 WHERE id=$3`, req.Status, req.PaymentStatus, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "order not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (s *Server) queryPartnerOrders(ctx context.Context, where string, args ...interface{}) ([]models.PartnerOrder, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.user_id, o.rfq_id, o.quotation_id, COALESCE(u.name,''), COALESCE(u.email,''),
		        o.items, o.amount, o.currency, o.status, o.payment_status, o.created_at, o.updated_at
		 FROM partner_orders o LEFT JOIN users u ON u.id = o.user_id
		 `+where+` ORDER BY o.created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.PartnerOrder{}
	idx := map[int64]int{}
	ids := []int64{}
	for rows.Next() {
		var o models.PartnerOrder
		if err := rows.Scan(&o.ID, &o.UserID, &o.RFQID, &o.QuotationID, &o.PartnerName, &o.PartnerEmail,
			&o.Items, &o.Amount, &o.Currency, &o.Status, &o.PaymentStatus, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		o.Documents = []models.PartnerDocument{}
		idx[o.ID] = len(out)
		out = append(out, o)
		ids = append(ids, o.ID)
	}
	rows.Close()
	if len(ids) == 0 {
		return out, nil
	}

	// Attach the one shipment per order (Phase 7).
	srows, err := s.pool.Query(ctx,
		`SELECT partner_order_id, id, container_no, shipping_line, etd, eta, status, notes, updated_at
		 FROM shipments WHERE partner_order_id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	for srows.Next() {
		var oid int64
		var sh models.Shipment
		if err := srows.Scan(&oid, &sh.ID, &sh.ContainerNo, &sh.ShippingLine, &sh.ETD, &sh.ETA, &sh.Status, &sh.Notes, &sh.UpdatedAt); err != nil {
			srows.Close()
			return nil, err
		}
		if i, ok := idx[oid]; ok {
			shCopy := sh
			out[i].Shipment = &shCopy
		}
	}
	srows.Close()

	// Attach documents (Phase 8).
	drows, err := s.pool.Query(ctx,
		`SELECT partner_order_id, id, label, file_url, created_at
		 FROM partner_documents WHERE partner_order_id = ANY($1) ORDER BY created_at ASC`, ids)
	if err != nil {
		return nil, err
	}
	for drows.Next() {
		var oid int64
		var d models.PartnerDocument
		if err := drows.Scan(&oid, &d.ID, &d.Label, &d.FileURL, &d.CreatedAt); err != nil {
			drows.Close()
			return nil, err
		}
		if i, ok := idx[oid]; ok {
			out[i].Documents = append(out[i].Documents, d)
		}
	}
	drows.Close()

	return out, nil
}

// handleAdminUpsertShipment creates or updates the shipment for an order.
func (s *Server) handleAdminUpsertShipment(w http.ResponseWriter, r *http.Request) {
	orderID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		ContainerNo  string `json:"container_no"`
		ShippingLine string `json:"shipping_line"`
		ETD          string `json:"etd"`
		ETA          string `json:"eta"`
		Status       string `json:"status"`
		Notes        string `json:"notes"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.Status == "" {
		req.Status = "preparing"
	}
	_, err := s.pool.Exec(r.Context(),
		`INSERT INTO shipments (partner_order_id, container_no, shipping_line, etd, eta, status, notes, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7, now())
		 ON CONFLICT (partner_order_id) DO UPDATE SET
		    container_no=EXCLUDED.container_no, shipping_line=EXCLUDED.shipping_line,
		    etd=EXCLUDED.etd, eta=EXCLUDED.eta, status=EXCLUDED.status, notes=EXCLUDED.notes,
		    updated_at=now()`,
		orderID, req.ContainerNo, req.ShippingLine, req.ETD, req.ETA, req.Status, req.Notes)
	if err != nil {
		writeErr(w, 500, "could not save shipment")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "saved"})
}

// handleAdminAddDocument attaches a document (already uploaded) to an order.
func (s *Server) handleAdminAddDocument(w http.ResponseWriter, r *http.Request) {
	orderID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Label   string `json:"label"`
		FileURL string `json:"file_url"`
	}
	if err := readJSON(r, &req); err != nil || req.FileURL == "" {
		writeErr(w, 400, "file_url required")
		return
	}
	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO partner_documents (partner_order_id, label, file_url) VALUES ($1,$2,$3) RETURNING id`,
		orderID, req.Label, req.FileURL).Scan(&id); err != nil {
		writeErr(w, 500, "could not save document")
		return
	}
	writeJSON(w, 201, map[string]interface{}{"id": id})
}

// handleAdminDeleteDocument removes a document from an order.
func (s *Server) handleAdminDeleteDocument(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM partner_documents WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}
