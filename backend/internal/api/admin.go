package api

import (
	"net/http"

	"github.com/rpkfood/backend/internal/models"
)

// handleAdminListCustomers returns all non-admin users for the Customers tab.
func (s *Server) handleAdminListCustomers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, name, email, phone, role, created_at FROM users WHERE role <> 'admin' ORDER BY created_at DESC`)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()

	out := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.CreatedAt); err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, u)
	}
	writeJSON(w, 200, out)
}

// handleAdminStats powers the admin dashboard cards & charts.
func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats := map[string]interface{}{}

	scalar := func(q string) float64 {
		var v float64
		_ = s.pool.QueryRow(ctx, q).Scan(&v)
		return v
	}

	// "In catalogue" = non-archived products. This matches the admin product list
	// (which is ?all=1 → non-archived) and the sidebar badge, so counts never diverge.
	stats["total_products"] = scalar(`SELECT COUNT(*) FROM products WHERE archived_at IS NULL`)
	stats["active_products"] = scalar(`SELECT COUNT(*) FROM products WHERE is_active=TRUE AND archived_at IS NULL`)
	stats["total_categories"] = scalar(`SELECT COUNT(*) FROM categories`)
	stats["total_customers"] = scalar(`SELECT COUNT(*) FROM users WHERE role <> 'admin'`)
	stats["total_orders"] = scalar(`SELECT COUNT(*) FROM orders`)
	stats["pending_orders"] = scalar(`SELECT COUNT(*) FROM orders WHERE status='pending'`)
	stats["total_revenue"] = scalar(`SELECT COALESCE(SUM(subtotal),0) FROM orders WHERE payment_status='paid'`)
	stats["pending_registrations"] = scalar(`SELECT COUNT(*) FROM import_export_registrations WHERE status='pending'`)
	stats["total_registrations"] = scalar(`SELECT COUNT(*) FROM import_export_registrations`)

	// B2B partner portal (Phases 1–8)
	stats["total_partners"] = scalar(`SELECT COUNT(*) FROM users WHERE role IN ('import_partner','export_partner')`)
	stats["total_rfqs"] = scalar(`SELECT COUNT(*) FROM rfqs`)
	stats["open_rfqs"] = scalar(`SELECT COUNT(*) FROM rfqs WHERE status IN ('open','quoted')`)
	stats["partner_orders"] = scalar(`SELECT COUNT(*) FROM partner_orders`)
	stats["partner_orders_unpaid"] = scalar(`SELECT COUNT(*) FROM partner_orders WHERE payment_status <> 'paid'`)
	stats["active_shipments"] = scalar(`SELECT COUNT(*) FROM shipments WHERE status='in_transit'`)

	// Orders grouped by status for a simple chart.
	byStatus := map[string]float64{}
	rows, err := s.pool.Query(ctx, `SELECT status, COUNT(*) FROM orders GROUP BY status`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var st string
			var n float64
			if err := rows.Scan(&st, &n); err == nil {
				byStatus[st] = n
			}
		}
	}
	stats["orders_by_status"] = byStatus

	writeJSON(w, 200, stats)
}
