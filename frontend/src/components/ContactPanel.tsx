import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, BRAND } from '../lib/theme';
import { Card } from './ui';

const PHONE_RAW = BRAND.phone.replace(/[^\d+]/g, ''); // +971583072132
const WA = PHONE_RAW.replace('+', '');
const WHATSAPP_GREEN = '#25D366';

type Method = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  url: string;
};

const METHODS: Method[] = [
  { icon: 'call', color: colors.orange, label: 'Call us', value: BRAND.phone, url: `tel:${PHONE_RAW}` },
  { icon: 'logo-whatsapp', color: WHATSAPP_GREEN, label: 'WhatsApp', value: BRAND.phone, url: `https://wa.me/${WA}` },
  { icon: 'mail', color: colors.navy, label: 'Email', value: BRAND.email, url: `mailto:${BRAND.email}` },
  { icon: 'location', color: colors.red, label: 'Visit us', value: BRAND.address, url: '' },
];

/**
 * Shared contact methods + description + "Chat on WhatsApp" CTA. Used on the
 * Contact and the Import & Export pages so both keep the same structure and use
 * the real WhatsApp logo. Pass a page-specific `heading`/`description`.
 */
export function ContactPanel({
  product,
  heading = 'Get in touch',
  description = 'Questions about products, pricing, or bulk orders? Our Dubai team usually replies within a few hours.',
}: {
  product?: string;
  heading?: string;
  description?: string;
}) {
  function openWhatsApp() {
    const text = encodeURIComponent(`Hello RPK, I'd like to inquire${product ? ` about "${product}"` : ''}.`);
    Linking.openURL(`https://wa.me/${WA}?text=${text}`);
  }

  return (
    <View style={{ gap: 12 }}>
      {METHODS.map((m) => (
        <Pressable key={m.label} onPress={() => m.url && Linking.openURL(m.url)} disabled={!m.url}>
          <Card style={styles.method}>
            <View style={[styles.iconWrap, { backgroundColor: m.color + '1A' }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodValue}>{m.value}</Text>
            </View>
          </Card>
        </Pressable>
      ))}

      {/* Meaningful description fills the side column above the CTA. */}
      <Card style={styles.intro}>
        <Text style={styles.introTitle}>{heading}</Text>
        <Text style={styles.introText}>{description}</Text>
      </Card>

      <Pressable style={({ pressed }) => [styles.wa, pressed && { opacity: 0.9 }]} onPress={openWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
        <Text style={styles.waText}>Chat on WhatsApp</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  methodValue: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 2 },
  intro: { gap: 6, backgroundColor: colors.cream, borderColor: colors.border },
  introTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  introText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  wa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: WHATSAPP_GREEN,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  waText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
