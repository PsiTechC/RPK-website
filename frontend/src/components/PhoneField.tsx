import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';
import { COUNTRIES, Country } from '../lib/countries';

// Phone input with a searchable country / dial-code picker. The selected
// country's dial code is shown as a prefix; the text box holds the local number.
export function PhoneField({
  label = 'Phone',
  country,
  onCountryChange,
  number,
  onNumberChange,
  error,
  placeholder = '50 123 4567',
}: {
  label?: string;
  country: Country;
  onCountryChange: (c: Country) => void;
  number: string;
  onNumberChange: (n: string) => void;
  error?: string | null;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.includes(s));
  }, [q]);

  return (
    <View style={{ gap: 6, zIndex: open ? 50 : 1 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <View>
          <Pressable style={[styles.codeBtn, !!error && styles.errBorder]} onPress={() => setOpen((o) => !o)}>
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={styles.code}>{country.dial}</Text>
            <Text style={styles.chev}>▾</Text>
          </Pressable>

          {open && (
            <>
              <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
              <View style={styles.dropdown}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search country…"
                  placeholderTextColor={colors.muted}
                  style={styles.search}
                  autoFocus
                />
                <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
                  {filtered.map((c) => (
                    <Pressable
                      key={c.iso}
                      style={({ hovered }: any) => [styles.item, hovered && styles.itemHover, c.iso === country.iso && styles.itemActive]}
                      onPress={() => {
                        onCountryChange(c);
                        setOpen(false);
                        setQ('');
                      }}
                    >
                      <Text style={styles.flag}>{c.flag}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.itemDial}>{c.dial}</Text>
                    </Pressable>
                  ))}
                  {filtered.length === 0 && <Text style={styles.noMatch}>No match</Text>}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        <TextInput
          value={number}
          onChangeText={(t) => {
            // Digits only, capped to the selected country's national length
            // (e.g. India = 10) so you can't type more than the country allows.
            const digits = t.replace(/\D/g, '').slice(0, country.phoneMax);
            onNumberChange(digits);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          maxLength={country.phoneMax}
          style={[styles.input, !!error && styles.errBorder]}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.hintText}>
          {country.phoneMin === country.phoneMax
            ? `${country.name} numbers are ${country.phoneMax} digits`
            : `${country.name} numbers are ${country.phoneMin}–${country.phoneMax} digits`}
          {number ? `  ·  ${number.replace(/\D/g, '').length}/${country.phoneMax}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 46,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.white,
  },
  flag: { fontSize: 18 },
  code: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  chev: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  input: {
    flex: 1, height: 46, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, color: colors.text, fontSize: 15, outlineStyle: 'none' as any,
  },
  errBorder: { borderColor: colors.red },
  errorText: { color: colors.red, fontSize: 12 },
  hintText: { color: colors.muted, fontSize: 11 },
  scrim: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  dropdown: {
    position: 'absolute' as any, top: 52, left: 0, width: 280, maxWidth: '86vw' as any, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, zIndex: 100, ...shadow.card,
  },
  search: {
    marginHorizontal: 8, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.offWhite,
    borderRadius: radius.sm, color: colors.text, fontSize: 14, outlineStyle: 'none' as any,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  itemHover: { backgroundColor: colors.offWhite },
  itemActive: { backgroundColor: colors.cream },
  itemName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  itemDial: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  noMatch: { color: colors.muted, fontSize: 13, padding: 12, textAlign: 'center' },
});
