package db

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Full live catalogue + reviews, exported from production with
// backend/gen_catalogue.js. Embedded so a fresh database reproduces the live
// site exactly — same products, images, descriptions, nutrition, featured
// flags and reviews. Regenerate these files when the live data changes.
//
//go:embed catalogue.json
var catalogueJSON []byte

//go:embed reviews.json
var reviewsJSON []byte

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return strings.Trim(slugRe.ReplaceAllString(s, "-"), "-")
}

// placehold.co tiles are on-brand and always load; used only as a fallback when
// a product has no image in the catalogue.
func img(label string) string {
	enc := strings.ReplaceAll(label, " ", "+")
	return "https://placehold.co/600x450/E2231A/FFFFFF/png?text=" + enc
}

// Verified real food photos (Unsplash CDN) per category name. Used for category
// tiles and as the image fallback for products with no own image.
func unsplash(id string) string {
	return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=700&q=70"
}

var categoryPhoto = map[string]string{
	"Rice & Grains":       unsplash("1586201375761-83865001e31c"),
	"Flour & Atta":        unsplash("1509440159596-0249088772ff"),
	"Spices & Masala":     unsplash("1596040033229-a9821ebd058d"),
	"Pulses & Lentils":    unsplash("1610725664285-7c57e6eeac3f"),
	"Dry Fruits & Nuts":   unsplash("1508061253366-f7da158b6d46"),
	"Sweeteners & Honey":  unsplash("1558642452-9d2a7deb7f62"),
	"Cooking Oils & Ghee": unsplash("1474979266404-7eaacbcd87c5"),
	"Sauces & Condiments": unsplash("1472476443507-c7a5948772fc"),
	"Salt":                "",
	"Beverages":           unsplash("1544145945-f90425340c7e"),
	"Pantry & Others":     unsplash("1551462147-37885acc36f1"),
}

type seedCat struct {
	name string
	desc string
}

// seedProd mirrors a row in catalogue.json (the live export).
type seedProd struct {
	Name        string  `json:"name"`
	Cat         string  `json:"category"`
	Unit        string  `json:"unit"`
	Price       float64 `json:"price"`
	ImageURL    string  `json:"image_url"`
	Description string  `json:"description"`
	Nutrition   string  `json:"nutrition"`
	Featured    bool    `json:"featured"`
}

// seedReview mirrors a row in reviews.json. Linked to a product by name (slug),
// since live row ids don't carry across databases.
type seedReview struct {
	Product    string `json:"product"`
	AuthorName string `json:"author_name"`
	Rating     int    `json:"rating"`
	Comment    string `json:"comment"`
}

var seedCategories = []seedCat{
	{"Rice & Grains", "Premium basmati, matta and specialty rice in bulk bags."},
	{"Flour & Atta", "Mill-fresh wheat flour, besan and semolina."},
	{"Spices & Masala", "Whole spices and ready masala blends."},
	{"Pulses & Lentils", "Dals, gram and beans by the kilo."},
	{"Dry Fruits & Nuts", "Cashews, raisins and seeds."},
	{"Sweeteners & Honey", "Sugar, jaggery and pure honey."},
	{"Cooking Oils & Ghee", "Coconut, sunflower, olive oils and ghee."},
	{"Sauces & Condiments", "Mayonnaise, ketchup, vinegar and sauces."},
	{"Salt", "Table, black and bulk salt."},
	{"Beverages", "Health drinks, coffee and soft drinks."},
	{"Pantry & Others", "Pasta, mushrooms, coconut powder and more."},
}

