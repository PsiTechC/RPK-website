// phoneMin/phoneMax = national (local) number digit lengths, excluding the dial
// code. Used to cap input and validate per country (e.g. India = 10 digits).
export type Country = { name: string; iso: string; dial: string; flag: string; phoneMin: number; phoneMax: number };

// Curated list — Gulf, South Asia and major trading partners first, then a
// broad set. Used by the PhoneField country/dial-code picker.
export const COUNTRIES: Country[] = [
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971', flag: '🇦🇪', phoneMin: 9, phoneMax: 9 },
  { name: 'India', iso: 'IN', dial: '+91', flag: '🇮🇳', phoneMin: 10, phoneMax: 10 },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966', flag: '🇸🇦', phoneMin: 9, phoneMax: 9 },
  { name: 'Pakistan', iso: 'PK', dial: '+92', flag: '🇵🇰', phoneMin: 10, phoneMax: 10 },
  { name: 'Bangladesh', iso: 'BD', dial: '+880', flag: '🇧🇩', phoneMin: 10, phoneMax: 10 },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94', flag: '🇱🇰', phoneMin: 9, phoneMax: 9 },
  { name: 'Nepal', iso: 'NP', dial: '+977', flag: '🇳🇵', phoneMin: 10, phoneMax: 10 },
  { name: 'Qatar', iso: 'QA', dial: '+974', flag: '🇶🇦', phoneMin: 8, phoneMax: 8 },
  { name: 'Kuwait', iso: 'KW', dial: '+965', flag: '🇰🇼', phoneMin: 8, phoneMax: 8 },
  { name: 'Bahrain', iso: 'BH', dial: '+973', flag: '🇧🇭', phoneMin: 8, phoneMax: 8 },
  { name: 'Oman', iso: 'OM', dial: '+968', flag: '🇴🇲', phoneMin: 8, phoneMax: 8 },
  { name: 'Egypt', iso: 'EG', dial: '+20', flag: '🇪🇬', phoneMin: 10, phoneMax: 10 },
  { name: 'United Kingdom', iso: 'GB', dial: '+44', flag: '🇬🇧', phoneMin: 10, phoneMax: 10 },
  { name: 'United States', iso: 'US', dial: '+1', flag: '🇺🇸', phoneMin: 10, phoneMax: 10 },
  { name: 'Canada', iso: 'CA', dial: '+1', flag: '🇨🇦', phoneMin: 10, phoneMax: 10 },
  { name: 'Australia', iso: 'AU', dial: '+61', flag: '🇦🇺', phoneMin: 9, phoneMax: 9 },
  { name: 'China', iso: 'CN', dial: '+86', flag: '🇨🇳', phoneMin: 11, phoneMax: 11 },
  { name: 'Singapore', iso: 'SG', dial: '+65', flag: '🇸🇬', phoneMin: 8, phoneMax: 8 },
  { name: 'Malaysia', iso: 'MY', dial: '+60', flag: '🇲🇾', phoneMin: 9, phoneMax: 10 },
  { name: 'Indonesia', iso: 'ID', dial: '+62', flag: '🇮🇩', phoneMin: 9, phoneMax: 12 },
  { name: 'Philippines', iso: 'PH', dial: '+63', flag: '🇵🇭', phoneMin: 10, phoneMax: 10 },
  { name: 'Turkey', iso: 'TR', dial: '+90', flag: '🇹🇷', phoneMin: 10, phoneMax: 10 },
  { name: 'Iran', iso: 'IR', dial: '+98', flag: '🇮🇷', phoneMin: 10, phoneMax: 10 },
  { name: 'Iraq', iso: 'IQ', dial: '+964', flag: '🇮🇶', phoneMin: 10, phoneMax: 10 },
  { name: 'Jordan', iso: 'JO', dial: '+962', flag: '🇯🇴', phoneMin: 9, phoneMax: 9 },
  { name: 'Lebanon', iso: 'LB', dial: '+961', flag: '🇱🇧', phoneMin: 7, phoneMax: 8 },
  { name: 'Kenya', iso: 'KE', dial: '+254', flag: '🇰🇪', phoneMin: 9, phoneMax: 9 },
  { name: 'Nigeria', iso: 'NG', dial: '+234', flag: '🇳🇬', phoneMin: 10, phoneMax: 10 },
  { name: 'South Africa', iso: 'ZA', dial: '+27', flag: '🇿🇦', phoneMin: 9, phoneMax: 9 },
  { name: 'Germany', iso: 'DE', dial: '+49', flag: '🇩🇪', phoneMin: 10, phoneMax: 11 },
  { name: 'France', iso: 'FR', dial: '+33', flag: '🇫🇷', phoneMin: 9, phoneMax: 9 },
  { name: 'Italy', iso: 'IT', dial: '+39', flag: '🇮🇹', phoneMin: 9, phoneMax: 10 },
  { name: 'Spain', iso: 'ES', dial: '+34', flag: '🇪🇸', phoneMin: 9, phoneMax: 9 },
  { name: 'Netherlands', iso: 'NL', dial: '+31', flag: '🇳🇱', phoneMin: 9, phoneMax: 9 },
  { name: 'Russia', iso: 'RU', dial: '+7', flag: '🇷🇺', phoneMin: 10, phoneMax: 10 },
  { name: 'Japan', iso: 'JP', dial: '+81', flag: '🇯🇵', phoneMin: 10, phoneMax: 10 },
  { name: 'South Korea', iso: 'KR', dial: '+82', flag: '🇰🇷', phoneMin: 9, phoneMax: 10 },
  { name: 'Thailand', iso: 'TH', dial: '+66', flag: '🇹🇭', phoneMin: 9, phoneMax: 9 },
  { name: 'Vietnam', iso: 'VN', dial: '+84', flag: '🇻🇳', phoneMin: 9, phoneMax: 10 },
  { name: 'Brazil', iso: 'BR', dial: '+55', flag: '🇧🇷', phoneMin: 10, phoneMax: 11 },
  { name: 'Afghanistan', iso: 'AF', dial: '+93', flag: '🇦🇫', phoneMin: 9, phoneMax: 9 },
  { name: 'Yemen', iso: 'YE', dial: '+967', flag: '🇾🇪', phoneMin: 9, phoneMax: 9 },
  { name: 'Morocco', iso: 'MA', dial: '+212', flag: '🇲🇦', phoneMin: 9, phoneMax: 9 },
  { name: 'Ethiopia', iso: 'ET', dial: '+251', flag: '🇪🇹', phoneMin: 9, phoneMax: 9 },
  { name: 'Tanzania', iso: 'TZ', dial: '+255', flag: '🇹🇿', phoneMin: 9, phoneMax: 9 },
  { name: 'Uganda', iso: 'UG', dial: '+256', flag: '🇺🇬', phoneMin: 9, phoneMax: 9 },
  { name: 'Ghana', iso: 'GH', dial: '+233', flag: '🇬🇭', phoneMin: 9, phoneMax: 9 },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]; // UAE

export function findCountryByName(name?: string): Country | undefined {
  if (!name) return undefined;
  const s = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === s);
}

// Split a stored phone ("+971 50 123 4567") into its country + local number,
// matching the longest dial code first.
export function parsePhone(stored?: string): { country: Country; local: string } {
  const s = (stored || '').trim();
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (s.startsWith(c.dial)) return { country: c, local: s.slice(c.dial.length).trim() };
  }
  return { country: DEFAULT_COUNTRY, local: s.replace(/^\+/, '') };
}
