// ============================================
// Country Completion List - 国の達成度一覧
// ============================================

import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS } from '../../../src/constants/theme';
import { getLuxuryHotelPins, getCountryDisplayName } from '../../../src/data/hotelData';
import { getCountryCompletion } from '../../../src/data/completion';
import { useStore } from '../../../src/store/useStore';
import { useI18n } from '../../../src/i18n/I18nContext';

export default function CountryCompletionScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const visitedHotels = useStore((s) => s.visitedHotels);
  const visitedSet = useMemo(() => new Set(visitedHotels), [visitedHotels]);
  const hotels = useMemo(() => getLuxuryHotelPins(), []);

  const getCountryName = useMemo(
    () => (code: string) => getCountryDisplayName(code, locale),
    [locale]
  );

  const countryItems = useMemo(
    () => getCountryCompletion(hotels, visitedSet, getCountryName),
    [hotels, visitedSet, getCountryName]
  );

  const handleCountryPress = (countryCode: string) => {
    router.push(`/completion/${encodeURIComponent(countryCode)}` as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('countryCompletion')}</Text>
      <Text style={styles.subtitle}>
        {t('visitedCount', { visited: String(visitedHotels.length), total: String(hotels.length) })}
      </Text>

      <View style={styles.card}>
        {countryItems.map((item, index) => (
          <Pressable
            key={item.countryCode}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
              index === countryItems.length - 1 && styles.rowLast,
            ]}
            onPress={() => handleCountryPress(item.countryCode)}
          >
            <Text style={styles.rowLabel}>{item.countryName}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {t('visitedCount', { visited: String(item.visited), total: String(item.total) })}
                {' · '}
                {t('completionPercent', { percent: String(item.percent) })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
            </View>
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
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUSHI_COLORS.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowValue: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
  },
});
