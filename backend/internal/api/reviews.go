package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
)

type Review struct {
	ID         int64     `json:"id"`
	ProductID  int64     `json:"product_id"`
	UserID     *int64    `json:"user_id"`
	AuthorName string    `json:"author_name"`
	Rating     int       `json:"rating"`
	Comment    string    `json:"comment"`
	CreatedAt  time.Time `json:"created_at"`
}

// handleListReviews — public list of reviews for a product (newest first).
func (s *Server) handleListReviews(w http.ResponseWriter, r *http.Request) {
	pid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, product_id, user_id, author_name, rating, comment, created_at
		 FROM reviews WHERE product_id=$1 ORDER BY created_at DESC`, pid)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()

	out := []Review{}
	for rows.Next() {
		var rv Review
		if err := rows.Scan(&rv.ID, &rv.ProductID, &rv.UserID, &rv.AuthorName, &rv.Rating, &rv.Comment, &rv.CreatedAt); err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, rv)
	}
	writeJSON(w, 200, out)
}

// handleCreateReview — logged-in users post (or update) their review for a product.
func (s *Server) handleCreateReview(w http.ResponseWriter, r *http.Request) {
	pid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	uid := auth.UserIDFrom(r.Context())

	var req struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeErr(w, 400, "rating must be between 1 and 5")
		return
	}

	// author name from the user record
	var name string
	_ = s.pool.QueryRow(r.Context(), `SELECT name FROM users WHERE id=$1`, uid).Scan(&name)

	var rv Review
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
		 VALUES ($1,$2,$3,$4,$5)
		 ON CONFLICT (product_id, user_id)
		   DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment,
		                 author_name=EXCLUDED.author_name, created_at=now()
		 RETURNING id, product_id, user_id, author_name, rating, comment, created_at`,
		pid, uid, name, req.Rating, req.Comment,
	).Scan(&rv.ID, &rv.ProductID, &rv.UserID, &rv.AuthorName, &rv.Rating, &rv.Comment, &rv.CreatedAt)
	if err != nil {
		writeErr(w, 500, "could not save review")
		return
	}
	writeJSON(w, 201, rv)
}

// handleAdminDeleteReview — admin removes a review.
func (s *Server) handleAdminDeleteReview(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM reviews WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}
