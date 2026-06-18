package api

import (
	"net/http"
	"sync"
	"time"
)

// rateLimiter is a tiny in-memory sliding-window limiter keyed by client IP.
// It protects abuse-prone public endpoints (auth brute force, the paid chatbot,
// inquiry/registration email floods) without any external dependency.
//
// Note: per-process state — fine for a single backend instance. If the API is
// ever scaled horizontally, move this to Redis.
type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]int64
	limit  int
	window time.Duration
	nowFn  func() time.Time // injectable for tests
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		hits:   make(map[string][]int64),
		limit:  limit,
		window: window,
		nowFn:  time.Now,
	}
	go rl.janitor()
	return rl
}

// janitor periodically drops keys whose hits have all aged out, so the map can't
// grow unbounded under an IP-spray attack.
func (rl *rateLimiter) janitor() {
	for {
		time.Sleep(rl.window)
		cutoff := rl.nowFn().UnixNano() - rl.window.Nanoseconds()
		rl.mu.Lock()
		for k, times := range rl.hits {
			fresh := false
			for _, t := range times {
				if t > cutoff {
					fresh = true
					break
				}
			}
			if !fresh {
				delete(rl.hits, k)
			}
		}
		rl.mu.Unlock()
	}
}

// allow records a hit for key and reports whether it is within the limit.
func (rl *rateLimiter) allow(key string) bool {
	now := rl.nowFn().UnixNano()
	cutoff := now - rl.window.Nanoseconds()

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Drop timestamps older than the window.
	times := rl.hits[key]
	kept := times[:0]
	for _, t := range times {
		if t > cutoff {
			kept = append(kept, t)
		}
	}
	if len(kept) >= rl.limit {
		rl.hits[key] = kept
		return false
	}
	rl.hits[key] = append(kept, now)
	return true
}

// middleware enforces the limit per client IP (chi's RealIP sets RemoteAddr from
// X-Forwarded-For when present, so this works behind nginx).
func (rl *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if !rl.allow(key) {
			w.Header().Set("Retry-After", "60")
			writeErr(w, http.StatusTooManyRequests, "too many requests — please slow down and try again shortly")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP returns the best-effort client identifier. RemoteAddr is "ip:port";
// strip the port. (chi middleware.RealIP rewrites RemoteAddr from trusted
// X-Forwarded-For / X-Real-IP headers upstream.)
func clientIP(r *http.Request) string {
	addr := r.RemoteAddr
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			return addr[:i]
		}
	}
	return addr
}
