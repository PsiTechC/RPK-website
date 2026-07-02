package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

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
	r.Use(middleware.RealIP) // trust X-Forwarded-For from the nginx proxy for rate-limit keys
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Abuse limiters (per client IP). Auth = brute-force guard; chat = paid API
	// cost guard; contact = admin email-flood guard.
	authLimit := newRateLimiter(10, time.Minute)
	chatLimit := newRateLimiter(20, time.Minute)
	contactLimit := newRateLimiter(5, time.Minute)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	// Serve admin-uploaded product images. nosniff stops browsers from
	// re-interpreting a file as HTML/script regardless of its extension.
	fileServer := http.FileServer(http.Dir(s.cfg.UploadsDir))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		fileServer.ServeHTTP(w, req)
	})))

	r.Route("/api", func(r chi.Router) {
		// Public — auth endpoints are rate-limited against brute force.
		r.With(authLimit.middleware).Post("/auth/register", s.handleRegister)
		r.With(authLimit.middleware).Post("/auth/login", s.handleLogin)
		r.With(authLimit.middleware).Post("/auth/forgot-password", s.handleForgotPassword)
		r.With(authLimit.middleware).Post("/auth/reset-password", s.handleResetPassword)

		r.Get("/categories", s.handleListCategories)
		r.Get("/products", s.handleListProducts)
		r.Get("/products/{id}", s.handleGetProduct)
		r.Get("/products/{id}/reviews", s.handleListReviews)

		// import/export — open to public, but link the user when logged in so it
		// shows under "My Registrations" on their account.
		r.With(contactLimit.middleware, s.auth.Optional).Post("/registrations", s.handleCreateRegistration)
		r.With(chatLimit.middleware).Post("/chat", s.handleChat)        // AI chatbot (paid API)
		r.Get("/stats", s.handlePublicStats)                            // homepage counters
		r.With(contactLimit.middleware).Post("/inquiries", s.handleCreateInquiry) // contact form → admin email
		r.With(contactLimit.middleware).Post("/feedback", s.handleCreateFeedback) // website star-rating feedback
		r.With(contactLimit.middleware).Post("/uploads/document", s.handleUploadDocument) // partner application docs (PDF/image)
		r.Get("/news", s.handleListNews) // public news list
		r.Get("/founders", s.handleListFounders) // public founders / team cards (About page)

		// Authenticated (any logged-in user)
		r.Group(func(r chi.Router) {
			r.Use(s.auth.Required)
			r.Get("/auth/me", s.handleMe)
			r.Post("/orders", s.handleCreateOrder) // checkout requires an account
			r.Post("/products/{id}/reviews", s.handleCreateReview) // post a review (login required)
			r.Get("/my/orders", s.handleMyOrders)
			r.Get("/my/orders/{id}", s.handleMyOrder)
			r.Get("/my/registrations", s.handleMyRegistrations)
			r.Post("/rfqs", s.handleCreateRFQ)                      // partner: request a quotation
			r.Get("/my/rfqs", s.handleMyRFQs)                       // partner: my RFQs + quotations
			r.Patch("/my/quotations/{id}", s.handleRespondQuotation) // partner: approve/reject a quotation
			r.Get("/my/partner-orders", s.handleMyPartnerOrders)    // partner: my orders
		})

		// Admin only
		r.Route("/admin", func(r chi.Router) {
			r.Use(s.auth.AdminOnly)
			r.Get("/stats", s.handleAdminStats)
			r.Get("/customers", s.handleAdminListCustomers)

			r.Post("/categories", s.handleCreateCategory)
			r.Patch("/categories/reorder", s.handleReorderCategories)
			r.Put("/categories/{id}", s.handleUpdateCategory)
			r.Delete("/categories/{id}", s.handleDeleteCategory)

			r.Get("/products/archived", s.handleListArchivedProducts)
			r.Patch("/products/reorder", s.handleReorderProducts)
			r.Post("/products", s.handleCreateProduct)
			r.Put("/products/{id}", s.handleUpdateProduct)
			r.Delete("/products/{id}", s.handleDeleteProduct)           // soft-delete (archive)
			r.Patch("/products/{id}/restore", s.handleRestoreProduct)   // un-archive
			r.Patch("/products/{id}/featured", s.handleSetFeatured)     // toggle home-page featured
			r.Delete("/products/{id}/purge", s.handlePurgeProduct)      // permanent delete

			r.Post("/uploads", s.handleUploadImage)

			r.Get("/orders", s.handleAdminListOrders)
			r.Get("/orders/{id}", s.handleAdminGetOrder)
			r.Patch("/orders/{id}", s.handleAdminUpdateOrder)

			r.Get("/registrations", s.handleAdminListRegistrations)
			r.Patch("/registrations/{id}", s.handleAdminUpdateRegistration)

			r.Get("/rfqs", s.handleAdminListRFQs)                       // all RFQ requests
			r.Post("/rfqs/{id}/quotations", s.handleAdminCreateQuotation) // reply with a quotation

			r.Get("/partner-orders", s.handleAdminListPartnerOrders)      // all partner orders
			r.Patch("/partner-orders/{id}", s.handleAdminUpdatePartnerOrder)
			r.Put("/partner-orders/{id}/shipment", s.handleAdminUpsertShipment)    // Phase 7
			r.Post("/partner-orders/{id}/documents", s.handleAdminAddDocument)     // Phase 8
			r.Delete("/partner-documents/{id}", s.handleAdminDeleteDocument)

			r.Get("/inquiries", s.handleAdminListInquiries)
			r.Patch("/inquiries/{id}", s.handleAdminUpdateInquiry)

			r.Get("/feedback", s.handleAdminListFeedback)

			r.Get("/news", s.handleAdminListNews)
			r.Post("/news", s.handleCreateNews)
			r.Put("/news/{id}", s.handleUpdateNews)
			r.Delete("/news/{id}", s.handleDeleteNews)

			r.Post("/founders", s.handleCreateFounder)
			r.Put("/founders/{id}", s.handleUpdateFounder)
			r.Delete("/founders/{id}", s.handleDeleteFounder)

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

// maxRequestBytes caps JSON request bodies to prevent memory-exhaustion DoS.
// (Image uploads use their own, larger limit on a separate path.)
const maxRequestBytes = 1 << 20 // 1 MiB

func readJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, maxRequestBytes))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// parseLimitOffset clamps client-supplied pagination to a safe range so list
// endpoints can never run an unbounded query.
func parseLimitOffset(limitStr, offsetStr string, def, max int) (int, int) {
	limit := def
	if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
		limit = n
	}
	if limit > max {
		limit = max
	}
	offset := 0
	if n, err := strconv.Atoi(offsetStr); err == nil && n > 0 {
		offset = n
	}
	return limit, offset
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
