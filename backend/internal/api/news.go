package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type News struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Tag         string    `json:"tag"`
	Body        string    `json:"body"`
	ImageURL    string    `json:"image_url"`
	IsPublished bool      `json:"is_published"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type newsReq struct {
	Title       string `json:"title"`
	Tag         string `json:"tag"`
	Body        string `json:"body"`
	ImageURL    string `json:"image_url"`
	IsPublished *bool  `json:"is_published"`
}

func scanNewsRows(rows interface {
	Next() bool
	Scan(...interface{}) error
}) ([]News, error) {
	out := []News{}
	for rows.Next() {
		var n News
		if err := rows.Scan(&n.ID, &n.Title, &n.Tag, &n.Body, &n.ImageURL, &n.IsPublished, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

// handleListNews — public: only published items, newest first.
func (s *Server) handleListNews(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, title, tag, body, image_url, is_published, created_at, updated_at
		 FROM news WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		writeErr(w, 500, "could not load news")
		return
	}
	defer rows.Close()
	out, err := scanNewsRows(rows)
	if err != nil {
		writeErr(w, 500, "scan failed")
		return
	}
	writeJSON(w, 200, out)
}

// handleAdminListNews — admin: all items (published or not).
func (s *Server) handleAdminListNews(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, title, tag, body, image_url, is_published, created_at, updated_at
		 FROM news ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		writeErr(w, 500, "could not load news")
		return
	}
	defer rows.Close()
	out, err := scanNewsRows(rows)
	if err != nil {
		writeErr(w, 500, "scan failed")
		return
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleCreateNews(w http.ResponseWriter, r *http.Request) {
	var req newsReq
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Title) == "" {
		writeErr(w, 400, "title required")
		return
	}
	pub := true
	if req.IsPublished != nil {
		pub = *req.IsPublished
	}
	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO news (title, tag, body, image_url, is_published)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		strings.TrimSpace(req.Title), strings.TrimSpace(req.Tag), req.Body, strings.TrimSpace(req.ImageURL), pub,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not create news")
		return
	}
	writeJSON(w, 201, map[string]int64{"id": id})
}

func (s *Server) handleUpdateNews(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req newsReq
	if err := readJSON(r, &req); err != nil || strings.TrimSpace(req.Title) == "" {
		writeErr(w, 400, "title required")
		return
	}
	pub := true
	if req.IsPublished != nil {
		pub = *req.IsPublished
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE news SET title=$1, tag=$2, body=$3, image_url=$4, is_published=$5, updated_at=now() WHERE id=$6`,
		strings.TrimSpace(req.Title), strings.TrimSpace(req.Tag), req.Body, strings.TrimSpace(req.ImageURL), pub, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "news not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (s *Server) handleDeleteNews(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM news WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}
