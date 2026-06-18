package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/config"
	"github.com/rpkfood/backend/internal/db"
)

// Integration tests run only when TEST_DATABASE_URL points at a DISPOSABLE
// Postgres (never production / dev data). Without it, they skip so `go test`
// stays green everywhere.
//
//	TEST_DATABASE_URL="postgres://rpk:rpk_password@localhost:5440/rpk_test?sslmode=disable" go test ./internal/api/ -run Integration
const intSecret = "integration-test-secret-0123456789"

var (
	itPool *pgxpool.Pool
	itSrv  http.Handler
	itAuth *auth.Service
	// fixture IDs
	userA, userB, prodID int64
)

func TestMain(m *testing.M) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		os.Exit(m.Run()) // no DB -> integration tests self-skip
	}
	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		panic("TEST_DATABASE_URL set but cannot connect: " + err.Error())
	}
	if err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		panic("migrate test db: " + err.Error())
	}
	// Clean slate, then seed fixtures.
	for _, tbl := range []string{"order_items", "orders", "reviews", "products", "categories", "users", "password_resets", "inquiries", "import_export_registrations"} {
		_, _ = pool.Exec(ctx, "TRUNCATE "+tbl+" RESTART IDENTITY CASCADE")
	}
	hash, _ := auth.HashPassword("Passw0rd!")
	mustExec(ctx, pool, `INSERT INTO users (name,email,password_hash,role) VALUES ('Admin','admin@t.co',$1,'admin')`, hash)
	pool.QueryRow(ctx, `INSERT INTO users (name,email,password_hash,role) VALUES ('A','a@t.co',$1,'customer') RETURNING id`, hash).Scan(&userA)
	pool.QueryRow(ctx, `INSERT INTO users (name,email,password_hash,role) VALUES ('B','b@t.co',$1,'customer') RETURNING id`, hash).Scan(&userB)
	var catID int64
	pool.QueryRow(ctx, `INSERT INTO categories (name,slug) VALUES ('Rice','rice') RETURNING id`).Scan(&catID)
	pool.QueryRow(ctx, `INSERT INTO products (name,slug,category_id,unit,price,currency,stock,is_active) VALUES ('Test Rice','test-rice',$1,'BAG',10.00,'AED',100,TRUE) RETURNING id`, catID).Scan(&prodID)

	itPool = pool
	itAuth = auth.New(intSecret)
	cfg := config.Config{JWTSecret: intSecret}
	itSrv = NewServer(pool, itAuth, cfg).Router()

	code := m.Run()
	pool.Close()
	os.Exit(code)
}

func mustExec(ctx context.Context, p *pgxpool.Pool, sql string, args ...any) {
	if _, err := p.Exec(ctx, sql, args...); err != nil {
		panic(err)
	}
}

func skipNoDB(t *testing.T) {
	if itPool == nil {
		t.Skip("set TEST_DATABASE_URL to run integration tests")
	}
}

func tokenFor(uid int64, role string) string {
	tok, _ := itAuth.Issue(uid, role)
	return tok
}

func doJSON(t *testing.T, method, path, bearer string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	rr := httptest.NewRecorder()
	itSrv.ServeHTTP(rr, req)
	return rr
}

