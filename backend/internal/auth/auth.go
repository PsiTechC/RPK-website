package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const (
	ctxUserID ctxKey = "uid"
	ctxRole   ctxKey = "role"
)

type Service struct {
	secret []byte
}

func New(secret string) *Service { return &Service{secret: []byte(secret)} }

func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

func (s *Service) Issue(userID int64, role string) (string, error) {
	claims := jwt.MapClaims{
		"uid":  userID,
		"role": role,
		"exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":  time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s *Service) parse(tokenStr string) (int64, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return 0, "", errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", errors.New("invalid claims")
	}
	uidF, _ := claims["uid"].(float64)
	role, _ := claims["role"].(string)
	return int64(uidF), role, nil
}

// Required rejects requests without a valid token.
func (s *Service) Required(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, role, err := s.fromRequest(r)
		if err != nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ctxUserID, uid)
		ctx = context.WithValue(ctx, ctxRole, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Optional attaches the user (uid/role) to the request context when a valid
// token is present, but lets the request through either way. Use for endpoints
// that are open to the public yet should associate the record with the
// logged-in user when there is one (e.g. import/export registrations).
func (s *Service) Optional(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if uid, role, err := s.fromRequest(r); err == nil {
			ctx := context.WithValue(r.Context(), ctxUserID, uid)
			ctx = context.WithValue(ctx, ctxRole, role)
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

// AdminOnly requires a valid token whose role is admin.
func (s *Service) AdminOnly(next http.Handler) http.Handler {
	return s.Required(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RoleFrom(r.Context()) != "admin" {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	}))
}

func (s *Service) fromRequest(r *http.Request) (int64, string, error) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return 0, "", errors.New("missing bearer token")
	}
	return s.parse(strings.TrimPrefix(h, "Bearer "))
}

func UserIDFrom(ctx context.Context) int64 {
	v, _ := ctx.Value(ctxUserID).(int64)
	return v
}

func RoleFrom(ctx context.Context) string {
	v, _ := ctx.Value(ctxRole).(string)
	return v
}
