import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, radius, shadow } from '../lib/theme';
import { Button } from './ui';

// A small, themed confirm dialog (used e.g. before deleting a product).
// Renders through a web portal so it always centres in the viewport, above
// everything, regardless of page scroll.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const content = (
    <Pressable style={styles.overlay} onPress={onCancel}>
      <Pressable style={styles.card} onPress={(e: any) => e.stopPropagation?.()}>
        <View style={[styles.iconWrap, danger ? styles.iconDanger : styles.iconInfo]}>
          <Text style={styles.icon}>{danger ? '⚠️' : 'ℹ️'}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {!!message && <Text style={styles.message}>{message}</Text>}
        <View style={styles.actions}>
          <Button label={cancelLabel} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
          <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      </Pressable>
    </Pressable>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return require('react-dom').createPortal(content, document.body);
  }
  return content;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24,21,18,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1100,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    ...shadow.card,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconDanger: { backgroundColor: '#FCE6E5' },
  iconInfo: { backgroundColor: '#E8EDFB' },
  icon: { fontSize: 26 },
  title: { fontSize: 18, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  message: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14, width: '100%' },
});
