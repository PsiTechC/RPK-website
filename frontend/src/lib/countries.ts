export type Country = { name: string; iso: string; dial: string; flag: string };

// Curated list — Gulf, South Asia and major trading partners first, then a
// broad set. Used by the PhoneField country/dial-code picker.
export const COUNTRIES: Country[] = [
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'India', iso: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'Pakistan', iso: 'PK', dial: '+92', flag: '🇵🇰' },
  { name: 'Bangladesh', iso: 'BD', dial: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94', flag: '🇱🇰' },
  { name: 'Nepal', iso: 'NP', dial: '+977', flag: '🇳🇵' },
  { name: 'Qatar', iso: 'QA', dial: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', iso: 'KW', dial: '+965', flag: '🇰🇼' },
  { name: 'Bahrain', iso: 'BH', dial: '+973', flag: '🇧🇭' },
  { name: 'Oman', iso: 'OM', dial: '+968', flag: '🇴🇲' },
  { name: 'Egypt', iso: 'EG', dial: '+20', flag: '🇪🇬' },
  { name: 'United Kingdom', iso: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'United States', iso: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Canada', iso: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Australia', iso: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'China', iso: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Singapore', iso: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'Malaysia', iso: 'MY', dial: '+60', flag: '🇲🇾' },
  { name: 'Indonesia', iso: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Philippines', iso: 'PH', dial: '+63', flag: '🇵🇭' },
  { name: 'Turkey', iso: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'Iran', iso: 'IR', dial: '+98', flag: '🇮🇷' },
  { name: 'Iraq', iso: 'IQ', dial: '+964', flag: '🇮🇶' },
  { name: 'Jordan', iso: 'JO', dial: '+962', flag: '🇯🇴' },
  { name: 'Lebanon', iso: 'LB', dial: '+961', flag: '🇱🇧' },
  { name: 'Kenya', iso: 'KE', dial: '+254', flag: '🇰🇪' },
  { name: 'Nigeria', iso: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'South Africa', iso: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'Germany', iso: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'France', iso: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Italy', iso: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Spain', iso: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', iso: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'Russia', iso: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Japan', iso: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'South Korea', iso: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'Thailand', iso: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Vietnam', iso: 'VN', dial: '+84', flag: '🇻🇳' },
  { name: 'Brazil', iso: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Afghanistan', iso: 'AF', dial: '+93', flag: '🇦🇫' },
  { name: 'Yemen', iso: 'YE', dial: '+967', flag: '🇾🇪' },
  { name: 'Morocco', iso: 'MA', dial: '+212', flag: '🇲🇦' },
  { name: 'Ethiopia', iso: 'ET', dial: '+251', flag: '🇪🇹' },
  { name: 'Tanzania', iso: 'TZ', dial: '+255', flag: '🇹🇿' },
  { name: 'Uganda', iso: 'UG', dial: '+256', flag: '🇺🇬' },
  { name: 'Ghana', iso: 'GH', dial: '+233', flag: '🇬🇭' },
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
