import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Product, imageUri } from '../../lib/api';
import { visualByName, isPlaceholder } from '../../lib/foodVisuals';
import { radius } from '../../lib/theme';

// Square product thumbnail: real photo when available, otherwise the category
// emoji on its brand gradient (so every row/card always shows something).
export function ProductThumb({ product, size = 46 }: { product: Pick<Product, 'image_url' | 'category_name'>; size?: number }) {
  const v = visualByName(product.category_name);
  const src = !isPlaceholder(product.image_url) ? imageUri(product.image_url) : v.photo || undefined;
  return (
    <View style={[styles.wrap, { width: size, height: size, backgroundColor: v.from }]}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{v.emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
