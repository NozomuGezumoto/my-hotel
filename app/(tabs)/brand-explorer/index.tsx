// ============================================
// Brand Explorer - Brand list with Completion & Dream count
// ============================================

import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS } from '../../../src/constants/theme';
import { getLuxuryHotelPins, getBrandForHotel } from '../../../src/data/hotelData';
import { getBrandCompletion } from '../../../src/data/completion';
import { useStore } from '../../../src/store/useStore';
import { useI18n } from '../../../src/i18n/I18nContext';

export default function BrandExplorerScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const visitedHotels = useStore((s) => s.visitedHotels);
  const wantToGoHotels = useStore((s) => s.wantToGoHotels);
  const visitedSet = useMemo(() => new Set(visitedHotels), [visitedHotels]);
  const wantToGoSet = useMemo(() => new Set(wantToGoHotels), [wantToGoHotels]);
  const hotels = useMemo(() => getLuxuryHotelPins(), []);

  const brandItems = useMemo(
    () => getBrandCompletion(hotels, visitedSet),
    [hotels, visitedSet]
  );

  const dreamCountByBrand = useMemo(() => {
    const map: Record<string, number> = {};
    hotels.forEach((h) => {
      if (wantToGoSet.has(h.id)) {
        const b = getBrandForHotel(h);
        map[b] = (map[b] ?? 0) + 1;
      }
    });
    return map;
  }, [hotels, wantToGoSet]);

  const handleBrandPress = (brand: string) => {
    router.push({ pathname: '/brand-explorer/[brand]', params: { brand } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('brandExplorer')}</Text>
      <Text style={styles.subtitle}>
        {brandItems.length} {t('brandCompletion')}
      </Text>
      <View style={styles.card}>
        {brandItems.map((item) => (
          <Pressable
            key={item.brand}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => handleBrandPress(item.brand)}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowLabel}>{item.brand}</Text>
              <Text style={styles.rowMeta}>
                {t('visitedCount', { visited: String(item.visited), total: String(item.total) })}
                {' · '}
                {t('completionPercent', { percent: String(item.percent) })}
                {dreamCountByBrand[item.brand] != null && dreamCountByBrand[item.brand] > 0 && (
                  <> · {t('dreamCount', { count: String(dreamCountByBrand[item.brand]) })}</>
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xl * 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: SUSHI_COLORS.backgroundElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUSHI_COLORS.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowMain: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
  },
  rowMeta: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
