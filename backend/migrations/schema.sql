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
