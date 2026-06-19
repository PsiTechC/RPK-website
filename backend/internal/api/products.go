package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/models"
)

// ---- categories ----

func (s *Server) handleListCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT id, name, slug, description, image_url, sort_order, created_at
		 FROM categories ORDER BY sort_order, name`)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()

	out := []models.Category{}
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL, &c.SortOrder, &c.CreatedAt); err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, c)
	}
	writeJSON(w, 200, out)
}

type categoryReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	SortOrder   int    `json:"sort_order"`
}

func (s *Server) handleCreateCategory(w http.ResponseWriter, r *http.Request) {
	var req categoryReq
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	var c models.Category
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO categories (name, slug, description, image_url, sort_order)
		 VALUES ($1,$2,$3,$4,$5)
		 RETURNING id, name, slug, description, image_url, sort_order, created_at`,
		req.Name, slugify(req.Name), req.Description, req.ImageURL, req.SortOrder,
	).Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.ImageURL, &c.SortOrder, &c.CreatedAt)
	if err != nil {
		writeErr(w, 500, "could not create category")
		return
	}
	writeJSON(w, 201, c)
}

func (s *Server) handleUpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req categoryReq
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE categories SET name=$1, slug=$2, description=$3, image_url=$4, sort_order=$5 WHERE id=$6`,
		req.Name, slugify(req.Name), req.Description, req.ImageURL, req.SortOrder, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "category not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (s *Server) handleDeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM categories WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// ---- products ----

func (s *Server) handleListProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	args := []interface{}{}
	where := "WHERE 1=1"

	// Archived (soft-deleted) products never appear in the normal listings.
	where += " AND p.archived_at IS NULL"
	// Public callers only see active products; admin can pass ?all=1
	if q.Get("all") != "1" {
		where += " AND p.is_active = TRUE"
	}
	if cat := q.Get("category_id"); cat != "" {
		if id, err := strconv.ParseInt(cat, 10, 64); err == nil {
			args = append(args, id)
			where += " AND p.category_id = $" + strconv.Itoa(len(args))
		}
	}
	if slug := q.Get("category"); slug != "" {
		args = append(args, slug)
		where += " AND c.slug = $" + strconv.Itoa(len(args))
	}
	if search := q.Get("q"); search != "" {
		args = append(args, "%"+search+"%")
		where += " AND p.name ILIKE $" + strconv.Itoa(len(args))
	}
	if q.Get("featured") == "1" {
		where += " AND p.is_featured = TRUE"
	}

	// Bound the result set so the query can never be truly unbounded. Default
	// 1000 (covers the whole catalogue today); callers may page with ?limit/?offset.
	limit, offset := parseLimitOffset(q.Get("limit"), q.Get("offset"), 1000, 1000)
	args = append(args, limit)
	limitClause := " LIMIT $" + strconv.Itoa(len(args))
	args = append(args, offset)
	offsetClause := " OFFSET $" + strconv.Itoa(len(args))

	sql := `SELECT p.id, p.name, p.slug, p.category_id, COALESCE(c.name,''), p.unit, p.price,
	               p.currency, p.image_url, p.description, p.stock, p.is_active, p.created_at, p.updated_at,
		        COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews rv WHERE rv.product_id=p.id),0),
		        (SELECT COUNT(*) FROM reviews rv WHERE rv.product_id=p.id),
		        p.highlights, p.nutrition, p.seller, p.is_featured
	        FROM products p LEFT JOIN categories c ON c.id = p.category_id ` +
		where + ` ORDER BY p.sort_order, p.name` + limitClause + offsetClause

	rows, err := s.pool.Query(r.Context(), sql, args...)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()

	out := []models.Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, p)
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleGetProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	row := s.pool.QueryRow(r.Context(),
		`SELECT p.id, p.name, p.slug, p.category_id, COALESCE(c.name,''), p.unit, p.price,
		        p.currency, p.image_url, p.description, p.stock, p.is_active, p.created_at, p.updated_at,
		        COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews rv WHERE rv.product_id=p.id),0),
		        (SELECT COUNT(*) FROM reviews rv WHERE rv.product_id=p.id),
		        p.highlights, p.nutrition, p.seller, p.is_featured
		 FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id=$1`, id)
	p, err := scanProduct(row)
	if err != nil {
		writeErr(w, 404, "product not found")
		return
	}
	writeJSON(w, 200, p)
}

type productReq struct {
	Name        string          `json:"name"`
	CategoryID  *int64          `json:"category_id"`
	Unit        string          `json:"unit"`
	Price       float64         `json:"price"`
	Currency    string          `json:"currency"`
	ImageURL    string          `json:"image_url"`
	Description string          `json:"description"`
	Stock       int             `json:"stock"`
	IsActive    *bool           `json:"is_active"`
	Highlights  json.RawMessage `json:"highlights"`
	Nutrition   string          `json:"nutrition"`
	Seller      string          `json:"seller"`
}

// normHighlights returns a valid JSON array string for the jsonb column.
func normHighlights(raw json.RawMessage) string {
	s := strings.TrimSpace(string(raw))
	if s == "" || s == "null" {
		return "[]"
	}
	return s
}

func (s *Server) handleCreateProduct(w http.ResponseWriter, r *http.Request) {
	var req productReq
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	if req.Unit == "" {
		req.Unit = "PC"
	}
	if req.Currency == "" {
		req.Currency = "AED"
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	var id int64
	err := s.pool.QueryRow(r.Context(),
		`INSERT INTO products (name, slug, category_id, unit, price, currency, image_url, description, stock, is_active, highlights, nutrition, seller)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13) RETURNING id`,
		req.Name, slugify(req.Name), req.CategoryID, req.Unit, req.Price, req.Currency,
		req.ImageURL, req.Description, req.Stock, active, normHighlights(req.Highlights), req.Nutrition, req.Seller,
	).Scan(&id)
	if err != nil {
		writeErr(w, 500, "could not create product")
		return
	}
	writeJSON(w, 201, map[string]int64{"id": id})
}

func (s *Server) handleUpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req productReq
	if err := readJSON(r, &req); err != nil || req.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	if req.Unit == "" {
		req.Unit = "PC"
	}
	if req.Currency == "" {
		req.Currency = "AED"
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE products SET name=$1, slug=$2, category_id=$3, unit=$4, price=$5, currency=$6,
		        image_url=$7, description=$8, stock=$9, is_active=$10,
		        highlights=$11::jsonb, nutrition=$12, seller=$13, updated_at=now()
		 WHERE id=$14`,
		req.Name, slugify(req.Name), req.CategoryID, req.Unit, req.Price, req.Currency,
		req.ImageURL, req.Description, req.Stock, active,
		normHighlights(req.Highlights), req.Nutrition, req.Seller, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "product not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

