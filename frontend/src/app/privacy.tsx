import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, BRAND } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container } from '../components/ui';
import { FadeInUp } from '../components/Motion';

const HERO = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1700&q=75';

const SECTIONS = [
  { icon: 'information-circle-outline', h: '1. Introduction', p: `${BRAND.legal} ("RPK", "we", "us") respects your privacy. This policy explains what information we collect when you use our website, how we use it, and the choices you have. By using our site you agree to the practices described here.` },
  { icon: 'document-text-outline', h: '2. Information we collect', p: 'We collect details you provide directly — such as your name, company, email, phone number and the products or quantities you enquire about through our contact, inquiry and import/export registration forms. We may also collect basic technical data (device, browser and usage information) to keep the site secure and improve it.' },
  { icon: 'construct-outline', h: '3. How we use your information', p: 'We use your information to respond to inquiries and quote requests, process import/export registrations, provide customer support, send service-related updates, and improve our products and website. We do not sell your personal information.' },
  { icon: 'share-social-outline', h: '4. Sharing', p: 'We may share information with trusted service providers (e.g. email, hosting and logistics partners) strictly to operate our business, and with authorities where required by law. All partners are expected to safeguard your data.' },
  { icon: 'lock-closed-outline', h: '5. Data security', p: 'We apply reasonable technical and organisational measures to protect your data against unauthorised access, loss or misuse. No method of transmission over the internet is 100% secure, but we work to keep your information safe.' },
  { icon: 'person-outline', h: '6. Your rights', p: 'You may request access to, correction of, or deletion of the personal information we hold about you. To make a request, contact us using the details below.' },
  { icon: 'mail-outline', h: '7. Contact us', p: `For any privacy questions or requests, email ${BRAND.email} or call ${BRAND.phone}. ${BRAND.legal}, ${BRAND.address}.` },
];

export default function Privacy() {
  const { width } = useWindowDimensions();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.hero, { paddingVertical: width < 700 ? 44 : 72 }]}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <View style={styles.scrim} />
        <FadeInUp delay={80} distance={24} style={styles.heroInner}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={15} color={colors.white} />
            <Text style={styles.badgeText}>YOUR PRIVACY MATTERS</Text>
          </View>
          <Text style={[styles.h1, { fontSize: width < 700 ? 34 : 48 }]}>Privacy Policy</Text>
          <Text style={styles.heroSub}>How we collect, use and protect your information · Last updated June 2026</Text>
        </FadeInUp>
      </View>

      <Container style={{ marginTop: 28, marginBottom: 44 }}>
        <View style={{ gap: 16, maxWidth: 860, alignSelf: 'center', width: '100%' }}>
          {SECTIONS.map((s, i) => (
            <FadeInUp key={s.h} delay={i * 60} distance={18}>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={s.icon as any} size={18} color={colors.orange} />
                  </View>
                  <Text style={styles.h}>{s.h}</Text>
                </View>
                <Text style={styles.p}>{s.p}</Text>
              </View>
            </FadeInUp>
          ))}
        </View>
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', backgroundColor: colors.navyDark, paddingHorizontal: 18, alignItems: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,12,26,0.72)' },
  heroInner: { width: '100%', maxWidth: 760, alignItems: 'center', zIndex: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 11.5, letterSpacing: 1.5 },
  h1: { color: colors.white, fontWeight: '900', textAlign: 'center', marginTop: 12, letterSpacing: -0.5 },
  heroSub: { color: '#E7E3DF', fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 560, marginTop: 12 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 10, ...shadow.soft },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  h: { color: colors.ink, fontSize: 16.5, fontWeight: '900', flex: 1 },
  p: { color: colors.text, fontSize: 14.5, lineHeight: 24 },
});
