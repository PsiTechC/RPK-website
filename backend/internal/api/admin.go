package api

import "net/http"

// handleAdminStats powers the admin dashboard cards & charts.
func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stats := map[string]interface{}{}

	scalar := func(q string) float64 {
		var v float64
		_ = s.pool.QueryRow(ctx, q).Scan(&v)
		return v
	}

	stats["total_products"] = scalar(`SELECT COUNT(*) FROM products`)
	stats["active_products"] = scalar(`SELECT COUNT(*) FROM products WHERE is_active=TRUE`)
	stats["total_categories"] = scalar(`SELECT COUNT(*) FROM categories`)
	stats["total_customers"] = scalar(`SELECT COUNT(*) FROM users WHERE role <> 'admin'`)
	stats["total_orders"] = scalar(`SELECT COUNT(*) FROM orders`)
	stats["pending_orders"] = scalar(`SELECT COUNT(*) FROM orders WHERE status='pending'`)
	stats["total_revenue"] = scalar(`SELECT COALESCE(SUM(subtotal),0) FROM orders WHERE payment_status='paid'`)
	stats["pending_registrations"] = scalar(`SELECT COUNT(*) FROM import_export_registrations WHERE status='pending'`)
	stats["total_registrations"] = scalar(`SELECT COUNT(*) FROM import_export_registrations`)

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
