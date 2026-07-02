package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Founder struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Bio       string    `json:"bio"`
	ImageURL  string    `json:"image_url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type founderReq struct {
	Name      string `json:"name"`
	Role      string `json:"role"`
	Bio       string `json:"bio"`
	ImageURL  string `json:"image_url"`
	SortOrder int    `json:"sort_order"`
}

func scanFounderRows(rows interface {
	Next() bool
	Scan(...interface{}) error
}) ([]Founder, error) {
	out := []Founder{}
	for rows.Next() {
		var f Founder
		if err := rows.Scan(&f.ID, &f.Name, &f.Role, &f.Bio, &f.ImageURL, &f.SortOrder, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, nil
}

// handleListFounders — public: all founder cards in display order.
func (s *Server) handleListFounders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, name, role, bio, image_url, sort_order, created_at, updated_at
		 FROM founders ORDER BY sort_order, id`)
	if err != nil {
		writeErr(w, 500, "could not load founders")
		return
	}
	defer rows.Close()
	out, err := scanFounderRows(rows)
	if err != nil {
		writeErr(w, 500, "scan failed")
		return
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleCreateFounder(w http.ResponseWriter, r *http.Request) {
	var req founderReq
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, 400, "name required")
		return
	}
	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO founders (name, role, bio, image_url, sort_order)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		strings.TrimSpace(req.Name), strings.TrimSpace(req.Role), req.Bio, strings.TrimSpace(req.ImageURL), req.SortOrder,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not create founder")
		return
	}
	writeJSON(w, 201, map[string]int64{"id": id})
}

func (s *Server) handleUpdateFounder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req founderReq
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, 400, "name required")
		return
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE founders SET name=$1, role=$2, bio=$3, image_url=$4, sort_order=$5, updated_at=now() WHERE id=$6`,
		strings.TrimSpace(req.Name), strings.TrimSpace(req.Role), req.Bio, strings.TrimSpace(req.ImageURL), req.SortOrder, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "founder not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (s *Server) handleDeleteFounder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM founders WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}
