import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, BRAND } from '../lib/theme';
import { Logo } from './Logo';

// Animated gradient footer background (web only — native uses a solid fallback).
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('rpk-footer-style')) {
  const st = document.createElement('style');
  st.id = 'rpk-footer-style';
  st.textContent =
    '@keyframes rpkFooterShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}' +
    '#rpk-footer-bg{background:linear-gradient(125deg,#1a1310,#241914,#140f0d,#2a160f,#1a1310);background-size:320% 320%;animation:rpkFooterShift 24s ease infinite;}';
  document.head.appendChild(st);
}

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
  { icon: 'logo-facebook' as const, url: 'https://facebook.com', color: '#1877F2' },
  { icon: 'logo-instagram' as const, url: 'https://instagram.com', color: '#E4405F' },
  { icon: 'logo-linkedin' as const, url: 'https://www.linkedin.com', color: '#0A66C2' },
  { icon: 'logo-whatsapp' as const, url: `https://wa.me/${WA}`, color: '#25D366' },
];

const ctaGrad = Platform.OS === 'web'
  ? ({ backgroundImage: 'linear-gradient(120deg,#E2231A 0%,#F3822A 100%)' } as any)
  : { backgroundColor: colors.red };

const blob = (color: string, extra: any) =>
  ({
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 999,
    backgroundColor: color,
    opacity: Platform.OS === 'web' ? 0.5 : 0.14,
    ...(Platform.OS === 'web' ? { filter: 'blur(110px)' } : {}),
    ...extra,
  } as any);

export function Footer() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const compact = width < 900;

  return (
    <View nativeID="rpk-footer-bg" style={[styles.wrap, Platform.OS !== 'web' && styles.wrapNative]}>
      {/* decorative glows (brand warm tones) */}
      <View pointerEvents="none" style={blob('#F3822A', { top: -120, left: -80 })} />
      <View pointerEvents="none" style={blob('#E2231A', { bottom: -140, right: -90 })} />

      <View style={styles.inner}>
        {/* Columns */}
        <View style={[styles.cols, compact && { flexDirection: 'column', gap: 28 }]}>
          <View style={styles.col}>
            <Text style={styles.colTitle}>CONTACT US</Text>
            <Pressable style={styles.line} onPress={() => Linking.openURL(`https://wa.me/${WA}`)}>
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text style={styles.lineText}>{BRAND.phone}</Text>
            </Pressable>
            <Pressable style={styles.line} onPress={() => Linking.openURL(`mailto:${BRAND.email}`)}>
              <Ionicons name="mail-outline" size={14} color="#C9B8A8" />
              <Text style={styles.lineText}>{BRAND.email}</Text>
            </Pressable>
          </View>

          {!compact && <View style={styles.vDivider} />}

          <View style={styles.col}>
            <Text style={styles.colTitle}>ADDRESS</Text>
            <Text style={styles.addr}>{BRAND.legal}</Text>
            <Text style={styles.addr}>{BRAND.address}</Text>
          </View>

          {!compact && <View style={styles.vDivider} />}

          <View style={styles.col}>
            <Text style={styles.colTitle}>OUR LINKS</Text>
            <View style={styles.linksGrid}>
              {LINKS.map((l) => (
                <Pressable key={l.href} style={styles.linkCell} onPress={() => router.push(l.href as any)}>
                  <Text style={styles.link}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.hDivider} />

        {/* Brand + socials */}
        <View style={styles.brandRow}>
          <View style={styles.logoChip}>
            <Logo size={46} />
          </View>
          <Text style={styles.tag}>{BRAND.tagline}</Text>
          <View style={styles.social}>
            {SOCIAL.map((s) => (
              <Pressable key={s.icon} style={({ hovered }: any) => [styles.socialChip, { backgroundColor: s.color }, hovered && { opacity: 0.85 }]} onPress={() => Linking.openURL(s.url)}>
                <Ionicons name={s.icon} size={18} color="#fff" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.hDivider} />

        <View style={[styles.bottomBar, compact && { flexDirection: 'column', gap: 8 }]}>
          <Text style={styles.copy}>© {new Date().getFullYear()} {BRAND.name} · All rights reserved.</Text>
          <Text style={styles.madeIn}>Crafted with care in Dubai, UAE 🇦🇪</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 'auto', position: 'relative', overflow: 'hidden' },
  wrapNative: { backgroundColor: '#1a1310' },
  inner: { maxWidth: 1600, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 20, zIndex: 2 },

  // CTA band
  cta: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 28, paddingVertical: 24, marginBottom: 34, gap: 16 },
  ctaKicker: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11.5, letterSpacing: 1.6 },
  ctaTitle: { color: '#fff', fontWeight: '900', fontSize: 22, marginTop: 6, letterSpacing: -0.3 },
  ctaBtns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  ctaPrimary: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  ctaPrimaryText: { color: colors.red, fontWeight: '900', fontSize: 14 },
  ctaGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  ctaGhostText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // columns
  cols: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 40 },
  col: { flex: 1, maxWidth: 360, alignItems: 'center', gap: 12 },
  colTitle: { color: '#D9A86E', fontWeight: '800', fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineText: { color: '#EAE2DA', fontSize: 14 },
  addr: { color: '#EAE2DA', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 2, width: '100%' },
  linkCell: { width: '46%', alignItems: 'center' },
  link: { color: '#EAE2DA', fontSize: 14, paddingVertical: 6, fontWeight: '600' },
  vDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },

  hDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 22 },

  // brand row
  brandRow: { alignItems: 'center', gap: 14 },
  logoChip: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.35)' } as any : { elevation: 5 }) },
  tag: { color: '#C9B8A8', fontSize: 13, textAlign: 'center' },
  social: { flexDirection: 'row', gap: 12, marginTop: 2 },
  socialChip: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 78 },
  copy: { color: '#B6A89A', fontSize: 12.5 },
  madeIn: { color: '#B6A89A', fontSize: 12.5 },
});
