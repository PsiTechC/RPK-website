import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'navy' | 'outline' | 'danger' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const v = btnVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, v.btn, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
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
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { height: 96, textAlignVertical: 'top', paddingTop: 10 }]}
      />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone = 'navy' }: { text: string; tone?: 'navy' | 'orange' | 'green' | 'red' | 'muted' }) {
  const map: Record<string, { bg: string; fg: string }> = {
    navy: { bg: '#E8EDFB', fg: colors.navy },
    orange: { bg: '#FDECE0', fg: colors.orangeDark },
    green: { bg: '#E2F5EC', fg: colors.green },
    red: { bg: '#FCE6E5', fg: colors.red },
    muted: { bg: '#EEF0F3', fg: colors.muted },
  };
  const c = map[tone];
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }}>{text}</Text>
    </View>
  );
}

const btnVariants: Record<string, { btn: ViewStyle; text: TextStyle }> = {
  primary: { btn: { backgroundColor: colors.orange }, text: { color: colors.white } },
  navy: { btn: { backgroundColor: colors.navy }, text: { color: colors.white } },
  danger: { btn: { backgroundColor: colors.red }, text: { color: colors.white } },
  outline: { btn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.orange }, text: { color: colors.orangeDark } },
  ghost: { btn: { backgroundColor: '#F1F2F5' }, text: { color: colors.text } },
};

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accent: { width: 5, height: 22, borderRadius: 3, backgroundColor: colors.orange },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 14 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
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
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, ...shadow.soft },
});
