// RPK brand palette — white theme matched to the RPK logo (orange banner,
// chili red, navy wave).
// Palette derived from the RPK logo: chili red + black on white.
// NOTE: the keys `orange`/`navy` are kept for backwards-compat across components,
// but now hold the brand RED and CHARCOAL respectively.
// Palette derived from the RPK logo (chili red + black) but kept SUBTLE: the red
// is reserved for accents/CTAs, while surfaces use warm, neutral tones for a
// calm, premium feel. The keys `orange`/`navy` are kept for backwards-compat.
export const colors = {
  orange: '#D92419', // brand red (primary / accents only)
  orangeDark: '#A8160F',
  red: '#D92419',
  redDeep: '#8E0E0A',
  redSoft: '#FBEAE8', // very light red wash for tinted surfaces
  navy: '#23211F', // warm charcoal (dark surfaces / secondary)
  navyDark: '#17150F', // near-black (footer)
  white: '#FFFFFF',
  offWhite: '#F8F7F4', // warm neutral (no pink tint)
  cream: '#F7F2EE', // soft warm beige for brand surfaces
  soft: '#F6F5F1', // subtle section background band
  hover: '#F1F0EC', // subtle hover background
  ink: '#1D1B19', // headings
  text: '#403C37', // body (warm dark grey)
  muted: '#7C776F', // secondary text (warm grey)
  border: '#E8E4DD', // neutral warm hairline
  line: '#EFEDE7', // very light divider
  green: '#1E9E62',
  surface: '#FFFFFF',
  bg: '#FFFFFF',
};

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const shadow = {
  // Soft, neutral elevation — no coloured/heavy shadows.
  card: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  soft: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
};

export const BRAND = {
  name: 'RPK For Food Trading',
  legal: 'RPK FOR FOOD TRADING CO. L.L.C',
  tagline: 'Quality groceries & food, traded worldwide from Dubai.',
  address: '1E5, 1st Floor, Al Fardan Building, Al Mankhool, Dubai, UAE',
  phone: '+971 583072132',
  email: 'importexportrpk@gmail.com',
};
