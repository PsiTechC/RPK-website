package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-0123456789abcdef"

func newSvc() *Service { return New(testSecret) }

func TestIssueAndParseRoundTrip(t *testing.T) {
	s := newSvc()
	tok, err := s.Issue(42, "admin")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	uid, role, err := s.parse(tok)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if uid != 42 || role != "admin" {
		t.Fatalf("got uid=%d role=%q, want 42/admin", uid, role)
	}
}

func TestParseRejectsTamperedToken(t *testing.T) {
	s := newSvc()
	tok, _ := s.Issue(1, "customer")
	tampered := tok[:len(tok)-2] + "xx"
	if _, _, err := s.parse(tampered); err == nil {
		t.Fatal("tampered token was accepted — signature not verified")
	}
}

func TestParseRejectsWrongSecret(t *testing.T) {
	tok, _ := New("a-different-secret-key-1234567").Issue(1, "admin")
	if _, _, err := newSvc().parse(tok); err == nil {
		t.Fatal("token signed with a different secret was accepted")
	}
}

// The classic JWT "alg=none" downgrade attack must be rejected.
func TestParseRejectsNoneAlg(t *testing.T) {
	claims := jwt.MapClaims{"uid": 1, "role": "admin", "exp": time.Now().Add(time.Hour).Unix()}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("craft none token: %v", err)
	}
	if _, _, err := newSvc().parse(tok); err == nil {
		t.Fatal("alg=none token was accepted — privilege escalation possible")
	}
}

// An RS/HS confusion attempt (non-HMAC method) must be rejected.
func TestParseRejectsExpiredToken(t *testing.T) {
	claims := jwt.MapClaims{"uid": 1, "role": "admin", "exp": time.Now().Add(-time.Hour).Unix()}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if _, _, err := newSvc().parse(tok); err == nil {
		t.Fatal("expired token was accepted")
	}
}

func TestAdminOnlyBlocksNonAdmin(t *testing.T) {
	s := newSvc()
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) })
	h := s.AdminOnly(next)

	cases := []struct {
		name   string
		bearer string
		want   int
	}{
		{"no token", "", http.StatusUnauthorized},
		{"customer token", must(s.Issue(1, "customer")), http.StatusForbidden},
		{"admin token", must(s.Issue(1, "admin")), http.StatusOK},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/admin/x", nil)
			if c.bearer != "" {
				req.Header.Set("Authorization", "Bearer "+c.bearer)
			}
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			if rr.Code != c.want {
				t.Fatalf("status=%d, want %d", rr.Code, c.want)
			}
		})
	}
}

func TestRequiredInjectsContext(t *testing.T) {
	s := newSvc()
	var gotUID int64
	var gotRole string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUID = UserIDFrom(r.Context())
		gotRole = RoleFrom(r.Context())
		w.WriteHeader(200)
	})
	tok, _ := s.Issue(7, "customer")
	req := httptest.NewRequest("GET", "/me", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()
	s.Required(next).ServeHTTP(rr, req)
	if rr.Code != 200 || gotUID != 7 || gotRole != "customer" {
		t.Fatalf("status=%d uid=%d role=%q", rr.Code, gotUID, gotRole)
	}
}

func TestHashAndCheckPassword(t *testing.T) {
	h, err := HashPassword("Sw0rdf1sh!")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !CheckPassword(h, "Sw0rdf1sh!") {
		t.Fatal("correct password rejected")
	}
	if CheckPassword(h, "wrong") {
		t.Fatal("wrong password accepted")
	}
	if h == "Sw0rdf1sh!" {
		t.Fatal("password stored in plaintext")
	}
}

func must(tok string, _ error) string { return tok }

var _ = context.Background
