package api

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type feedbackReq struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

// handleCreateFeedback stores a website star-rating + comment and notifies admin.
func (s *Server) handleCreateFeedback(w http.ResponseWriter, r *http.Request) {
	var req feedbackReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeErr(w, 400, "rating must be between 1 and 5")
		return
	}
	req.Comment = strings.TrimSpace(req.Comment)
	if len(req.Comment) > 4000 {
		req.Comment = req.Comment[:4000]
	}

	var id int64
	if err := s.pool.QueryRow(r.Context(),
		`INSERT INTO feedback (rating, comment) VALUES ($1,$2) RETURNING id`,
		req.Rating, req.Comment,
	).Scan(&id); err != nil {
		writeErr(w, 500, "could not save feedback")
		return
	}

	// Notify admin (async — don't block on SMTP). detailTable HTML-escapes values.
	go func(req feedbackReq, id int64) {
		body := detailTable([]emailRow{
			{Label: "Rating", Value: strconv.Itoa(req.Rating) + " / 5"},
			{Label: "Comment", Value: req.Comment},
		})
		htmlBody := emailShell("New Website Feedback", "A visitor rated the RPK website.", body, "Sent automatically from the RPK website.")
		if err := s.sendMail(s.cfg.AdminEmail, "New website feedback — "+strconv.Itoa(req.Rating)+"★", htmlBody); err != nil {
			log.Printf("[mail] feedback #%d notification failed: %v", id, err)
		}
	}(req, id)

	writeJSON(w, 201, map[string]interface{}{"id": id, "status": "received"})
}

// handleAdminListFeedback returns all website feedback, newest first.
func (s *Server) handleAdminListFeedback(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, rating, comment, created_at FROM feedback ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		writeErr(w, 500, "could not load feedback")
		return
	}
	defer rows.Close()

	type fb struct {
		ID        int64     `json:"id"`
		Rating    int       `json:"rating"`
		Comment   string    `json:"comment"`
		CreatedAt time.Time `json:"created_at"`
	}
	out := []fb{}
	for rows.Next() {
		var f fb
		if err := rows.Scan(&f.ID, &f.Rating, &f.Comment, &f.CreatedAt); err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, f)
	}
	writeJSON(w, 200, out)
}
