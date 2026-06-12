package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/rpkfood/backend/internal/auth"
	"github.com/rpkfood/backend/internal/models"
)

type orderItemReq struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type createOrderReq struct {
	CustomerName    string         `json:"customer_name"`
	CustomerEmail   string         `json:"customer_email"`
	CustomerPhone   string         `json:"customer_phone"`
	ShippingAddress string         `json:"shipping_address"`
	Items           []orderItemReq `json:"items"`
	// "pay" simulates a successful mock payment immediately.
	Pay bool `json:"pay"`
}

// handleCreateOrder accepts guest or authenticated checkout. Prices are looked
// up server-side from the DB (never trusted from the client). Payment is mocked.
func (s *Server) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	var req createOrderReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if req.CustomerName == "" || req.CustomerEmail == "" || len(req.Items) == 0 {
		writeErr(w, 400, "customer_name, customer_email and at least one item are required")
		return
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeErr(w, 500, "could not start transaction")
		return
	}
	defer tx.Rollback(ctx)

	// Optional logged-in user.
	var userID *int64
	if uid := auth.UserIDFrom(ctx); uid != 0 {
		userID = &uid
	}

	currency := "AED"
	var subtotal float64
	type resolved struct {
		id    int64
		name  string
		unit  string
		price float64
		qty   int
		total float64
	}
	lines := make([]resolved, 0, len(req.Items))

	for _, it := range req.Items {
		if it.Quantity <= 0 {
			continue
		}
		var name, unit, cur string
		var price float64
		err := tx.QueryRow(ctx,
			`SELECT name, unit, price, currency FROM products WHERE id=$1 AND is_active=TRUE`, it.ProductID,
		).Scan(&name, &unit, &price, &cur)
		if err != nil {
			writeErr(w, 400, fmt.Sprintf("product %d not available", it.ProductID))
			return
		}
		currency = cur
		lt := price * float64(it.Quantity)
		subtotal += lt
		lines = append(lines, resolved{it.ProductID, name, unit, price, it.Quantity, lt})
	}
	if len(lines) == 0 {
		writeErr(w, 400, "no valid items")
		return
	}

	paymentStatus := "unpaid"
	paymentRef := ""
	orderStatus := "pending"
	if req.Pay {
		// MOCK PAYMENT — replace with Stripe/PayTabs later.
		paymentStatus = "paid"
		paymentRef = fmt.Sprintf("MOCK-%d", subtotalCents(subtotal))
		orderStatus = "confirmed"
	}

	var orderID int64
	err = tx.QueryRow(ctx,
		`INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, shipping_address,
		                     status, subtotal, currency, payment_status, payment_ref)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		userID, req.CustomerName, req.CustomerEmail, req.CustomerPhone, req.ShippingAddress,
		orderStatus, subtotal, currency, paymentStatus, paymentRef,
	).Scan(&orderID)
	if err != nil {
		writeErr(w, 500, "could not create order")
		return
	}

	for _, l := range lines {
		if _, err := tx.Exec(ctx,
			`INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity, line_total)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			orderID, l.id, l.name, l.unit, l.price, l.qty, l.total); err != nil {
			writeErr(w, 500, "could not add order items")
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		writeErr(w, 500, "could not commit order")
		return
	}

	writeJSON(w, 201, map[string]interface{}{
		"order_id":       orderID,
		"subtotal":       subtotal,
		"currency":       currency,
		"payment_status": paymentStatus,
		"payment_ref":    paymentRef,
		"status":         orderStatus,
	})
}

func subtotalCents(v float64) int64 { return int64(v * 100) }

func (s *Server) handleMyOrders(w http.ResponseWriter, r *http.Request) {
	uid := auth.UserIDFrom(r.Context())
	orders, err := s.queryOrders(r, `WHERE o.user_id=$1`, uid)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, orders)
}

func (s *Server) handleAdminListOrders(w http.ResponseWriter, r *http.Request) {
	where := ""
	args := []interface{}{}
	if st := r.URL.Query().Get("status"); st != "" {
		args = append(args, st)
		where = "WHERE o.status=$1"
	}
	orders, err := s.queryOrders(r, where, args...)
	if err != nil {
		writeErr(w, 500, "query failed")
		return
	}
	writeJSON(w, 200, orders)
}

func (s *Server) queryOrders(r *http.Request, where string, args ...interface{}) ([]models.Order, error) {
	rows, err := s.pool.Query(r.Context(),
		`SELECT o.id, o.user_id, o.customer_name, o.customer_email, o.customer_phone, o.shipping_address,
		        o.status, o.subtotal, o.currency, o.payment_status, o.payment_ref, o.created_at, o.updated_at
		 FROM orders o `+where+` ORDER BY o.created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Order{}
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
			&o.ShippingAddress, &o.Status, &o.Subtotal, &o.Currency, &o.PaymentStatus, &o.PaymentRef,
			&o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, nil
}

func (s *Server) handleAdminGetOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var o models.Order
	err := s.pool.QueryRow(r.Context(),
		`SELECT id, user_id, customer_name, customer_email, customer_phone, shipping_address,
		        status, subtotal, currency, payment_status, payment_ref, created_at, updated_at
		 FROM orders WHERE id=$1`, id,
	).Scan(&o.ID, &o.UserID, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone, &o.ShippingAddress,
		&o.Status, &o.Subtotal, &o.Currency, &o.PaymentStatus, &o.PaymentRef, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		writeErr(w, 404, "order not found")
		return
	}

	rows, err := s.pool.Query(r.Context(),
		`SELECT id, order_id, product_id, product_name, unit, unit_price, quantity, line_total
		 FROM order_items WHERE order_id=$1`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it models.OrderItem
			if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.ProductName, &it.Unit,
				&it.UnitPrice, &it.Quantity, &it.LineTotal); err == nil {
				o.Items = append(o.Items, it)
			}
		}
	}
	writeJSON(w, 200, o)
}

func (s *Server) handleAdminUpdateOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req struct {
		Status        string `json:"status"`
		PaymentStatus string `json:"payment_status"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	ct, err := s.pool.Exec(r.Context(),
		`UPDATE orders SET
		    status         = COALESCE(NULLIF($1,''), status),
		    payment_status = COALESCE(NULLIF($2,''), payment_status),
		    updated_at     = now()
		 WHERE id=$3`, req.Status, req.PaymentStatus, id)
	if err != nil {
		writeErr(w, 500, "update failed")
		return
	}
	if ct.RowsAffected() == 0 {
		writeErr(w, 404, "order not found")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}
