import { describe, it, expect } from 'vitest';
import { COUNTRIES, DEFAULT_COUNTRY, parsePhone, findCountryByName } from './countries';

describe('COUNTRIES data integrity', () => {
  it('every country has a sane phone length range', () => {
    for (const c of COUNTRIES) {
      expect(c.phoneMin, c.name).toBeGreaterThan(0);
      expect(c.phoneMax, c.name).toBeGreaterThanOrEqual(c.phoneMin);
      expect(c.phoneMax, c.name).toBeLessThanOrEqual(15); // E.164 national max
      expect(c.dial.startsWith('+'), c.name).toBe(true);
    }
  });
  it('known lengths', () => {
    expect(COUNTRIES.find((c) => c.iso === 'IN')!.phoneMax).toBe(10);
    expect(COUNTRIES.find((c) => c.iso === 'AE')!.phoneMax).toBe(9);
  });
  it('iso codes are unique', () => {
    const seen = new Set(COUNTRIES.map((c) => c.iso));
    expect(seen.size).toBe(COUNTRIES.length);
  });
});

describe('parsePhone', () => {
  it('splits a stored number into country + local', () => {
    const r = parsePhone('+971 50 123 4567');
    expect(r.country.iso).toBe('AE');
    expect(r.local).toBe('50 123 4567');
  });
  it('matches the longest dial code (avoids +1 vs +971 ambiguity)', () => {
    expect(parsePhone('+91 9876543210').country.iso).toBe('IN');
  });
  it('falls back to default for unknown / empty', () => {
    expect(parsePhone('').country.iso).toBe(DEFAULT_COUNTRY.iso);
    expect(parsePhone('12345').country.iso).toBe(DEFAULT_COUNTRY.iso);
  });
});

describe('findCountryByName', () => {
  it('case-insensitive exact match', () => {
    expect(findCountryByName('india')!.iso).toBe('IN');
    expect(findCountryByName('Nope')).toBeUndefined();
  });
});