// Seed inserts the admin user, categories, products and reviews. Idempotent:
// existing rows (matched by email/slug) are left untouched, so admin edits
// survive restarts.
func Seed(ctx context.Context, pool *pgxpool.Pool, adminHash string) error {
	// Admin user
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (name, email, password_hash, phone, role)
		 VALUES ('RPK Admin', 'admin@rpkfood.ae', $1, '+971583072132', 'admin')
		 ON CONFLICT (email) DO NOTHING`, adminHash); err != nil {
		return fmt.Errorf("seed admin: %w", err)
	}

	// Categories — refresh image to the real category photo (unless an admin
	// already set a custom one, i.e. not a placeholder).
	catID := map[string]int64{}
	for i, c := range seedCategories {
		photo := categoryPhoto[c.name]
		if photo == "" {
			photo = img(c.name)
		}
		var id int64
		err := pool.QueryRow(ctx,
			`INSERT INTO categories (name, slug, description, image_url, sort_order)
			 VALUES ($1,$2,$3,$4,$5)
			 ON CONFLICT (slug) DO UPDATE SET
			    name = EXCLUDED.name,
			    image_url = CASE WHEN categories.image_url LIKE '%placehold%' OR categories.image_url = ''
			                     THEN EXCLUDED.image_url ELSE categories.image_url END
			 RETURNING id`,
			c.name, slug(c.name), c.desc, photo, i,
		).Scan(&id)
		if err != nil {
			return fmt.Errorf("seed category %s: %w", c.name, err)
		}
		catID[c.name] = id
	}

	// Products + reviews are seeded ONLY on a fresh database. On an existing DB a
	// re-deploy must never touch them — otherwise any product an admin deleted
	// would be re-inserted (its slug no longer exists), resurrecting "duplicates"
	// on every deploy. After the first seed, the catalogue is managed solely via
	// the dashboard.
	var productCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM products`).Scan(&productCount); err != nil {
		return fmt.Errorf("count products: %w", err)
	}
	if productCount > 0 {
		return nil // already populated — leave admin's catalogue untouched
	}

	var products []seedProd
	if err := json.Unmarshal(catalogueJSON, &products); err != nil {
		return fmt.Errorf("parse catalogue.json: %w", err)
	}

	for _, p := range products {
		cid := catID[p.Cat]
		image := p.ImageURL
		if image == "" {
			image = categoryPhoto[p.Cat] // "" for Salt -> emoji tile on the frontend
		}
		desc := p.Description
		if desc == "" {
			desc = fmt.Sprintf("%s — sold per %s. Wholesale & retail available from RPK Food Trading, Dubai.", p.Name, p.Unit)
		}
		if _, err := pool.Exec(ctx,
			`INSERT INTO products (name, slug, category_id, unit, price, currency, image_url, description, nutrition, is_featured, stock, is_active)
			 VALUES ($1,$2,$3,$4,$5,'AED',$6,$7,$8,$9,100,TRUE)
			 ON CONFLICT (slug) DO NOTHING`,
			p.Name, slug(p.Name), cid, p.Unit, p.Price, image, desc, p.Nutrition, p.Featured,
		); err != nil {
			return fmt.Errorf("seed product %s: %w", p.Name, err)
		}
	}

	// Map product slug -> id so reviews can link by stable slug.
	prodID := map[string]int64{}
	rows, err := pool.Query(ctx, `SELECT id, slug FROM products`)
	if err != nil {
		return fmt.Errorf("load product ids: %w", err)
	}
	for rows.Next() {
		var id int64
		var sl string
		if err := rows.Scan(&id, &sl); err != nil {
			rows.Close()
			return fmt.Errorf("scan product id: %w", err)
		}
		prodID[sl] = id
	}
	rows.Close()

	var reviews []seedReview
	if err := json.Unmarshal(reviewsJSON, &reviews); err != nil {
		return fmt.Errorf("parse reviews.json: %w", err)
	}
	for _, rv := range reviews {
		pid, ok := prodID[slug(rv.Product)]
		if !ok || rv.Rating < 1 || rv.Rating > 5 {
			continue // product not in catalogue or invalid rating — skip
		}
		// user_id NULL: seeded reviews aren't tied to a local account. The
		// UNIQUE(product_id, user_id) constraint allows multiple NULL rows.
		if _, err := pool.Exec(ctx,
			`INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
			 VALUES ($1, NULL, $2, $3, $4)`,
			pid, rv.AuthorName, rv.Rating, rv.Comment,
		); err != nil {
			return fmt.Errorf("seed review for %s: %w", rv.Product, err)
		}
	}

	return nil
}
