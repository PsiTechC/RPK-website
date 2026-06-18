import { describe, it, expect } from 'vitest';
import { vName, vEmail, vPassword, vPhoneLen, sanitizeName, isClean } from './validate';
import { COUNTRIES } from './countries';

const IN = COUNTRIES.find((c) => c.iso === 'IN')!; // 10 digits exact
const AE = COUNTRIES.find((c) => c.iso === 'AE')!; // 9 digits exact
const LB = COUNTRIES.find((c) => c.iso === 'LB')!; // 7–8 range

describe('vName', () => {
  it('rejects digits', () => {
    expect(vName('John2')).toMatch(/only contain letters/);
  });
  it('rejects empty and too-short', () => {
    expect(vName('')).toMatch(/required/);
    expect(vName('A')).toMatch(/at least 2/);
  });
  it('accepts letters, spaces and . \' -', () => {
    expect(vName("Jean-Luc O'Brien")).toBeNull();
    expect(vName('Mary Jane')).toBeNull();
  });
});

describe('sanitizeName', () => {
  it('strips digits and symbols, keeps name chars', () => {
    expect(sanitizeName('John123')).toBe('John');
    expect(sanitizeName('A@#1b2')).toBe('Ab');
    expect(sanitizeName("O'Neill-Smith Jr.")).toBe("O'Neill-Smith Jr.");
  });
});

describe('vEmail', () => {
  it('accepts valid', () => expect(vEmail('a@b.co')).toBeNull());
  it('rejects invalid', () => {
    expect(vEmail('nope')).toMatch(/valid email/);
    expect(vEmail('a@b')).toMatch(/valid email/);
    expect(vEmail('')).toMatch(/required/);
  });
});

describe('vPassword', () => {
  it('requires >= 6 chars', () => {
    expect(vPassword('12345')).toMatch(/at least 6/);
    expect(vPassword('123456')).toBeNull();
  });
});

describe('vPhoneLen', () => {
  it('India must be exactly 10 digits', () => {
    expect(vPhoneLen('9876543210', IN)).toBeNull();
    expect(vPhoneLen('98765', IN)).toMatch(/10 digits/);
    expect(vPhoneLen('98765432109', IN)).toMatch(/10 digits/);
  });
  it('UAE must be exactly 9 digits', () => {
    expect(vPhoneLen('501234567', AE)).toBeNull();
    expect(vPhoneLen('50123', AE)).toMatch(/9 digits/);
  });
  it('ranged country (Lebanon 7–8) accepts both ends', () => {
    expect(vPhoneLen('1234567', LB)).toBeNull();
    expect(vPhoneLen('12345678', LB)).toBeNull();
    expect(vPhoneLen('123456', LB)).toMatch(/7–8 digits/);
  });
  it('ignores non-digits when counting', () => {
    expect(vPhoneLen('98765 43210', IN)).toBeNull();
  });
  it('empty: optional vs required', () => {
    expect(vPhoneLen('', IN, false)).toBeNull();
    expect(vPhoneLen('', IN, true)).toMatch(/required/);
  });
});

describe('isClean', () => {
  it('true only when all values are null/undefined', () => {
    expect(isClean({ a: null, b: undefined })).toBe(true);
    expect(isClean({ a: null, b: 'err' })).toBe(false);
  });
});
