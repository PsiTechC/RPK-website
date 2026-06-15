package db

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return strings.Trim(slugRe.ReplaceAllString(s, "-"), "-")
}

// placehold.co tiles are on-brand and always load; the admin can replace each
// image_url with a real photo later.
func img(label string) string {
	enc := strings.ReplaceAll(label, " ", "+")
	return "https://placehold.co/600x450/E2231A/FFFFFF/png?text=" + enc
}

// Verified real food photos (Unsplash CDN) per category name. Used for product
// images so the storefront shows real groceries. Salt is intentionally blank so
// those cards fall back to the on-brand 🧂 emoji tile.
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

type seedProd struct {
	name string
	cat  string
	unit string
	price float64
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

var seedProducts = []seedProd{
	// Rice & Grains
	{"Basmati Rice Gautam 39KG", "Rice & Grains", "BAG", 165},
	{"Matta Rice Mahila 20KG", "Rice & Grains", "BAG", 60},
	{"Jeerakasala Nelvayal 18KG", "Rice & Grains", "BAG", 110},
	{"Armana Basmati Rice 10KG", "Rice & Grains", "BAG", 55},
	{"Nellara Rice Powder 1KG x 12PC", "Rice & Grains", "PC", 6},
	{"Nellara White Puttu Podi 15KG", "Rice & Grains", "BAG", 48},

	// Flour & Atta
	{"Flour No.1 Grand Mill Paratha 50KG", "Flour & Atta", "BAG", 95},
	{"Watta Flour No.2 Grand Mill 50KG", "Flour & Atta", "BAG", 85},
	{"Gram Flour (Besan) Loose", "Flour & Atta", "KG", 5},
	{"Semolina (Rava) Loose", "Flour & Atta", "KG", 4},

	// Spices & Masala
	{"Coriander Powder Loose", "Spices & Masala", "KG", 9},
	{"Ajinomoto No.1 40PKT x 454GM", "Spices & Masala", "PKT", 9},
	{"Nellara Mutton Masala", "Spices & Masala", "PKT", 5},
	{"Eastern Meat Masala 1KG", "Spices & Masala", "PKT", 22},
	{"Eastern Fish Masala 1KG", "Spices & Masala", "PKT", 22},
	{"Eastern Sambar Powder 1KG", "Spices & Masala", "PKT", 20},
	{"Eastern Chicken Masala 1KG", "Spices & Masala", "PKT", 22},
	{"Kitchen King Masala 4 x 500GM", "Spices & Masala", "PKT", 18},
	{"Turmeric Powder Loose", "Spices & Masala", "KG", 8},
	{"Long Chilly Whole 10KG", "Spices & Masala", "BAG", 70},
	{"Kashmiri Chilly Powder 15KG SMT", "Spices & Masala", "KG", 16},
	{"Red Chilly Powder Ameera Loose", "Spices & Masala", "KG", 14},
	{"Black Pepper Whole Loose", "Spices & Masala", "KG", 30},
	{"Cardamom Ahmad Gold 6MM 10 x 1KG", "Spices & Masala", "PKT", 90},
	{"Cinnamon / Cassia Stick Loose", "Spices & Masala", "KG", 14},
	{"Mustard Seeds Loose", "Spices & Masala", "KG", 6},
	{"Star Anise Loose", "Spices & Masala", "KG", 28},
	{"Fennel Seeds Loose", "Spices & Masala", "KG", 12},
	{"L.G. Asafoetida Powder 100GM", "Spices & Masala", "PC", 8},
	{"L.G. Asafoetida Block 100GM", "Spices & Masala", "PC", 8},

	// Pulses & Lentils
	{"Moong Dal Loose", "Pulses & Lentils", "KG", 7},
	{"Roasted Gram Split Loose", "Pulses & Lentils", "KG", 6},
	{"Toor Dal Mellow 15KG", "Pulses & Lentils", "KG", 6},
	{"Masoor Dal Mellow 15KG", "Pulses & Lentils", "BAG", 80},
	{"Black Channa Loose", "Pulses & Lentils", "KG", 5},
	{"Chana Dal Loose", "Pulses & Lentils", "KG", 5},
	{"Black Chana Loose", "Pulses & Lentils", "KG", 5},
	{"Red Chowli Large Loose", "Pulses & Lentils", "KG", 6},

	// Dry Fruits & Nuts
	{"Golden Raisins 10KG", "Dry Fruits & Nuts", "KG", 16},
	{"Cashewnut LP 10KG", "Dry Fruits & Nuts", "BAG", 320},
	{"Charmagaz Melon Seed Loose", "Dry Fruits & Nuts", "KG", 22},
	{"Peanuts Loose", "Dry Fruits & Nuts", "KG", 7},

	// Sweeteners & Honey
	{"Sugar Khaleej 50KG", "Sweeteners & Honey", "BAG", 110},
	{"Jaggery 10 x 1KG", "Sweeteners & Honey", "CAT", 30},
	{"Pure Honey 3KG x 4", "Sweeteners & Honey", "PC", 45},
	{"Tamarind 20 x 1KG", "Sweeteners & Honey", "PKT", 35},

	// Cooking Oils & Ghee
	{"R.K.G Ghee 12 x 900ML", "Cooking Oils & Ghee", "PC", 22},
	{"Cooking Oil Tin 17 LTR", "Cooking Oils & Ghee", "TIN", 95},
	{"Double Spoon Shortening Pure 11 LTR", "Cooking Oils & Ghee", "CAT", 60},
	{"Dalda Vegetable Ghee 1KG x 16PC", "Cooking Oils & Ghee", "PC", 9},
	{"Eastern Coconut Oil 6 x 2LTR", "Cooking Oils & Ghee", "PC", 28},
	{"ATD Coconut Oil 6 x 2LTR", "Cooking Oils & Ghee", "PC", 26},
	{"Al Tahi Olive Oil 12 x 1LTR", "Cooking Oils & Ghee", "PC", 30},
	{"Shurooq Sunflower Oil 4 x 5LTR", "Cooking Oils & Ghee", "PC", 38},
	{"Mustard Oil Pran-Mughal 6 x 1LTR", "Cooking Oils & Ghee", "PC", 12},

	// Sauces & Condiments
	{"Mayonnaise Hayat 4 x 3.78L", "Sauces & Condiments", "PC", 25},
	{"Ketchup Hayat 4 x 5LTR", "Sauces & Condiments", "CAT", 55},
	{"White Vinegar Amal 4 x 1 Gallon", "Sauces & Condiments", "CAT", 40},
	{"Kimball Chilly Sauce 24 x 340GM", "Sauces & Condiments", "PC", 4},
	{"Green Chilly Sauce Chings 24 x 680GM", "Sauces & Condiments", "PC", 5},
	{"Rose Water Kitchen Crow 12 x 450ML", "Sauces & Condiments", "PC", 3},

	// Salt
	{"Nezo Salt Blue Packet 12 x 1KG", "Salt", "CAT", 8},
	{"Black Salt Loose", "Salt", "KG", 4},
	{"Salt Bag No.1 25KG", "Salt", "BAG", 18},

	// Beverages
	{"Horlicks 500GM", "Beverages", "PC", 12},
	{"Boost 500GM", "Beverages", "PC", 12},
	{"Nescafe Tradicad 200GM", "Beverages", "PC", 14},
	{"7UP Soft Drink", "Beverages", "CAT", 18},
	{"Pepsi Soft Drink", "Beverages", "CAT", 18},
	{"Mirinda Soft Drink", "Beverages", "CAT", 18},

	// Pantry & Others
	{"Mushroom Whole Ameri 24 x 400GM", "Pantry & Others", "PC", 28},
	{"Spaghetti 20 x 400GM", "Pantry & Others", "CAT", 20},
	{"Maggi Coconut Milk Powder 1KG x 12", "Pantry & Others", "PKT", 14},
	{"Palada Nellara 50 x 200GM", "Pantry & Others", "PKT", 4},
	{"Curd Chilly 50 x 100GM", "Pantry & Others", "PKT", 9},
	{"Coconut Powder Indonesia 7KG", "Pantry & Others", "BAG", 40},

	// --- From "List of Products" document ---
	{"Turmeric Whole", "Spices & Masala", "KG", 8},
	{"Turmeric", "Spices & Masala", "KG", 8},
	{"Turmeric Powder", "Spices & Masala", "KG", 9},
	{"Coriander Seeds", "Spices & Masala", "KG", 7},
	{"Coriander Powder", "Spices & Masala", "KG", 9},
	{"Cumin Seeds", "Spices & Masala", "KG", 12},
	{"Clove", "Spices & Masala", "KG", 40},
	{"Fennel", "Spices & Masala", "KG", 12},
	{"Sesame Seeds", "Spices & Masala", "KG", 14},
	{"Green Cardamom", "Spices & Masala", "KG", 90},
	{"All Purpose Flour", "Flour & Atta", "KG", 5},
	{"Sugar", "Sweeteners & Honey", "KG", 4},
	{"Chick Peas", "Pulses & Lentils", "KG", 6},
	{"Basmati Rice 1121 Sella", "Rice & Grains", "BAG", 120},
	{"Basmati Rice 1121 Steam", "Rice & Grains", "BAG", 125},
	{"Basmati Rice 1509 Sella", "Rice & Grains", "BAG", 110},
	{"Basmati Rice 1509 Steam", "Rice & Grains", "BAG", 115},
	{"Sona Masuri Rice", "Rice & Grains", "BAG", 70},
	{"Jeerakasala Rice", "Rice & Grains", "BAG", 110},
}

// Seed inserts the admin user, categories and products. Idempotent: existing
// rows (matched by email/slug) are left untouched, so admin edits survive restarts.
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

	// Products — assign the real category photo. On re-seed, refresh only rows
	// whose image is still a placeholder, so admin-set images are preserved.
	for _, p := range seedProducts {
		cid := catID[p.cat]
		photo := categoryPhoto[p.cat] // "" for Salt -> emoji tile on the frontend
		desc := fmt.Sprintf("%s — sold per %s. Wholesale & retail available from RPK Food Trading, Dubai.", p.name, p.unit)
		if _, err := pool.Exec(ctx,
			`INSERT INTO products (name, slug, category_id, unit, price, currency, image_url, description, stock, is_active)
			 VALUES ($1,$2,$3,$4,$5,'AED',$6,$7,100,TRUE)
			 ON CONFLICT (slug) DO UPDATE SET
			    image_url = CASE WHEN products.image_url LIKE '%placehold%'
			                     THEN EXCLUDED.image_url ELSE products.image_url END`,
			p.name, slug(p.name), cid, p.unit, p.price, photo, desc,
		); err != nil {
			return fmt.Errorf("seed product %s: %w", p.name, err)
		}
	}
	return nil
}
