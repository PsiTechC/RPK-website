// Reusable form validators. Each returns an error string, or null when valid.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function vRequired(v: string | undefined, label = 'This field'): string | null {
  return v && v.trim() ? null : `${label} is required`;
}

export function vName(v: string, label = 'Name'): string | null {
  const t = (v || '').trim();
  if (!t) return `${label} is required`;
  if (t.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[\p{L} .'-]+$/u.test(t)) return `${label} can only contain letters`;
  return null;
}

export function vEmail(v: string): string | null {
  const t = (v || '').trim();
  if (!t) return 'Email is required';
  return EMAIL_RE.test(t) ? null : 'Enter a valid email address';
}

// Product name: must contain letters (digits allowed within, e.g. "Rice 1121"),
// but a purely numeric name like "65678" is rejected.
export function vProductName(v: string): string | null {
  const t = (v || '').trim();
  if (!t) return 'Product name is required';
  if (t.length < 2) return 'Product name must be at least 2 characters';
  if (!/\p{L}/u.test(t)) return 'Product name must include letters, not just numbers';
  return null;
}

// Phone: accepts digits with optional + and spaces/dashes/parens; 7–15 digits.
export function vPhone(v: string, required = false): string | null {
  const t = (v || '').trim();
  if (!t) return required ? 'Phone number is required' : null;
  if (!/^[+]?[\d\s().-]+$/.test(t)) return 'Phone can only contain digits, spaces and + - ( )';
  const digits = t.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number (7–15 digits)';
  return null;
}

export function vPassword(v: string): string | null {
  if (!v) return 'Password is required';
  if (v.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function vPrice(v: string): string | null {
  const t = (v || '').trim();
  if (!t) return 'Price is required';
  const n = Number(t);
  if (Number.isNaN(n)) return 'Price must be a number';
  if (n < 0) return 'Price cannot be negative';
  return null;
}

export function vStock(v: string): string | null {
  const t = (v || '').trim();
  if (t === '') return 'Stock is required';
  const n = Number(t);
  if (!Number.isInteger(n)) return 'Stock must be a whole number';
  if (n < 0) return 'Stock cannot be negative';
  return null;
}

// Optional image URL; allows server upload paths ("/uploads/…") or http(s) URLs.
export function vImageUrl(v: string): string | null {
  const t = (v || '').trim();
  if (!t) return null;
  if (t.startsWith('/uploads/')) return null;
  if (!/^https?:\/\/.+/.test(t)) return 'Enter a valid image URL (http/https) or upload a file';
  return null;
}

// True when the errors object has no non-null entries.
export function isClean(errors: Record<string, string | null | undefined>): boolean {
  return !Object.values(errors).some(Boolean);
}
