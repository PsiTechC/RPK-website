package models

import (
	"encoding/json"
	"time"
)

type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	ImageURL    string    `json:"image_url"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

type Product struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Slug         string          `json:"slug"`
	CategoryID   *int64          `json:"category_id"`
	CategoryName string          `json:"category_name,omitempty"`
	Unit         string          `json:"unit"`
	Price        float64         `json:"price"`
	Currency     string          `json:"currency"`
	ImageURL     string          `json:"image_url"`
	Description  string          `json:"description"`
	Stock        int             `json:"stock"`
	IsActive     bool            `json:"is_active"`
	IsFeatured   bool            `json:"is_featured"`
	Rating       float64         `json:"rating"`
	ReviewCount  int             `json:"review_count"`
	Highlights   json.RawMessage `json:"highlights"`
	Nutrition    string          `json:"nutrition"`
	Seller       string          `json:"seller"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Registration struct {
	ID                int64           `json:"id"`
	UserID            *int64          `json:"user_id"`
	CompanyName       string          `json:"company_name"`
	BusinessType      string          `json:"business_type"`
	Country           string          `json:"country"`
	ContactPerson     string          `json:"contact_person"`
	Phone             string          `json:"phone"`
	Email             string          `json:"email"`
	ProductInterest   string          `json:"product_interest"`
	Message           string          `json:"message"`
	Items             json.RawMessage `json:"items"`
	WhatsApp          string          `json:"whatsapp"`
	MonthlyCapacity   string          `json:"monthly_capacity"`
	TargetCountries   string          `json:"target_countries"`
	TradeLicenseURL   string          `json:"trade_license_url"`
	VATCertificateURL string          `json:"vat_certificate_url"`
	CompanyProfileURL string          `json:"company_profile_url"`
	Status            string          `json:"status"`
	CreatedAt         time.Time       `json:"created_at"`
}

type OrderItem struct {
	ID          int64   `json:"id"`
	OrderID     int64   `json:"order_id"`
	ProductID   *int64  `json:"product_id"`
	ProductName string  `json:"product_name"`
	Unit        string  `json:"unit"`
	UnitPrice   float64 `json:"unit_price"`
	Quantity    int     `json:"quantity"`
	LineTotal   float64 `json:"line_total"`
}

type Order struct {
	ID              int64       `json:"id"`
	UserID          *int64      `json:"user_id"`
	CustomerName    string      `json:"customer_name"`
	CustomerEmail   string      `json:"customer_email"`
	CustomerPhone   string      `json:"customer_phone"`
	ShippingAddress string      `json:"shipping_address"`
	Status          string      `json:"status"`
	Subtotal        float64     `json:"subtotal"`
	Currency        string      `json:"currency"`
	PaymentStatus   string      `json:"payment_status"`
	PaymentRef      string      `json:"payment_ref"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

// Quotation is the admin's priced reply to an RFQ.
type Quotation struct {
	ID        int64     `json:"id"`
	RFQID     int64     `json:"rfq_id"`
	Price     float64   `json:"price"`
	Currency  string    `json:"currency"`
	Validity  string    `json:"validity"`
	Notes     string    `json:"notes"`
	FileURL   string    `json:"file_url"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Shipment tracks the logistics of a partner order.
type Shipment struct {
	ID           int64     `json:"id"`
	ContainerNo  string    `json:"container_no"`
	ShippingLine string    `json:"shipping_line"`
	ETD          string    `json:"etd"`
	ETA          string    `json:"eta"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// PartnerDocument is a file attached to a partner order.
type PartnerDocument struct {
	ID        int64     `json:"id"`
	Label     string    `json:"label"`
	FileURL   string    `json:"file_url"`
	CreatedAt time.Time `json:"created_at"`
}

// PartnerOrder is created when a partner approves a quotation.
type PartnerOrder struct {
	ID            int64             `json:"id"`
	UserID        *int64            `json:"user_id"`
	RFQID         *int64            `json:"rfq_id"`
	QuotationID   *int64            `json:"quotation_id"`
	PartnerName   string            `json:"partner_name,omitempty"`
	PartnerEmail  string            `json:"partner_email,omitempty"`
	Items         json.RawMessage   `json:"items"`
	Amount        float64           `json:"amount"`
	Currency      string            `json:"currency"`
	Status        string            `json:"status"`
	PaymentStatus string            `json:"payment_status"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
	Shipment      *Shipment         `json:"shipment"`
	Documents     []PartnerDocument `json:"documents"`
}

// RFQ is a partner's request for a quotation, with the admin's quotations nested.
type RFQ struct {
	ID                 int64           `json:"id"`
	UserID             *int64          `json:"user_id"`
	PartnerName        string          `json:"partner_name,omitempty"`
	PartnerEmail       string          `json:"partner_email,omitempty"`
	Items              json.RawMessage `json:"items"`
	DestinationCountry string          `json:"destination_country"`
	Message            string          `json:"message"`
	Status             string          `json:"status"`
	CreatedAt          time.Time       `json:"created_at"`
	Quotations         []Quotation     `json:"quotations"`
}
