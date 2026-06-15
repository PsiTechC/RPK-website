package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/config"
)

type Server struct {
	pool *pgxpool.Pool
	auth *auth.Service
	cfg  config.Config
}

func NewServer(pool *pgxpool.Pool, authSvc *auth.Service, cfg config.Config) *Server {
	return &Server{pool: pool, auth: authSvc, cfg: cfg}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	// Serve admin-uploaded product images.
	fileServer := http.FileServer(http.Dir(s.cfg.UploadsDir))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", fileServer))

	r.Route("/api", func(r chi.Router) {
		// Public
		r.Post("/auth/register", s.handleRegister)
		r.Post("/auth/login", s.handleLogin)

		r.Get("/categories", s.handleListCategories)
		r.Get("/products", s.handleListProducts)
		r.Get("/products/{id}", s.handleGetProduct)
		r.Get("/products/{id}/reviews", s.handleListReviews)

		r.Post("/registrations", s.handleCreateRegistration) // import/export — open to public + logged-in
		r.Post("/chat", s.handleChat)                        // AI chatbot
		r.Get("/stats", s.handlePublicStats)                 // homepage counters (products/categories/countries)
		r.Post("/inquiries", s.handleCreateInquiry)          // "Call to Inquiry" / contact form

		// Authenticated (any logged-in user)
		r.Group(func(r chi.Router) {
			r.Use(s.auth.Required)
			r.Get("/auth/me", s.handleMe)
			r.Post("/orders", s.handleCreateOrder) // checkout requires an account
			r.Post("/products/{id}/reviews", s.handleCreateReview) // post a review (login required)
			r.Get("/my/orders", s.handleMyOrders)
			r.Get("/my/registrations", s.handleMyRegistrations)
		})

		// Admin only
		r.Route("/admin", func(r chi.Router) {
			r.Use(s.auth.AdminOnly)
			r.Get("/stats", s.handleAdminStats)

			r.Post("/categories", s.handleCreateCategory)
			r.Put("/categories/{id}", s.handleUpdateCategory)
			r.Delete("/categories/{id}", s.handleDeleteCategory)

			r.Get("/products/archived", s.handleListArchivedProducts)
			r.Post("/products", s.handleCreateProduct)
			r.Put("/products/{id}", s.handleUpdateProduct)
			r.Delete("/products/{id}", s.handleDeleteProduct)           // soft-delete (archive)
			r.Patch("/products/{id}/restore", s.handleRestoreProduct)   // un-archive
			r.Delete("/products/{id}/purge", s.handlePurgeProduct)      // permanent delete

			r.Post("/uploads", s.handleUploadImage)

			r.Get("/orders", s.handleAdminListOrders)
			r.Get("/orders/{id}", s.handleAdminGetOrder)
			r.Patch("/orders/{id}", s.handleAdminUpdateOrder)

			r.Get("/registrations", s.handleAdminListRegistrations)
			r.Patch("/registrations/{id}", s.handleAdminUpdateRegistration)

			r.Get("/inquiries", s.handleAdminListInquiries)
			r.Patch("/inquiries/{id}", s.handleAdminUpdateInquiry)

			r.Delete("/reviews/{id}", s.handleAdminDeleteReview)
		})
	})

	return r
}

// ---- helpers ----

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
