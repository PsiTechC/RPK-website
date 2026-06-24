// Exports the full live catalogue + reviews into JSON files the Go seed embeds,
// so a fresh local DB reproduces production (products, images, descriptions,
// nutrition, featured flags and reviews). Re-run when the live data changes.
const fs = require("fs");
const path = require("path");
const T = process.env.TEMP;
const LIVE = "http://72.60.203.40:8100";

const prods = JSON.parse(fs.readFileSync(path.join(T, "live_products.json"), "utf8"));

// Product rows (rich). category = live category_name.
const catalogue = prods
  .slice()
  .sort((a, b) => a.id - b.id)
  .map((p) => ({
    name: p.name,
    category: p.category_name,
    unit: p.unit,
    price: p.price,
    image_url: p.image_url || "",
    description: (p.description || "").trim(),
    nutrition: p.nutrition || "",
    featured: !!p.is_featured,
  }));

fs.writeFileSync(path.join(__dirname, "internal", "db", "catalogue.json"), JSON.stringify(catalogue, null, 1));
console.log("catalogue.json:", catalogue.length, "products");

// Fetch reviews for every product that has any, keyed by product name (slugs
// are stable across DBs; ids are not).
async function run() {
  const withReviews = prods.filter((p) => p.review_count > 0);
  const reviews = [];
  const CONC = 8;
  let i = 0;
  async function worker() {
    while (i < withReviews.length) {
      const p = withReviews[i++];
      try {
        const res = await fetch(`${LIVE}/api/products/${p.id}/reviews`);
        const list = await res.json();
        for (const r of list) {
          reviews.push({
            product: p.name,
            author_name: r.author_name || "",
            rating: r.rating,
            comment: r.comment || "",
          });
        }
      } catch (e) {
        console.error("reviews failed for", p.name, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(path.join(__dirname, "internal", "db", "reviews.json"), JSON.stringify(reviews, null, 1));
  console.log("reviews.json:", reviews.length, "reviews across", withReviews.length, "products");
}
run();
