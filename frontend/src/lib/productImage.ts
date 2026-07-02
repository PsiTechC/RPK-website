import { Platform } from 'react-native';

// The single standard size every product photo should be. The storefront
// product card renders a 4:3 image box (see ProductCard `imgWrap`), so the
// standard is 4:3 too — an image of exactly this size fills the card with no
// stretching, cropping or letter-boxing. Anything else triggers a warning in
// the admin product form.
export const PRODUCT_IMAGE = {
  width: 1200,
  height: 900,
  // Allow a couple of px of rounding slack (some encoders are off by one).
  tolerance: 2,
};

export const PRODUCT_IMAGE_LABEL = `${PRODUCT_IMAGE.width}×${PRODUCT_IMAGE.height}px`;

// True when the given pixel dimensions match the standard within tolerance.
export function isProductImageSize(w: number, h: number): boolean {
  return (
    Math.abs(w - PRODUCT_IMAGE.width) <= PRODUCT_IMAGE.tolerance &&
    Math.abs(h - PRODUCT_IMAGE.height) <= PRODUCT_IMAGE.tolerance
  );
}

// Read the natural pixel size of an image URL (web only — the admin runs on
// web). Resolves to null if it can't be measured (non-web, load error).
export function measureImage(uri: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !uri) {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}
