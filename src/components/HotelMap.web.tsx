// ============================================
// Hotel Map - Web 用（地図なし）
// react-native-maps は Web 非対応のため、リスト＋詳細のみ表示
// ============================================

import React, { useRef, useCallback, useMemo, useState, memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SUSHI_COLORS, SPACING } from '../constants/theme';
import type { HotelPin } from '../types';
import {
  getLuxuryHotelPins,
  getLuxuryHotelsMeta,
  getAdminRegionForHotel,
  getCountryDisplayName,
  REGION_IDS,
  REGION_COUNTRIES,
  getRegionDisplayName,
  type RegionId,
} from '../data/hotelData';
import HotelDetail from './HotelDetail';
import { useStore } from '../store/useStore';
import { useI18n } from '../i18n/I18nContext';
import type { HotelStatusFilter } from './HotelMap';

const ListSeparator = memo(() => <View style={styles.listSeparator} />);

const HotelListItem = memo(function HotelListItem({
  hotel,
  onPress,
  isVisited,
  isWantToGo,
  t,
}: {
  hotel: HotelPin;
  onPress: () => void;
  isVisited: boolean;
  isWantToGo: boolean;
  t: (key: import('../i18n/translations').TranslationKeys, params?: { count?: number }) => string;
}) {
  const priceStr =
    hotel.currency === 'JPY'
      ? `¥${hotel.pricePerNight.toLocaleString()}〜`
      : `${hotel.currency} ${hotel.pricePerNight.toLocaleString()}`;
  return (
    <Pressable style={styles.listItem} onPress={onPress}>
      <View style={styles.listItemIcon}>
        <Ionicons name="bed" size={22} color={SUSHI_COLORS.primary} />
      </View>
      <View style={styles.listItemInfo}>
        <View style={styles.listItemNameRow}>
          <Text style={styles.listItemName} numberOfLines={1}>{hotel.name}</Text>
          {isVisited && (
            <View style={styles.listItemBadgeVisited}>
              <Text style={styles.listItemBadgeText}>{t('visited')}</Text>
            </View>
          )}
          {isWantToGo && (
            <View style={styles.listItemBadgeWantToGo}>
              <Text style={styles.listItemBadgeText}>{t('wantToGo')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.listItemMeta} numberOfLines={1}>
          {hotel.cityName || hotel.countryCode || ''} · {priceStr}{t('perNight')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
    </Pressable>
  );
});

export default function HotelMapWeb() {
  const { locale, t } = useI18n();
  const detailSheetRef = useRef<BottomSheet>(null);
  const listSheetRef = useRef<BottomSheet>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelPin | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | ''>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<HotelStatusFilter>('all');
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [regionExpanded, setRegionExpanded] = useState(false);
  const [countryExpanded, setCountryExpanded] = useState(false);
  const [prefectureExpanded, setPrefectureExpanded] = useState(false);

  const visitedHotels = useStore((s) => s.visitedHotels);
  const wantToGoHotels = useStore((s) => s.wantToGoHotels);

  const hotels = useMemo(() => getLuxuryHotelPins(), []);
  const meta = useMemo(() => getLuxuryHotelsMeta(), []);

  const regionsWithData = useMemo(() => {
    const countrySet = new Set(hotels.map((h) => h.countryCode).filter(Boolean));
    return REGION_IDS.filter((rid) =>
      REGION_COUNTRIES[rid].some((c) => countrySet.has(c))
    );
  }, [hotels]);

  const countries = useMemo(() => {
    let codes = new Set(hotels.map((h) => h.countryCode).filter(Boolean));
    if (selectedRegion) {
      const inRegion = new Set(REGION_COUNTRIES[selectedRegion]);
      codes = new Set([...codes].filter((c) => inRegion.has(c)));
    }
    return Array.from(codes).sort((a, b) =>
      (getCountryDisplayName(a, locale) || a).localeCompare(getCountryDisplayName(b, locale) || b)
    );
  }, [hotels, selectedRegion, locale]);

  const adminRegions = useMemo(() => {
    const countryHotels = hotels.filter((h) => h.countryCode === selectedCountry);
    const set = new Set<string>();
    countryHotels.forEach((h) => {
      const region = getAdminRegionForHotel(h);
      if (region) set.add(region);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [hotels, selectedCountry]);

  const filteredHotels = useMemo(() => {
    let list = hotels;
    if (selectedStatus === 'visited') {
      list = list.filter((h) => visitedHotels.includes(h.id));
    } else if (selectedStatus === 'wantToGo') {
      list = list.filter((h) => wantToGoHotels.includes(h.id));
    }
    if (selectedRegion) {
      const inRegion = new Set(REGION_COUNTRIES[selectedRegion]);
      list = list.filter((h) => inRegion.has(h.countryCode));
    }
    if (selectedCountry) {
      list = list.filter((h) => h.countryCode === selectedCountry);
    }
    if (selectedCountry && selectedPrefecture) {
      list = list.filter((h) => getAdminRegionForHotel(h) === selectedPrefecture);
    }
    return list;
  }, [hotels, selectedStatus, selectedRegion, selectedCountry, selectedPrefecture, visitedHotels, wantToGoHotels]);

  const totalCount = hotels.length;
  const regionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    REGION_IDS.forEach((rid) => {
      const inRegion = new Set(REGION_COUNTRIES[rid]);
      map[rid] = hotels.filter((h) => inRegion.has(h.countryCode)).length;
    });
    return map;
  }, [hotels]);
  const countryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    hotels.forEach((h) => {
      if (h.countryCode) map[h.countryCode] = (map[h.countryCode] ?? 0) + 1;
    });
    return map;
  }, [hotels]);
  const adminRegionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    hotels.filter((h) => h.countryCode === selectedCountry).forEach((h) => {
      const region = getAdminRegionForHotel(h);
      if (region) map[region] = (map[region] ?? 0) + 1;
    });
    return map;
  }, [hotels, selectedCountry]);

  const visitedCount = useMemo(
    () => hotels.filter((h) => visitedHotels.includes(h.id)).length,
    [hotels, visitedHotels]
  );
  const wantToGoCount = useMemo(
    () => hotels.filter((h) => wantToGoHotels.includes(h.id)).length,
    [hotels, wantToGoHotels]
  );

  const filterSummary = useMemo(() => {
    if (selectedStatus === 'visited') return `${t('visited')} (${filteredHotels.length})`;
    if (selectedStatus === 'wantToGo') return `${t('wantToGo')} (${filteredHotels.length})`;
    if (selectedPrefecture) return `${selectedPrefecture.replace(/(都|道|府|県|州)$/, '')} (${filteredHotels.length})`;
    if (selectedCountry) return `${getCountryDisplayName(selectedCountry, locale)} (${filteredHotels.length})`;
    if (selectedRegion) return `${getRegionDisplayName(selectedRegion, locale)} (${filteredHotels.length})`;
    return `${t('all')} (${totalCount})`;
  }, [t, locale, selectedStatus, selectedRegion, selectedCountry, selectedPrefecture, filteredHotels.length, totalCount]);

  const detailSnapPoints = useMemo(() => ['55%', '85%'], []);
  const listSnapPoints = useMemo(() => ['90%'], []);

  const handleListItemPress = useCallback((hotel: HotelPin) => {
    setSelectedHotel(hotel);
    detailSheetRef.current?.snapToIndex(0);
  }, []);

  const handleCloseDetail = useCallback(() => {
    detailSheetRef.current?.close();
    setSelectedHotel(null);
  }, []);

  const renderListItem = useCallback(
    ({ item }: { item: HotelPin }) => (
      <HotelListItem
        hotel={item}
        onPress={() => handleListItemPress(item)}
        isVisited={visitedHotels.includes(item.id)}
        isWantToGo={wantToGoHotels.includes(item.id)}
        t={t}
      />
    ),
    [handleListItemPress, visitedHotels, wantToGoHotels, t]
  );

  return (
    <View style={styles.container}>
      <View style={styles.webBanner}>
        <Ionicons name="information-circle-outline" size={20} color={SUSHI_COLORS.primary} />
        <Text style={styles.webBannerText}>
          地図はスマートフォンアプリ（Expo Go）でご利用ください
        </Text>
      </View>

      <BottomSheet
        ref={listSheetRef}
        index={0}
        snapPoints={listSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        animateOnMount={false}
        enableOverDrag={false}
        handleHeight={24}
      >
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>🏨 {t('hotelList')}</Text>
            <Text style={styles.listSubtitle}>
              {t('totalItems', { count: totalCount })}
              {(selectedRegion || selectedCountry || selectedPrefecture || selectedStatus !== 'all') && (
                <Text style={styles.listSubtitleFilter}> → {t('showingItems', { count: filteredHotels.length })}</Text>
              )}
              {meta.generatedAt && ` · ${t('fetchedAt')}: ${meta.generatedAt.slice(0, 10)}`}
            </Text>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSummaryText}>{filterSummary}</Text>

          <Pressable style={styles.filterSectionRow} onPress={() => setStatusExpanded((e) => !e)}>
            <Text style={styles.filterLabel}>{t('filterStatus')}</Text>
            <Ionicons name={statusExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={SUSHI_COLORS.textMuted} />
          </Pressable>
          {statusExpanded && (
            <View style={styles.filterChipRow}>
              <Pressable
                style={[styles.filterChip, selectedStatus === 'all' && styles.filterChipActive]}
                onPress={() => { setSelectedStatus('all'); setRegionExpanded(true); }}
              >
                <Text style={[styles.filterChipText, selectedStatus === 'all' && styles.filterChipTextActive]}>{t('all')}</Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, selectedStatus === 'visited' && styles.filterChipActive]}
                onPress={() => { setSelectedStatus('visited'); setRegionExpanded(true); }}
              >
                <Text style={[styles.filterChipText, selectedStatus === 'visited' && styles.filterChipTextActive]}>
                  {t('visited')} ({visitedCount})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterChip, selectedStatus === 'wantToGo' && styles.filterChipActive]}
                onPress={() => { setSelectedStatus('wantToGo'); setRegionExpanded(true); }}
              >
                <Text style={[styles.filterChipText, selectedStatus === 'wantToGo' && styles.filterChipTextActive]}>
                  {t('wantToGo')} ({wantToGoCount})
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.filterSectionRow} onPress={() => setRegionExpanded((e) => !e)}>
            <Text style={styles.filterLabel}>{t('filterRegion')}</Text>
            <Ionicons name={regionExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={SUSHI_COLORS.textMuted} />
          </Pressable>
          {regionExpanded && (
            <View style={styles.filterChipRow}>
              <Pressable
                style={[styles.filterChip, !selectedRegion && styles.filterChipActive]}
                onPress={() => { setSelectedRegion(''); setSelectedCountry(''); setSelectedPrefecture(''); setCountryExpanded(true); }}
              >
                <Text style={[styles.filterChipText, !selectedRegion && styles.filterChipTextActive]}>{t('all')}</Text>
              </Pressable>
              {regionsWithData.map((rid) => (
                <Pressable
                  key={rid}
                  style={[styles.filterChip, selectedRegion === rid && styles.filterChipActive]}
                  onPress={() => { setSelectedRegion(rid); setSelectedCountry(''); setSelectedPrefecture(''); setCountryExpanded(true); }}
                >
                  <Text style={[styles.filterChipText, selectedRegion === rid && styles.filterChipTextActive]}>
                    {getRegionDisplayName(rid, locale)} ({regionCounts[rid] ?? 0})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable style={styles.filterSectionRow} onPress={() => setCountryExpanded((e) => !e)}>
            <Text style={styles.filterLabel}>{t('filterCountry')}</Text>
            <Ionicons name={countryExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={SUSHI_COLORS.textMuted} />
          </Pressable>
          {countryExpanded && (
            <View style={styles.filterChipRow}>
              <Pressable
                style={[styles.filterChip, !selectedCountry && styles.filterChipActive]}
                onPress={() => { setSelectedCountry(''); setSelectedPrefecture(''); }}
              >
                <Text style={[styles.filterChipText, !selectedCountry && styles.filterChipTextActive]}>{t('all')}</Text>
              </Pressable>
              {countries.map((code) => (
                <Pressable
                  key={code}
                  style={[styles.filterChip, selectedCountry === code && styles.filterChipActive]}
                  onPress={() => {
                    setSelectedCountry(code);
                    setSelectedPrefecture('');
                    if (code === 'JP') setPrefectureExpanded(true);
                  }}
                >
                  <Text style={[styles.filterChipText, selectedCountry === code && styles.filterChipTextActive]}>
                    {getCountryDisplayName(code, locale)} ({countryCounts[code] ?? 0})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedCountry && adminRegions.length > 0 && (
            <>
              <Pressable style={styles.filterSectionRow} onPress={() => setPrefectureExpanded((e) => !e)}>
                <Text style={styles.filterLabel}>{selectedCountry === 'JP' ? t('filterPrefecture') : t('filterStateRegion')}</Text>
                <Ionicons name={prefectureExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={SUSHI_COLORS.textMuted} />
              </Pressable>
              {prefectureExpanded && (
                <View style={styles.filterChipRow}>
                  <Pressable
                    style={[styles.filterChip, !selectedPrefecture && styles.filterChipActive]}
                    onPress={() => setSelectedPrefecture('')}
                  >
                    <Text style={[styles.filterChipText, !selectedPrefecture && styles.filterChipTextActive]}>{t('all')}</Text>
                  </Pressable>
                  {adminRegions.map((region) => (
                    <Pressable
                      key={region}
                      style={[styles.filterChip, selectedPrefecture === region && styles.filterChipActive]}
                      onPress={() => setSelectedPrefecture(region)}
                    >
                      <Text style={[styles.filterChipText, selectedPrefecture === region && styles.filterChipTextActive]}>
                        {region.replace(/(都|道|府|県|州)$/, '')} ({adminRegionCounts[region] ?? 0})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {filteredHotels.length > 0 ? (
          <BottomSheetFlatList
            data={filteredHotels}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            initialNumToRender={20}
          />
        ) : (
          <View style={styles.listEmpty}>
            <Text style={styles.listEmptyIcon}>🏨</Text>
            <Text style={styles.listEmptyText}>{t('noData')}</Text>
            <Text style={styles.listEmptyHint}>{t('noDataHint')}</Text>
          </View>
        )}
      </BottomSheet>

      <BottomSheet
        ref={detailSheetRef}
        index={-1}
        snapPoints={detailSnapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        animateOnMount={false}
      >
        <BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {selectedHotel && (
            <HotelDetail hotel={selectedHotel} onClose={handleCloseDetail} />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.background,
  },
  webBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: SUSHI_COLORS.primary + '15',
    borderBottomWidth: 1,
    borderBottomColor: SUSHI_COLORS.border,
  },
  webBannerText: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    flex: 1,
  },
  sheetBackground: {
    backgroundColor: SUSHI_COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetIndicator: {
    backgroundColor: SUSHI_COLORS.textMuted,
    width: 48,
    height: 5,
  },
  listHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  filterSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: SUSHI_COLORS.border,
  },
  filterSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.xs,
  },
  filterSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  filterSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUSHI_COLORS.textMuted,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  filterChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: SUSHI_COLORS.surface,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  filterChipActive: {
    backgroundColor: SUSHI_COLORS.primary,
    borderColor: SUSHI_COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: SUSHI_COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  listSubtitle: {
    fontSize: 13,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  listSubtitleFilter: {
    color: SUSHI_COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SUSHI_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  listItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  listItemBadgeVisited: {
    backgroundColor: SUSHI_COLORS.accentSecondary + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listItemBadgeWantToGo: {
    backgroundColor: SUSHI_COLORS.primary + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listItemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
  },
  listItemMeta: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginTop: 2,
  },
  listSeparator: {
    height: 1,
    backgroundColor: SUSHI_COLORS.border,
    marginLeft: SPACING.lg + 40 + SPACING.md,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  listEmptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  listEmptyText: {
    fontSize: 16,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
  },
  listEmptyHint: {
    fontSize: 13,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
