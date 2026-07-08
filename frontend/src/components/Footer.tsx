import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, BRAND } from '../lib/theme';
import { Logo } from './Logo';

const WA = BRAND.phone.replace(/[^\d]/g, '');

const LINKS = [
  { label: 'Shop', href: '/products' },
  { label: 'Import / Export', href: '/import-export' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'News', href: '/news' },
  { label: 'Privacy Policy', href: '/privacy' },
];

const SOCIAL = [
  { icon: 'logo-facebook' as const, url: 'https://facebook.com' },
  { icon: 'logo-instagram' as const, url: 'https://instagram.com' },
  { icon: 'logo-linkedin' as const, url: 'https://www.linkedin.com' },
  { icon: 'logo-whatsapp' as const, url: `https://wa.me/${WA}` },
];

// Compact, light, professional footer — 3 info columns, then the brand logo
// centred above the bottom bar.
export function Footer() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const compact = width < 820;

  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={[styles.cols, compact && { flexDirection: 'column', gap: 40 }]}>
          {/* Quick links */}
          <View style={styles.col}>
            <Text style={styles.colTitle}>Quick Links</Text>
            <View style={styles.linksGrid}>
              {LINKS.map((l) => (
                <Pressable key={l.href} style={({ hovered }: any) => [styles.linkRow, hovered && { opacity: 0.7 }]} onPress={() => router.push(l.href as any)}>
                  <Ionicons name="chevron-forward" size={12} color={colors.red} />
                  <Text style={styles.link}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {!compact && <View style={styles.vDivider} />}

          {/* Contact */}
          <View style={styles.col}>
            <Text style={styles.colTitle}>Contact</Text>
            <Pressable style={styles.cRow} onPress={() => Linking.openURL(`https://wa.me/${WA}`)}>
              <Ionicons name="logo-whatsapp" size={15} color={colors.green} />
              <Text style={styles.cText}>{BRAND.phone}</Text>
            </Pressable>
            <Pressable style={styles.cRow} onPress={() => Linking.openURL(`mailto:${BRAND.email}`)}>
              <Ionicons name="mail-outline" size={15} color={colors.red} />
              <Text style={styles.cText}>{BRAND.email}</Text>
            </Pressable>
            <View style={styles.ctaRow}>
              <Pressable style={styles.ctaPrimary} onPress={() => Linking.openURL(`https://wa.me/${WA}`)}>
                <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                <Text style={styles.ctaPrimaryText}>WhatsApp</Text>
              </Pressable>
              <Pressable style={styles.ctaGhost} onPress={() => router.push('/contact')}>
                <Text style={styles.ctaGhostText}>Inquiry</Text>
              </Pressable>
            </View>
          </View>

          {!compact && <View style={styles.vDivider} />}

          {/* Office */}
          <View style={styles.col}>
            <Text style={styles.colTitle}>Office</Text>
            <Text style={styles.legal}>{BRAND.legal}</Text>
            <Text style={styles.addr}>{BRAND.address}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Centred brand + socials (compact) */}
        <View style={styles.brand}>
          <Logo size={72} />
          <Text style={styles.tag}>{BRAND.tagline}</Text>
          <View style={styles.social}>
            {SOCIAL.map((s) => (
              <Pressable key={s.icon} style={({ hovered }: any) => [styles.socialChip, hovered && styles.socialChipHover]} onPress={() => Linking.openURL(s.url)}>
                <Ionicons name={s.icon} size={16} color={colors.ink} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.bottom, compact && { flexDirection: 'column', gap: 6 }]}>
          <Text style={styles.copy}>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</Text>
          <Text style={styles.copy}>Crafted with care in Dubai, UAE 🇦🇪</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 'auto', backgroundColor: '#F2EFE9', borderTopWidth: 1, borderTopColor: colors.border },
  inner: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 16 },

  cols: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 36 },
  col: { flex: 1, gap: 7, minWidth: 160 },
  colTitle: { color: colors.ink, fontWeight: '900', fontSize: 12.5, letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  vDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },

  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 0 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, width: '44%' },
  link: { color: colors.text, fontSize: 14, fontWeight: '600' },

  cRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 3 },
  cText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  legal: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  addr: { color: colors.muted, fontSize: 13.5, lineHeight: 20 },

  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  ctaPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.red, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  ctaPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  ctaGhost: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  ctaGhostText: { color: colors.ink, fontWeight: '800', fontSize: 12.5 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  brand: { alignItems: 'center', gap: 12 },
  tag: { color: colors.muted, fontSize: 13.5, textAlign: 'center', marginTop: 2 },
  social: { flexDirection: 'row', gap: 8 },
  socialChip: { width: 34, height: 34, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  socialChipHover: { borderColor: colors.red, backgroundColor: colors.redSoft },

  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  copy: { color: colors.muted, fontSize: 12.5 },
});
