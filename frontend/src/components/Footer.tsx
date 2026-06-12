import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../lib/theme';
import { BRAND } from '../lib/theme';
import { Logo } from './Logo';

export function Footer() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  return (
    <View style={styles.wrap}>
      <View style={[styles.inner, compact && { flexDirection: 'column', gap: 20 }]}>
        <View style={{ maxWidth: 320, gap: 12 }}>
          <Logo size={46} variant="light" />
          <Text style={styles.tag}>{BRAND.tagline}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.h}>Company</Text>
          <Text style={styles.line}>{BRAND.legal}</Text>
          <Text style={styles.line}>{BRAND.address}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.h}>Contact</Text>
          <Text style={styles.line}>📞 {BRAND.phone}</Text>
          <Text style={styles.line}>✉️ {BRAND.email}</Text>
          <Text style={styles.line}>🌍 Import & Export — worldwide</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.copy}>© {new Date().getFullYear()} {BRAND.legal}. All rights reserved.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // marginTop:'auto' pins the footer to the bottom of the scroll view so short
  // pages don't leave a gap below it (works with contentContainerStyle flexGrow).
  wrap: { backgroundColor: colors.navyDark, marginTop: 'auto' },
  inner: {
    maxWidth: 1600,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 32,
    gap: 32,
  },
  col: { gap: 8 },
  h: { color: colors.orange, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  line: { color: '#D6DEF7', fontSize: 13, lineHeight: 20 },
  tag: { color: '#C9D4F5', fontSize: 13, lineHeight: 20 },
  bottom: { borderTopWidth: 1, borderTopColor: '#2A3F7A', paddingVertical: 16 },
  copy: { color: '#9FB0E0', textAlign: 'center', fontSize: 12 },
});
