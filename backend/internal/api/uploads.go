package api

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// Allowed image content types -> canonical file extension.
var imageExt = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/gif":     ".gif",
	"image/webp":    ".webp",
	"image/svg+xml": ".svg",
	"image/avif":    ".avif",
	"image/bmp":     ".bmp",
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
	file, hdr, err := r.FormFile("file")
	if err != nil {
		writeErr(w, 400, "no file provided")
		return
	}
	defer file.Close()

	// Trust the declared content type, falling back to the file extension.
	ct := hdr.Header.Get("Content-Type")
	ext, ok := imageExt[ct]
	if !ok {
		ext = strings.ToLower(filepath.Ext(hdr.Filename))
		valid := false
		for _, e := range imageExt {
			if e == ext {
				valid = true
				break
			}
		}
		if !valid {
			writeErr(w, 400, "unsupported file type — please choose an image")
			return
		}
	}

	if err := os.MkdirAll(s.cfg.UploadsDir, 0o755); err != nil {
		writeErr(w, 500, "could not prepare uploads dir")
		return
	}

	name := randomHex(16) + ext
	dst, err := os.Create(filepath.Join(s.cfg.UploadsDir, name))
	if err != nil {
		writeErr(w, 500, "could not save file")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		writeErr(w, 500, "could not write file")
		return
	}

	writeJSON(w, 201, map[string]string{"url": "/uploads/" + name})
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
