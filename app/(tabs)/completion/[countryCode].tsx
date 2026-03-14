// ============================================
// Country Detail - Hotels in this country
// ============================================

import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS, SHADOWS } from '../../../src/constants/theme';
import { getLuxuryHotelPins, getCountryDisplayName } from '../../../src/data/hotelData';
import { useStore } from '../../../src/store/useStore';
import { useI18n } from '../../../src/i18n/I18nContext';

export default function CountryDetailScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { countryCode: codeParam } = useLocalSearchParams<{ countryCode: string }>();
  const countryCode = decodeURIComponent(codeParam ?? '');

  const visitedHotels = useStore((s) => s.visitedHotels);
  const wantToGoHotels = useStore((s) => s.wantToGoHotels);
  const hotels = useMemo(() => getLuxuryHotelPins(), []);

  const countryName = useMemo(
    () => getCountryDisplayName(countryCode, locale),
    [countryCode, locale]
  );

  const countryHotels = useMemo(
    () => hotels.filter((h) => h.countryCode === countryCode),
    [hotels, countryCode]
  );

  const visitedCount = useMemo(
    () => countryHotels.filter((h) => visitedHotels.includes(h.id)).length,
    [countryHotels, visitedHotels]
  );
  const dreamCount = useMemo(
    () => countryHotels.filter((h) => wantToGoHotels.includes(h.id)).length,
    [countryHotels, wantToGoHotels]
  );
  const total = countryHotels.length;
  const percent = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  const halfThreshold = total > 0 ? Math.ceil(total / 2) : 0;
  const hasExplorer = visitedCount >= 1;
  const hasResident = visitedCount >= halfThreshold;
  const hasMaster = total > 0 && visitedCount >= total;

  const titles = useMemo(
    () => [
      { key: 'master', label: t('titleMasterWithName', { name: countryName }), condition: t('titleConditionMaster'), unlocked: hasMaster, icon: 'trophy' as const, tierColor: SUSHI_COLORS.titleMaster },
      { key: 'traveler', label: t('titleTravelerWithName', { name: countryName }), condition: t('titleConditionTraveler'), unlocked: hasResident, icon: 'airplane' as const, tierColor: SUSHI_COLORS.titleTraveler },
      { key: 'explorer', label: t('titleExplorerWithName', { name: countryName }), condition: t('titleConditionExplorer'), unlocked: hasExplorer, icon: 'compass' as const, tierColor: SUSHI_COLORS.titleExplorer },
    ],
    [t, countryName, hasExplorer, hasResident, hasMaster]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={SUSHI_COLORS.primary} />
        <Text style={styles.backLabel}>{t('countryCompletion')}</Text>
      </Pressable>

      <Text style={styles.title}>{countryName}</Text>
      <Text style={styles.subtitle}>
        {t('visitedCount', { visited: String(visitedCount), total: String(total) })}
        {' · '}
        {t('completionPercent', { percent: String(percent) })}
        {dreamCount > 0 && ` · ${t('dreamCount', { count: String(dreamCount) })}`}
      </Text>

      {total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, percent)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {visitedCount} / {total} ({percent}%)
          </Text>
        </View>
      )}

      {/* 国称号 */}
      <Text style={styles.sectionTitle}>{t('countryTitles')}</Text>
      <View style={styles.titlesCard}>
        {titles.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.titleRow,
              item.unlocked && styles.titleRowUnlocked,
              index === titles.length - 1 && styles.titleRowLast,
              { borderLeftColor: item.unlocked ? item.tierColor : 'transparent' },
            ]}
          >
            <View style={[styles.titleIconWrap, item.unlocked && { backgroundColor: item.tierColor + '22' }]}>
              <Ionicons
                name={item.icon}
                size={22}
                color={item.unlocked ? item.tierColor : SUSHI_COLORS.textMuted}
              />
            </View>
            <View style={styles.titleRowMain}>
              <Text style={[styles.titleName, item.unlocked && styles.titleNameUnlocked]}>
                {item.label}
              </Text>
              <Text style={styles.titleCondition}>{item.condition}</Text>
            </View>
            {item.unlocked ? (
              <View style={styles.titleCheckWrap}>
                <Ionicons name="checkmark-circle" size={26} color={item.tierColor} />
              </View>
            ) : (
              <Ionicons name="lock-closed" size={20} color={SUSHI_COLORS.textMuted} />
            )}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('hotelsInBrand')}</Text>
      <View style={styles.card}>
        {countryHotels.map((hotel) => {
          const isVisited = visitedHotels.includes(hotel.id);
          const isDream = wantToGoHotels.includes(hotel.id);
          const priceStr =
            hotel.currency === 'JPY'
              ? `¥${hotel.pricePerNight.toLocaleString()}〜`
              : `${hotel.currency} ${hotel.pricePerNight.toLocaleString()}`;
          return (
            <Pressable
              key={hotel.id}
              style={({ pressed }) => [styles.hotelRow, pressed && styles.hotelRowPressed]}
              onPress={() => router.push(`/hotel/${encodeURIComponent(hotel.id)}` as any)}
            >
              <View style={styles.hotelMain}>
                <Text style={styles.hotelName} numberOfLines={1}>
                  {hotel.name}
                </Text>
                <Text style={styles.hotelMeta} numberOfLines={1}>
                  {hotel.cityName || hotel.countryCode || ''} · {priceStr}
                  {t('perNight')}
                </Text>
                <View style={styles.badgeRow}>
                  {isVisited && (
                    <View style={styles.badgeVisited}>
                      <Text style={styles.badgeText}>{t('visited')}</Text>
                    </View>
                  )}
                  {isDream && (
                    <View style={styles.badgeDream}>
                      <Text style={styles.badgeText}>{t('wantToGo')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
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
    marginBottom: SPACING.lg,
  },
  progressSection: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: SUSHI_COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressLabel: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  titlesCard: {
    backgroundColor: SUSHI_COLORS.backgroundElevated,
    borderRadius: RADIUS.lg,
    padding: 0,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingLeft: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUSHI_COLORS.border,
    borderLeftWidth: 4,
  },
  titleRowUnlocked: {
    backgroundColor: SUSHI_COLORS.surfaceLight,
  },
  titleRowLast: {
    borderBottomWidth: 0,
  },
  titleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  titleRowMain: {
    flex: 1,
  },
  titleName: {
    fontSize: 17,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  titleNameUnlocked: {
    color: SUSHI_COLORS.textPrimary,
    fontWeight: '700',
  },
  titleCondition: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  titleCheckWrap: {
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: SUSHI_COLORS.backgroundElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  hotelRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUSHI_COLORS.border,
  },
  hotelRowPressed: {
    opacity: 0.7,
  },
  hotelMain: {},
  hotelName: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
  },
  hotelMeta: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  badgeVisited: {
    backgroundColor: SUSHI_COLORS.accentSecondary + '25',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeDream: {
    backgroundColor: SUSHI_COLORS.primary + '25',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
  },
});
