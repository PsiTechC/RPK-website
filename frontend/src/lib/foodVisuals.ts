// Per-category visuals for the storefront. Each entry has a food emoji + a warm
// two-tone gradient (always renders) and a real Unsplash photo (progressive
// enhancement — if it fails to load the emoji/gradient still looks intentional).
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=70`;

export type Visual = { emoji: string; photo: string; from: string; to: string };

const DEFAULT: Visual = { emoji: '🛒', photo: U('1542838132-92c53300491e'), from: '#E2231A', to: '#9E0F0A' };

const MAP: Record<string, Visual> = {
  'rice-grains': { emoji: '🍚', photo: U('1586201375761-83865001e31c'), from: '#F0A23B', to: '#C8761A' },
  'flour-atta': { emoji: '🌾', photo: U('1509440159596-0249088772ff'), from: '#E9B665', to: '#B5832E' },
  'spices-masala': { emoji: '🌶️', photo: U('1596040033229-a9821ebd058d'), from: '#E2231A', to: '#9E0F0A' },
  'pulses-lentils': { emoji: '🫘', photo: U('1610725664285-7c57e6eeac3f'), from: '#C9772F', to: '#8A4B17' },
  'dry-fruits-nuts': { emoji: '🥜', photo: U('1508061253366-f7da158b6d46'), from: '#C98A3C', to: '#8A5A1C' },
  'sweeteners-honey': { emoji: '🍯', photo: U('1558642452-9d2a7deb7f62'), from: '#E8A93C', to: '#C07A12' },
  'cooking-oils-ghee': { emoji: '🫒', photo: U('1474979266404-7eaacbcd87c5'), from: '#B7A53A', to: '#7E6E18' },
  'sauces-condiments': { emoji: '🥫', photo: U('1472476443507-c7a5948772fc'), from: '#E2231A', to: '#A11410' },
  salt: { emoji: '🧂', photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Seasalt.jpg/960px-Seasalt.jpg', from: '#9AA0A6', to: '#5F6368' },
  beverages: { emoji: '🥤', photo: U('1544145945-f90425340c7e'), from: '#D94A1F', to: '#9E2B10' },
  'pantry-others': { emoji: '🍝', photo: U('1551462147-37885acc36f1'), from: '#D98A2B', to: '#A35E12' },
};

export function categoryVisual(slug?: string): Visual {
  if (slug && MAP[slug]) return MAP[slug];
  return DEFAULT;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Look up a visual from a category *name* (e.g. "Spices & Masala").
export function visualByName(name?: string): Visual {
  return categoryVisual(name ? slugify(name) : undefined);
}

// True when an image URL is a generated placeholder rather than a real photo.
export function isPlaceholder(url?: string): boolean {
  return !url || url.includes('placehold.co');
}
