package api

import "net/http"

// handlePublicStats powers the homepage counters. Safe to expose publicly —
// only aggregate counts, no records. "countries" is the number of distinct
// countries among approved import/export registrations (i.e. partners that have
// joined RPK).
func (s *Server) handlePublicStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	scalar := func(q string) int {
		var v int
		_ = s.pool.QueryRow(ctx, q).Scan(&v)
		return v
	}

	out := map[string]int{
		"products":   scalar(`SELECT COUNT(*) FROM products WHERE is_active = TRUE AND archived_at IS NULL`),
		"categories": scalar(`SELECT COUNT(*) FROM categories`),
		"countries": scalar(`SELECT COUNT(DISTINCT lower(trim(country)))
		                     FROM import_export_registrations
		                     WHERE status = 'approved' AND trim(country) <> ''`),
	}
	writeJSON(w, http.StatusOK, out)
}
