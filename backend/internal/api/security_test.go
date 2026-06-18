package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRateLimiterAllowsUpToLimitThenBlocks(t *testing.T) {
	rl := newRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !rl.allow("1.2.3.4") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if rl.allow("1.2.3.4") {
		t.Fatal("4th request within window should be blocked")
	}
	// A different key is independent.
	if !rl.allow("9.9.9.9") {
		t.Fatal("different IP should not be limited")
	}
}

func TestRateLimiterWindowExpiry(t *testing.T) {
	rl := newRateLimiter(1, time.Minute)
	now := time.Unix(1_000_000, 0)
	rl.nowFn = func() time.Time { return now }

	if !rl.allow("k") {
		t.Fatal("first allowed")
	}
	if rl.allow("k") {
		t.Fatal("second within window must be blocked")
	}
	now = now.Add(61 * time.Second) // advance past the window
	if !rl.allow("k") {
		t.Fatal("after window the request must be allowed again")
	}
}

func TestRateLimiterMiddlewareReturns429(t *testing.T) {
	rl := newRateLimiter(2, time.Minute)
	h := rl.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }))

	do := func() int {
		req := httptest.NewRequest("POST", "/x", nil)
		req.RemoteAddr = "5.5.5.5:1234"
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		return rr.Code
	}
	if do() != 200 || do() != 200 {
		t.Fatal("first two requests should pass")
	}
	if got := do(); got != http.StatusTooManyRequests {
		t.Fatalf("third request status=%d, want 429", got)
	}
}

func TestClientIPStripsPort(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "203.0.113.7:55555"
	if got := clientIP(req); got != "203.0.113.7" {
		t.Fatalf("clientIP=%q, want 203.0.113.7", got)
	}
}

func TestReadJSONRejectsOversizeBody(t *testing.T) {
	big := `{"x":"` + strings.Repeat("a", maxRequestBytes+1) + `"}`
	req := httptest.NewRequest("POST", "/x", strings.NewReader(big))
	var out map[string]any
	if err := readJSON(req, &out); err == nil {
		t.Fatal("oversize body was accepted — memory-exhaustion DoS not prevented")
	}
}

func TestReadJSONRejectsUnknownFields(t *testing.T) {
	type small struct {
		Name string `json:"name"`
	}
	req := httptest.NewRequest("POST", "/x", strings.NewReader(`{"name":"ok","is_admin":true}`))
	var out small
	if err := readJSON(req, &out); err == nil {
		t.Fatal("unknown field accepted — mass-assignment risk")
	}
}

func TestFormatItemsRendersReadableText(t *testing.T) {
	in := json.RawMessage(`[{"product_id":4,"name":"Armana Basmati Rice 10KG","unit":"BAG","qty":2}]`)
	if got := formatItems(in); got != "Armana Basmati Rice 10KG ×2 BAG" {
		t.Fatalf("formatItems=%q", got)
	}
}

func TestFormatItemsEmptyCases(t *testing.T) {
	for _, in := range []string{"", "[]", "null", `[{"name":"  ","qty":1}]`} {
		if got := formatItems(json.RawMessage(in)); got != "" {
			t.Fatalf("formatItems(%q)=%q, want empty", in, got)
		}
	}
}

func TestDetectImageExtRejectsNonImagesAndSVG(t *testing.T) {
	png := []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0}
	if ext, ok := detectImageExt(png); !ok || ext != ".png" {
		t.Fatalf("PNG magic bytes: got %q ok=%v, want .png/true", ext, ok)
	}
	// SVG with a script payload must be rejected (stored-XSS vector).
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)
	if _, ok := detectImageExt(svg); ok {
		t.Fatal("SVG accepted — stored-XSS vector not blocked")
	}
	// HTML masquerading as an image must be rejected.
	html := []byte(`<!DOCTYPE html><html><script>steal()</script></html>`)
	if _, ok := detectImageExt(html); ok {
		t.Fatal("HTML accepted as image")
	}
}

func TestParseLimitOffsetClamps(t *testing.T) {
	cases := []struct {
		limStr, offStr  string
		def, max        int
		wantLim, wantOff int
	}{
		{"", "", 1000, 1000, 1000, 0},
		{"50", "10", 1000, 1000, 50, 10},
		{"99999", "0", 1000, 1000, 1000, 0},   // over max -> clamped
		{"-5", "-5", 1000, 1000, 1000, 0},     // negatives -> defaults
		{"abc", "xyz", 200, 500, 200, 0},      // garbage -> defaults
	}
	for _, c := range cases {
		gotLim, gotOff := parseLimitOffset(c.limStr, c.offStr, c.def, c.max)
		if gotLim != c.wantLim || gotOff != c.wantOff {
			t.Fatalf("parseLimitOffset(%q,%q)=%d,%d want %d,%d", c.limStr, c.offStr, gotLim, gotOff, c.wantLim, c.wantOff)
		}
	}
}

func TestRound2(t *testing.T) {
	cases := map[float64]float64{
		0.1 * 3:      0.3,
		12.345:       12.35,
		12.344:       12.34,
		100:          100,
		2.675:        2.68, // 2.675*100 rounds up to 268
	}
	for in, want := range cases {
		if got := round2(in); got != want {
			t.Fatalf("round2(%v)=%v, want %v", in, got, want)
		}
	}
}

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Rice & Grains":   "rice-grains",
		"  Hello World  ": "hello-world",
		"A/B\\C":          "a-b-c",
		"!!!":             "",
	}
	for in, want := range cases {
		if got := slugify(in); got != want {
			t.Fatalf("slugify(%q)=%q, want %q", in, got, want)
		}
	}
}
