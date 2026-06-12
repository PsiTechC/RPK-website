// RPK brand palette — white theme matched to the RPK logo (orange banner,
// chili red, navy wave).
// Palette derived from the RPK logo: chili red + black on white.
// NOTE: the keys `orange`/`navy` are kept for backwards-compat across components,
// but now hold the brand RED and CHARCOAL respectively.
export const colors = {
  orange: '#E2231A', // brand red (primary)
  orangeDark: '#B5160F',
  red: '#E2231A',
  redDeep: '#9E0F0A',
  navy: '#1E1E1E', // charcoal (dark surfaces / secondary)
  navyDark: '#121212', // near-black (footer)
  white: '#FFFFFF',
  offWhite: '#FFF7F5',
  cream: '#FDEDEB',
  ink: '#181818',
  text: '#2A2A2A',
  muted: '#6B7280',
  border: '#F1E2E0',
  green: '#1E9E62',
  surface: '#FFFFFF',
  bg: '#FFFFFF',
};

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#7A1410',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

export const BRAND = {
  name: 'RPK For Food Trading',
  legal: 'RPK FOR FOOD TRADING CO. L.L.C',
  tagline: 'Quality groceries & food, traded worldwide from Dubai.',
  address: '1E5, 1st Floor, Al Fardan Building, Al Mankhool, Dubai, UAE',
  phone: '+971 583072132',
  email: 'dubai.trader12@gmail.com',
};