// handleDeleteProduct soft-deletes: the product is archived (recoverable),
// not physically removed.
func (s *Server) handleDeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	ct, err := s.pool.Exec(r.Context(), `UPDATE products SET archived_at = now(), updated_at = now() WHERE id=$1 AND archived_at IS NULL`, id)
	if err != nil {
		writeErr(w, 500, "archive failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "product not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "archived"})
}

// handleRestoreProduct brings an archived product back to the live catalogue.
func (s *Server) handleRestoreProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	ct, err := s.pool.Exec(r.Context(), `UPDATE products SET archived_at = NULL, updated_at = now() WHERE id=$1`, id)
	if err != nil {
		writeErr(w, 500, "restore failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "product not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "restored"})
}

// handlePurgeProduct permanently removes a product (only used from the archive).
func (s *Server) handlePurgeProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := s.pool.Exec(r.Context(), `DELETE FROM products WHERE id=$1`, id); err != nil {
		writeErr(w, 500, "delete failed")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// handleListArchivedProducts returns the soft-deleted products (admin only).
func (s *Server) handleListArchivedProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT p.id, p.name, p.slug, p.category_id, COALESCE(c.name,''), p.unit, p.price,
		        p.currency, p.image_url, p.description, p.stock, p.is_active, p.created_at, p.updated_at,
		        COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews rv WHERE rv.product_id=p.id),0),
		        (SELECT COUNT(*) FROM reviews rv WHERE rv.product_id=p.id),
		        p.highlights, p.nutrition, p.seller, p.is_featured
		 FROM products p LEFT JOIN categories c ON c.id = p.category_id
		 WHERE p.archived_at IS NOT NULL ORDER BY p.archived_at DESC`)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	defer rows.Close()
	out := []models.Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			writeErr(w, 500, "scan failed")
			return
		}
		out = append(out, p)
	}
	writeJSON(w, 200, out)
}

// reorder helper: assign sort_order = position for the given ids, in one tx.
func (s *Server) reorder(w http.ResponseWriter, r *http.Request, table string) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	tx, err := s.pool.Begin(r.Context())
	if err != nil {
		writeErr(w, 500, "could not start transaction")
		return
	}
	defer tx.Rollback(r.Context())
	for i, id := range req.IDs {
		if _, err := tx.Exec(r.Context(), `UPDATE `+table+` SET sort_order=$1 WHERE id=$2`, i, id); err != nil {
			writeErr(w, 500, "reorder failed")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeErr(w, 500, "could not commit")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "reordered"})
}

func (s *Server) handleReorderCategories(w http.ResponseWriter, r *http.Request) {
	s.reorder(w, r, "categories")
}

func (s *Server) handleReorderProducts(w http.ResponseWriter, r *http.Request) {
	s.reorder(w, r, "products")
}

// scanner usable by both Query rows and QueryRow
type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanProduct(row rowScanner) (models.Product, error) {
	var p models.Product
	err := row.Scan(&p.ID, &p.Name, &p.Slug, &p.CategoryID, &p.CategoryName, &p.Unit, &p.Price,
		&p.Currency, &p.ImageURL, &p.Description, &p.Stock, &p.IsActive, &p.CreatedAt, &p.UpdatedAt,
		&p.Rating, &p.ReviewCount, &p.Highlights, &p.Nutrition, &p.Seller, &p.IsFeatured)
	return p, err
}

// handleSetFeatured toggles a product's "featured on home page" flag (admin).
func (s *Server) handleSetFeatured(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Featured bool `json:"featured"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE products SET is_featured=$1, updated_at=now() WHERE id=$2`, req.Featured, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "product not found")
		return
	}
	writeJSON(w, 200, map[string]bool{"featured": req.Featured})
}
