package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type chatMessage struct {
	Role    string `json:"role"`    // "user" | "assistant"
	Content string `json:"content"`
}

type chatReq struct {
	Messages []chatMessage `json:"messages"`
}

const chatSystemPrompt = `You are "RPK Assistant", the friendly customer-support chatbot for
RPK FOR FOOD TRADING CO. L.L.C — a wholesale & retail food and grocery trading company based in
Al Mankhool, Dubai, UAE (phone +971 583072132, email dubai.trader12@gmail.com).

You help visitors with:
- Finding grocery & food products (rice, flour, spices & masala, pulses, oils & ghee, nuts,
  sauces, salt, beverages, and more).
- Explaining how to order on the website and how mock checkout / order tracking works.
- Guiding international buyers through IMPORT/EXPORT business registration on the site
  (they fill the Import/Export form; the RPK team reviews and approves it).
- General questions about the company, shipping and bulk/wholesale enquiries.

Style: warm, concise, professional. Keep answers short (2-4 sentences) unless asked for detail.
If asked for live stock or exact prices you don't know, tell them to check the product page or
contact RPK directly. Never invent order numbers or prices. Currency is AED unless stated.`

// handleChat proxies the conversation to the Claude API. If no API key is
// configured it returns a graceful fallback so the widget still works in dev.
func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	var req chatReq
	if err := readJSON(r, &req); err != nil || len(req.Messages) == 0 {
		writeErr(w, 400, "messages required")
		return
	}

	if s.cfg.AnthropicAPIKey == "" {
		writeJSON(w, 200, map[string]string{
			"reply": "Hi! I'm the RPK Assistant. The AI service isn't configured yet — please " +
				"set ANTHROPIC_API_KEY on the server. Meanwhile you can browse our products by " +
				"category, or contact us at +971 583072132 / dubai.trader12@gmail.com.",
		})
		return
	}

	reply, err := s.callClaude(r.Context(), req.Messages)
	if err != nil {
		writeJSON(w, 200, map[string]string{
			"reply": "Sorry, I'm having trouble reaching the assistant right now. Please try again, " +
				"or contact RPK at +971 583072132.",
		})
		return
	}
	writeJSON(w, 200, map[string]string{"reply": reply})
}

func (s *Server) callClaude(ctx context.Context, history []chatMessage) (string, error) {
	// Cap history to the last 20 turns to keep tokens bounded.
	if len(history) > 20 {
		history = history[len(history)-20:]
	}
	msgs := make([]map[string]string, 0, len(history))
	for _, m := range history {
		role := m.Role
		if role != "assistant" {
			role = "user"
		}
		if strings.TrimSpace(m.Content) == "" {
			continue
		}
		msgs = append(msgs, map[string]string{"role": role, "content": m.Content})
	}

	body, _ := json.Marshal(map[string]interface{}{
		"model":      s.cfg.AnthropicModel,
		"max_tokens": 512,
		"system":     chatSystemPrompt,
		"messages":   msgs,
	})

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("content-type", "application/json")
	httpReq.Header.Set("x-api-key", s.cfg.AnthropicAPIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if parsed.Error != nil {
		return "", &apiError{parsed.Error.Message}
	}

	var sb strings.Builder
	for _, c := range parsed.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	out := strings.TrimSpace(sb.String())
	if out == "" {
		return "I'm here to help with RPK products and import/export — could you rephrase that?", nil
	}
	return out, nil
}

type apiError struct{ msg string }

func (e *apiError) Error() string { return e.msg }
