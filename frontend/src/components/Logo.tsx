import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '../lib/theme';

const LOGO = require('../../assets/images/logo.png');

// Renders the real RPK chili logo. On dark surfaces pass variant="light" to
// place it on a white rounded chip so the black artwork stays legible.
export function Logo({
  size = 44,
  showText = false,
  variant = 'plain',
}: {
  size?: number;
  showText?: boolean;
  variant?: 'plain' | 'light';
}) {
  const mark = (
    <Image source={LOGO} style={{ width: size * 1.7, height: size }} contentFit="contain" />
  );

  return (
    <View style={styles.row}>
      {variant === 'light' ? <View style={styles.chip}>{mark}</View> : mark}
      {showText && (
        <View>
          <Text style={styles.brand}>RPK</Text>
          <Text style={styles.sub}>For Food Trading</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6 },
  brand: { color: colors.ink, fontWeight: '900', fontSize: 18, lineHeight: 20, letterSpacing: 1 },
  sub: { color: colors.muted, fontSize: 10, letterSpacing: 0.5 },
});
