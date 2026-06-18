package api

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// Allowed image content types -> canonical file extension. Only raster formats
// that http.DetectContentType verifies from magic bytes. SVG is deliberately
// excluded: it can carry <script> and would be stored-XSS when served same-origin.
var imageExt = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
	"image/bmp":  ".bmp",
}

const maxUploadBytes = 8 << 20 // 8 MiB

// handleUploadImage accepts a multipart "file" field, stores it under the
// uploads dir and returns a relative URL ("/uploads/<name>") the admin can save
// as the product image. Admin-only (mounted under /api/admin).
func (s *Server) handleUploadImage(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+1024)
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeErr(w, 400, "file too large or invalid form (max 8MB)")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, 400, "no file provided")
		return
	}
	defer file.Close()

	// Read the whole (capped) file, then determine the type from its ACTUAL
	// bytes — never from the client-declared Content-Type or filename, which can
	// lie (e.g. an HTML/SVG payload labelled image/png).
	buf, err := io.ReadAll(file)
	if err != nil {
		writeErr(w, 400, "could not read file")
		return
	}
	detected := http.DetectContentType(buf)
	ext, ok := imageExt[detected]
	if !ok {
		writeErr(w, 400, "unsupported file type — please upload a real JPEG, PNG, GIF, WEBP or BMP image")
		return
	}

	if err := os.MkdirAll(s.cfg.UploadsDir, 0o755); err != nil {
		writeErr(w, 500, "could not prepare uploads dir")
		return
	}

	name := randomHex(16) + ext
	if err := os.WriteFile(filepath.Join(s.cfg.UploadsDir, name), buf, 0o644); err != nil {
		writeErr(w, 500, "could not save file")
		return
	}

	writeJSON(w, 201, map[string]string{"url": "/uploads/" + name})
}

// detectImageExt verifies raw bytes are an allowed raster image and returns the
// canonical extension (extracted for unit testing).
func detectImageExt(buf []byte) (string, bool) {
	ext, ok := imageExt[http.DetectContentType(buf)]
	return ext, ok
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
