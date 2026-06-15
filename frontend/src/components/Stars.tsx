import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

const GOLD = '#F5A623';

// Display stars (supports half), or interactive when onRate is provided.
export function Stars({
  value,
  size = 16,
  count,
  onRate,
  color = GOLD,
}: {
  value: number;
  size?: number;
  count?: number;
  onRate?: (n: number) => void;
  color?: string;
}) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;

  if (onRate) {
    return (
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} onPress={() => onRate(i)} hitSlop={4} style={{ paddingHorizontal: 2 }}>
            <Ionicons name={i <= value ? 'star' : 'star-outline'} size={size} color={color} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = i <= full ? 'star' : i === full + 1 && half ? 'star-half' : 'star-outline';
        return <Ionicons key={i} name={name as any} size={size} color={color} style={{ marginRight: 1 }} />;
      })}
      {count != null && <Text style={[styles.count, { fontSize: size - 3 }]}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  count: { color: colors.muted, fontWeight: '700', marginLeft: 4 },
});
