import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../lib/theme';

export function Container({ children, style, max = 1600 }: { children: React.ReactNode; style?: ViewStyle; max?: number }) {
  return <View style={[{ width: '100%', maxWidth: max, alignSelf: 'center', paddingHorizontal: 18 }, style]}>{children}</View>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <View style={styles.accent} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'navy' | 'outline' | 'danger' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const v = btnVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, v.btn, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
      {!!icon && <Ionicons name={icon} size={16} color={v.text.color as string} />}
      <Text style={[styles.btnText, v.text]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  style,
  error,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  style?: ViewStyle;
  error?: string | null;
}) {
  const [show, setShow] = useState(false);
  const isSecure = !!secureTextEntry;
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={isSecure && !show}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            styles.input,
            multiline && { height: 96, textAlignVertical: 'top', paddingTop: 10 },
            isSecure && { paddingRight: 46 },
            !!error && styles.inputError,
          ]}
        />
        {isSecure && (
          <Pressable
            style={styles.eye}
            onPress={() => setShow((s) => !s)}
            hitSlop={8}
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'navy' }: { text: string; tone?: 'navy' | 'orange' | 'green' | 'red' | 'muted' }) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    navy: { bg: colors.soft, fg: colors.ink, bd: colors.border },
    orange: { bg: colors.redSoft, fg: colors.orangeDark, bd: '#F3D6D2' },
    green: { bg: '#E9F4ED', fg: '#177A4A', bd: '#CFE8D8' },
    red: { bg: colors.redSoft, fg: colors.redDeep, bd: '#F3D6D2' },
    muted: { bg: colors.soft, fg: colors.muted, bd: colors.border },
  };
  const c = map[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.bd, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{text}</Text>
    </View>
  );
}

const btnVariants: Record<string, { btn: ViewStyle; text: TextStyle }> = {
  primary: { btn: { backgroundColor: colors.orange }, text: { color: colors.white } },
  navy: { btn: { backgroundColor: colors.navy }, text: { color: colors.white } },
  danger: { btn: { backgroundColor: colors.red }, text: { color: colors.white } },
  outline: { btn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }, text: { color: colors.ink } },
  ghost: { btn: { backgroundColor: colors.soft }, text: { color: colors.text } },
};

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accent: { width: 5, height: 22, borderRadius: 3, backgroundColor: colors.orange },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 14 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontWeight: '800', fontSize: 15 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
  inputError: { borderColor: colors.red, backgroundColor: colors.redSoft },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '600' },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  eye: { position: 'absolute', right: 6, top: 0, bottom: 0, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, ...shadow.soft },
});