// --- Order: price is server-side, totals correct, payment mocked ---
func TestIntegrationOrderServerSidePricing(t *testing.T) {
	skipNoDB(t)
	// Note: no "price" field is even accepted — proving the client cannot set it.
	rr := doJSON(t, "POST", "/api/orders", tokenFor(userA, "customer"), map[string]any{
		"customer_name":  "A",
		"customer_email": "a@t.co",
		"items":          []map[string]any{{"product_id": prodID, "quantity": 3}},
		"pay":            true,
	})
	if rr.Code != 201 {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var out struct {
		OrderID       int64   `json:"order_id"`
		Subtotal      float64 `json:"subtotal"`
		PaymentStatus string  `json:"payment_status"`
	}
	json.Unmarshal(rr.Body.Bytes(), &out)
	if out.Subtotal != 30.00 {
		t.Fatalf("subtotal=%v, want 30.00 (10.00 * 3 from DB)", out.Subtotal)
	}
	if out.PaymentStatus != "paid" {
		t.Fatalf("payment_status=%q, want paid", out.PaymentStatus)
	}
	// DB persisted the server-side line price, not anything client-supplied.
	var lt float64
	itPool.QueryRow(context.Background(), `SELECT line_total FROM order_items WHERE order_id=$1`, out.OrderID).Scan(&lt)
	if lt != 30.00 {
		t.Fatalf("persisted line_total=%v, want 30.00", lt)
	}
}

// --- IDOR: user B cannot read user A's order ---
func TestIntegrationOrderIDOR(t *testing.T) {
	skipNoDB(t)
	rr := doJSON(t, "POST", "/api/orders", tokenFor(userA, "customer"), map[string]any{
		"customer_name": "A", "customer_email": "a@t.co",
		"items": []map[string]any{{"product_id": prodID, "quantity": 1}},
	})
	var out struct{ OrderID int64 `json:"order_id"` }
	json.Unmarshal(rr.Body.Bytes(), &out)

	// Owner can read it.
	if got := doJSON(t, "GET", "/api/my/orders/"+itoa(out.OrderID), tokenFor(userA, "customer"), nil); got.Code != 200 {
		t.Fatalf("owner read status=%d", got.Code)
	}
	// Another user must NOT (404, not 200).
	if got := doJSON(t, "GET", "/api/my/orders/"+itoa(out.OrderID), tokenFor(userB, "customer"), nil); got.Code != 404 {
		t.Fatalf("IDOR: user B got status=%d reading A's order, want 404", got.Code)
	}
}

// --- AuthZ: admin routes reject a customer token ---
func TestIntegrationAdminOnlyForbidsCustomer(t *testing.T) {
	skipNoDB(t)
	if got := doJSON(t, "GET", "/api/admin/stats", tokenFor(userA, "customer"), nil); got.Code != 403 {
		t.Fatalf("customer hitting admin route got %d, want 403", got.Code)
	}
	if got := doJSON(t, "GET", "/api/admin/stats", "", nil); got.Code != 401 {
		t.Fatalf("no token on admin route got %d, want 401", got.Code)
	}
	if got := doJSON(t, "GET", "/api/admin/stats", tokenFor(1, "admin"), nil); got.Code != 200 {
		t.Fatalf("admin on admin route got %d, want 200", got.Code)
	}
}

// --- Soft-delete archives the product out of public listings ---
func TestIntegrationSoftDeleteHidesProduct(t *testing.T) {
	skipNoDB(t)
	var pid int64
	itPool.QueryRow(context.Background(), `INSERT INTO products (name,slug,unit,price,currency,stock,is_active) VALUES ('Temp','temp-prod','PC',5,'AED',1,TRUE) RETURNING id`).Scan(&pid)

	if got := doJSON(t, "DELETE", "/api/admin/products/"+itoa(pid), tokenFor(1, "admin"), nil); got.Code != 200 {
		t.Fatalf("archive status=%d body=%s", got.Code, got.Body.String())
	}
	list := doJSON(t, "GET", "/api/products", "", nil)
	if bytes.Contains(list.Body.Bytes(), []byte(`"temp-prod"`)) {
		t.Fatal("archived product still appears in public /products listing")
	}
}

// --- Review is an upsert: posting twice keeps exactly one review ---
func TestIntegrationReviewUpsert(t *testing.T) {
	skipNoDB(t)
	for i, c := range []string{"first", "second (edit)"} {
		rr := doJSON(t, "POST", "/api/products/"+itoa(prodID)+"/reviews", tokenFor(userB, "customer"),
			map[string]any{"rating": 4 + i%2, "comment": c})
		if rr.Code != 201 {
			t.Fatalf("review %d status=%d body=%s", i, rr.Code, rr.Body.String())
		}
	}
	var n int
	itPool.QueryRow(context.Background(), `SELECT count(*) FROM reviews WHERE product_id=$1 AND user_id=$2`, prodID, userB).Scan(&n)
	if n != 1 {
		t.Fatalf("review count=%d, want exactly 1 (upsert)", n)
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
