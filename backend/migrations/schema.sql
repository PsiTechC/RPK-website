-- RPK Food Trading — schema (idempotent, applied on server startup)

CREATE TABLE IF NOT EXISTS categories (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    sort_order  INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    unit        TEXT NOT NULL DEFAULT 'PC',          -- KG / BAG / PKT / CAT / PC / TIN
    price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'AED',
    image_url   TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    stock       INT  NOT NULL DEFAULT 100,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Soft-delete: archived products are hidden from the store & admin list but can
-- be restored. NULL = live, a timestamp = archived (deleted) at that moment.
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- Admin-curated "Featured on home page" flag.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_archived ON products(archived_at);

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'customer',  -- customer / business / admin
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_export_registrations (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    company_name     TEXT NOT NULL,
    business_type    TEXT NOT NULL DEFAULT 'import',  -- import / export / both
    country          TEXT NOT NULL DEFAULT '',
    contact_person   TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    product_interest TEXT NOT NULL DEFAULT '',
    message          TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'pending', -- pending / approved / rejected
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    customer_name    TEXT NOT NULL,
    customer_email   TEXT NOT NULL,
    customer_phone   TEXT NOT NULL DEFAULT '',
    shipping_address TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'pending', -- pending/confirmed/processing/shipped/delivered/cancelled
    subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency         TEXT NOT NULL DEFAULT 'AED',
    payment_status   TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid / paid / refunded
    payment_ref      TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
    id           BIGSERIAL PRIMARY KEY,
    order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit         TEXT NOT NULL DEFAULT 'PC',
    unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity     INT NOT NULL DEFAULT 1,
    line_total   NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS inquiries (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    product    TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'new', -- new / contacted / closed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT '',
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- Website feedback (star rating + comment) submitted from the Contact page.
CREATE TABLE IF NOT EXISTS feedback (
    id         BIGSERIAL PRIMARY KEY,
    rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

-- Admin-managed news / updates shown on the public News page.
CREATE TABLE IF NOT EXISTS news (
    id           BIGSERIAL PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT '',
    tag          TEXT NOT NULL DEFAULT '',
    body         TEXT NOT NULL DEFAULT '',
    image_url    TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at DESC);

-- Rich product detail fields (added later; idempotent)
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition  TEXT  NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller     TEXT  NOT NULL DEFAULT '';

-- Inquiry requirement items (product + qty list)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';

-- Import/export registration requirement items
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';

-- B2B partner application fields (extends the import/export registration into a
-- full partner application: contact, capacity and uploaded trade documents).
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS whatsapp            TEXT NOT NULL DEFAULT '';
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS monthly_capacity    TEXT NOT NULL DEFAULT '';
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS target_countries    TEXT NOT NULL DEFAULT '';
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS trade_license_url   TEXT NOT NULL DEFAULT '';
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS vat_certificate_url TEXT NOT NULL DEFAULT '';
ALTER TABLE import_export_registrations ADD COLUMN IF NOT EXISTS company_profile_url TEXT NOT NULL DEFAULT '';

-- Admin-controlled display order for products (categories already have sort_order)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- B2B Phase 5 — Request-for-Quotation (RFQ) and the admin's quotations against
-- them. A partner raises an RFQ (a product requirement); admin replies with one
-- or more quotations (price + validity + optional PDF); the partner approves.
CREATE TABLE IF NOT EXISTS rfqs (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    items               JSONB NOT NULL DEFAULT '[]', -- [{product_id,name,unit,qty}]
    destination_country TEXT NOT NULL DEFAULT '',
    message             TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'open', -- open / quoted / approved / rejected / closed
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rfqs_user ON rfqs(user_id);

CREATE TABLE IF NOT EXISTS quotations (
    id         BIGSERIAL PRIMARY KEY,
    rfq_id     BIGINT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency   TEXT NOT NULL DEFAULT 'AED',
    validity   TEXT NOT NULL DEFAULT '', -- e.g. "Valid 30 days"
    notes      TEXT NOT NULL DEFAULT '',
    file_url   TEXT NOT NULL DEFAULT '', -- optional uploaded quotation PDF
    status     TEXT NOT NULL DEFAULT 'sent', -- sent / approved / rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotations_rfq ON quotations(rfq_id);

-- B2B Phase 6 — Partner orders. Created automatically when a partner approves a
-- quotation; tracked by admin through fulfilment. Kept separate from storefront
-- `orders` (which are retail checkouts with shipping addresses & payment refs).
CREATE TABLE IF NOT EXISTS partner_orders (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rfq_id         BIGINT REFERENCES rfqs(id) ON DELETE SET NULL,
    quotation_id   BIGINT UNIQUE REFERENCES quotations(id) ON DELETE SET NULL, -- one order per approved quotation
    items          JSONB NOT NULL DEFAULT '[]', -- snapshot of the RFQ requirement
    amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency       TEXT NOT NULL DEFAULT 'AED',
    status         TEXT NOT NULL DEFAULT 'confirmed', -- confirmed/processing/shipped/delivered/cancelled
    payment_status TEXT NOT NULL DEFAULT 'unpaid',     -- unpaid/paid
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_orders_user ON partner_orders(user_id);

-- B2B Phase 7 — Shipment tracking for a partner order (one shipment per order).
CREATE TABLE IF NOT EXISTS shipments (
    id               BIGSERIAL PRIMARY KEY,
    partner_order_id BIGINT UNIQUE REFERENCES partner_orders(id) ON DELETE CASCADE,
    container_no     TEXT NOT NULL DEFAULT '',
    shipping_line    TEXT NOT NULL DEFAULT '',
    etd              TEXT NOT NULL DEFAULT '', -- estimated departure (date string)
    eta              TEXT NOT NULL DEFAULT '', -- estimated arrival (date string)
    status           TEXT NOT NULL DEFAULT 'preparing', -- preparing/in_transit/arrived/delivered
    notes            TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B2B Phase 8 — Documents attached to a partner order (invoice, packing list,
-- bill of lading, etc.). Uploaded by admin, downloaded by the partner.
CREATE TABLE IF NOT EXISTS partner_documents (
    id               BIGSERIAL PRIMARY KEY,
    partner_order_id BIGINT NOT NULL REFERENCES partner_orders(id) ON DELETE CASCADE,
    label            TEXT NOT NULL DEFAULT '',
    file_url         TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_documents_order ON partner_documents(partner_order_id);

-- Password reset tokens (forgot-password flow)
CREATE TABLE IF NOT EXISTS password_resets (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
