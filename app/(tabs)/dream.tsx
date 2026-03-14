// ============================================
// Dream - 夢に追加したホテル一覧（達成バー・貯金額・目標日）
// ============================================

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SUSHI_COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { getLuxuryHotelPins } from '../../src/data/hotelData';
import { useStore } from '../../src/store/useStore';
import { useI18n } from '../../src/i18n/I18nContext';
import type { HotelPin } from '../../src/types';

function formatPrice(value: number, currency: string): string {
  if (currency === 'JPY') return `¥${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

/** 貯金額入力の単位表示（表示言語に合わせて 円/¥, $, € など） */
function getCurrencySuffix(currency: string, locale: 'ja' | 'en'): string {
  if (currency === 'JPY') return locale === 'ja' ? '円' : '¥';
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return currency;
}

/** 残り日数（deadline 未設定時は undefined） */
function getRemainingDays(deadline: string | undefined): number | undefined {
  if (!deadline || typeof deadline !== 'string') return undefined;
  const end = new Date(deadline + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** (goalPrice - savedAmount) / monthsRemaining. remainingDays <= 0 のときは undefined */
function getNeededPerMonth(
  goalPrice: number,
  savedAmount: number,
  remainingDays: number | undefined
): number | undefined {
  if (remainingDays == null || remainingDays <= 0) return undefined;
  const remaining = goalPrice - savedAmount;
  if (remaining <= 0) return 0;
  const monthsRemaining = Math.max(1, remainingDays / 30);
  return remaining / monthsRemaining;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = SPACING.xl;
const CARD_IMAGE_HEIGHT = 140;

export default function DreamScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const wantToGoHotels = useStore((s) => s.wantToGoHotels);
  const dreamVisitedHotelIds = useStore((s) => s.dreamVisitedHotelIds);
  const hotelVisitedDates = useStore((s) => s.hotelVisitedDates);
  const getHotelVisitedDate = useStore((s) => s.getHotelVisitedDate);
  const getDreamAddedDate = useStore((s) => s.getDreamAddedDate);
  const getHotelSavingGoal = useStore((s) => s.getHotelSavingGoal);
  const getHotelSavedAmount = useStore((s) => s.getHotelSavedAmount);
  const setHotelSavingGoal = useStore((s) => s.setHotelSavingGoal);
  const setHotelSavedAmount = useStore((s) => s.setHotelSavedAmount);
  const setHotelDeadline = useStore((s) => s.setHotelDeadline);

  const hotels = useMemo(() => getLuxuryHotelPins(), []);
  const wantToGoSet = useMemo(() => new Set(wantToGoHotels), [wantToGoHotels]);

  const dreamHotels = useMemo(
    () => hotels.filter((h) => wantToGoSet.has(h.id)),
    [hotels, wantToGoSet]
  );

  /** Dream に登録していたが「行った」にしたホテル（Dream Visited 欄・表示順は登録順） */
  const dreamVisitedHotels = useMemo(() => {
    const seen = new Set<string>();
    return dreamVisitedHotelIds
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => hotels.find((h) => h.id === id))
      .filter((h): h is HotelPin => h != null);
  }, [hotels, dreamVisitedHotelIds]);

  /** 貯金額 >= 目標金額 の Dream ホテル（達成リスト） */
  const achievedHotels = useMemo(() => {
    return dreamHotels.filter((h) => {
      const saved = getHotelSavedAmount(h.id) ?? 0;
      const goal = getHotelSavingGoal(h.id) ?? h.pricePerNight;
      return goal > 0 && saved >= goal;
    });
  }, [dreamHotels, getHotelSavedAmount, getHotelSavingGoal]);

  /** まだ達成していない Dream ホテル（叶えたい夢） */
  const inProgressHotels = useMemo(
    () => dreamHotels.filter((h) => !achievedHotels.includes(h)),
    [dreamHotels, achievedHotels]
  );

  // Dream 追加時、目標金額が未設定なら宿泊料金を目標にする（The Plaza 例: ¥195,000）
  useEffect(() => {
    dreamHotels.forEach((hotel) => {
      const current = getHotelSavingGoal(hotel.id);
      if (current == null || current <= 0) {
        setHotelSavingGoal(hotel.id, hotel.pricePerNight);
      }
    });
  }, [dreamHotels, getHotelSavingGoal, setHotelSavingGoal]);

  const handleHotelPress = (hotelId: string) => {
    router.push(`/hotel/${encodeURIComponent(hotelId)}` as any);
  };

  if (dreamHotels.length === 0 && dreamVisitedHotels.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyContent}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="star" size={64} color={SUSHI_COLORS.accentTertiary} />
        </View>
        <Text style={styles.emptyTitle}>{t('dreamEmpty')}</Text>
        <Text style={styles.emptyHint}>{t('dreamEmptyHint')}</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('dreamSectionTitle')}</Text>
          <Text style={styles.tagline}>{t('dreamTagline')}</Text>
        </View>

        {(dreamVisitedHotels.length > 0 || achievedHotels.length > 0) && (
          <View style={styles.dreamVisitedSection}>
            <Text style={styles.sectionTitle}>{t('dreamVisitedTitle')}</Text>
            {dreamVisitedHotels.map((hotel) => (
              <Pressable
                key={hotel.id}
                style={({ pressed }) => [styles.achievedCard, styles.dreamVisitedCard, pressed && styles.rowPressed]}
                onPress={() => handleHotelPress(hotel.id)}
              >
                {hotel.image ? (
                  <Image source={{ uri: hotel.image }} style={styles.achievedCardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.achievedCardPlaceholder}>
                    <Ionicons name="bed" size={28} color={SUSHI_COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.achievedCardBody}>
                  <Text style={styles.achievedCardName} numberOfLines={1}>{hotel.name}</Text>
                  <Text style={styles.achievedCardMeta}>
                    {hotel.cityName || hotel.countryCode || ''} · {formatPrice(hotel.pricePerNight, hotel.currency)}
                    {t('perNight')}
                  </Text>
                  <View style={styles.dreamJourneyBlock}>
                    {getDreamAddedDate(hotel.id) ? (
                      <View style={styles.dreamJourneyItem}>
                        <View style={styles.dreamJourneyLabelWrap}>
                          <Ionicons name="heart-outline" size={14} color={SUSHI_COLORS.accentSecondary} />
                          <Text style={styles.dreamJourneyLabel}>{t('dreamStartedOn')}</Text>
                        </View>
                        <Text style={styles.dreamJourneyDate}>{getDreamAddedDate(hotel.id)}</Text>
                      </View>
                    ) : null}
                    {getHotelVisitedDate(hotel.id) ? (
                      <View style={[styles.dreamJourneyItem, !getDreamAddedDate(hotel.id) && styles.dreamJourneyItemFirst]}>
                        <View style={styles.dreamJourneyLabelWrap}>
                          <Ionicons name="checkmark-circle" size={14} color={SUSHI_COLORS.accentSecondary} />
                          <Text style={styles.dreamJourneyLabel}>{t('dreamAchievedOn')}</Text>
                        </View>
                        <Text style={styles.dreamJourneyDate}>{getHotelVisitedDate(hotel.id)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
              </Pressable>
            ))}
            {achievedHotels.map((hotel) => (
              <Pressable
                key={hotel.id}
                style={({ pressed }) => [styles.achievedCard, styles.achievedCardGoal, pressed && styles.rowPressed]}
                onPress={() => handleHotelPress(hotel.id)}
              >
                {hotel.image ? (
                  <Image source={{ uri: hotel.image }} style={styles.achievedCardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.achievedCardPlaceholder}>
                    <Ionicons name="bed" size={28} color={SUSHI_COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.achievedCardBody}>
                  <Text style={styles.achievedCardName} numberOfLines={1}>{hotel.name}</Text>
                  <Text style={styles.achievedCardMeta}>
                    {hotel.cityName || hotel.countryCode || ''} · {formatPrice(hotel.pricePerNight, hotel.currency)}
                    {t('perNight')}
                  </Text>
                  <View style={styles.achievedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={SUSHI_COLORS.accentSecondary} />
                    <Text style={styles.achievedBadgeText}>{t('dreamGoalAchieved')}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {inProgressHotels.length > 0 && (
          <View style={styles.inProgressSection}>
            <Text style={styles.sectionTitle}>{t('dreamInProgressTitle')}</Text>
            {inProgressHotels.map((hotel, index) => (
              <DreamHotelCard
                key={hotel.id}
                hotel={hotel}
                isLast={index === inProgressHotels.length - 1}
                setHotelSavedAmount={setHotelSavedAmount}
                setHotelDeadline={setHotelDeadline}
                onPress={() => handleHotelPress(hotel.id)}
                t={t}
                locale={locale}
              />
            ))}
          </View>
        )}

        {dreamHotels.length === 0 && dreamVisitedHotels.length > 0 && (
          <Text style={styles.allAchievedHint}>{t('dreamEmptyHint')}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface DreamHotelCardProps {
  hotel: HotelPin;
  isLast: boolean;
  setHotelSavedAmount: (id: string, value: number | undefined) => void;
  setHotelDeadline: (id: string, deadline: string | undefined) => void;
  onPress: () => void;
  t: (key: import('../../src/i18n/translations').TranslationKeys) => string;
  locale: 'ja' | 'en';
}

function DreamHotelCard({
  hotel,
  isLast,
  setHotelSavedAmount,
  setHotelDeadline,
  onPress,
  t,
  locale,
}: DreamHotelCardProps) {
  // カード内でストアを購読して、入力でストアが更新されると再レンダーされるようにする
  const savedAmount = useStore((s) => s.getHotelSavedAmount(hotel.id)) ?? 0;
  const deadline = useStore((s) => s.getHotelDeadline(hotel.id));
  const goalFromStore = useStore((s) => s.getHotelSavingGoal(hotel.id));
  const dreamImageUri = useStore((s) => s.getDreamHotelImage(hotel.id));
  const setDreamHotelImage = useStore((s) => s.setDreamHotelImage);

  const goalAmount = goalFromStore ?? hotel.pricePerNight;
  const progress =
    goalAmount > 0 ? Math.min(100, (savedAmount / goalAmount) * 100) : 0;
  const remainingDays = getRemainingDays(deadline);

  // 入力中はローカル state で表示し、blur でストアに反映（入力が効くようにする）
  const [savedInput, setSavedInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');

  useEffect(() => {
    setSavedInput(savedAmount > 0 ? String(savedAmount) : '');
    setDeadlineInput(deadline ?? '');
  }, [savedAmount, deadline]);

  const persistSaved = useCallback(() => {
    const raw = savedInput.trim();
    if (raw === '') {
      setHotelSavedAmount(hotel.id, undefined);
      return;
    }
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isNaN(n)) setHotelSavedAmount(hotel.id, n);
    else setSavedInput(savedAmount > 0 ? String(savedAmount) : '');
  }, [hotel.id, savedInput, savedAmount, setHotelSavedAmount]);

  const persistDeadline = useCallback(() => {
    const v = deadlineInput.trim();
    setHotelDeadline(hotel.id, v || undefined);
    if (!v) setDeadlineInput('');
  }, [hotel.id, deadlineInput, setHotelDeadline]);

  const handlePickDreamImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('permissionPhotoMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setDreamHotelImage(hotel.id, result.assets[0].uri);
    }
  }, [hotel.id, setDreamHotelImage, t]);

  const handleRemoveDreamImage = useCallback(() => {
    Alert.alert(
      t('dreamImageRemove'),
      t('deletePhotoConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => setDreamHotelImage(hotel.id, undefined) },
      ]
    );
  }, [hotel.id, setDreamHotelImage, t]);

  const priceStr = formatPrice(hotel.pricePerNight, hotel.currency);
  const goalStr = formatPrice(goalAmount, hotel.currency);
  const savedStr = formatPrice(savedAmount, hotel.currency);
  const amountLeft = Math.max(0, goalAmount - savedAmount);
  const amountLeftStr = formatPrice(amountLeft, hotel.currency);
  const progressPercent = Math.min(100, Math.round(progress));
  const isComplete = progressPercent >= 100;
  const needPerMonth = getNeededPerMonth(goalAmount, savedAmount, remainingDays ?? undefined);

  return (
    <View style={[styles.card, isLast && styles.cardLast]}>
      {/* あこがれイメージ（画像がある場合） */}
      {hotel.image ? (
        <Pressable style={styles.cardImageWrap} onPress={onPress}>
          <Image source={{ uri: hotel.image }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardImageContent}>
            <Text style={styles.hotelNameOnImage} numberOfLines={2}>
              {hotel.name}
            </Text>
            <Text style={styles.hotelMetaOnImage}>
              {hotel.cityName || hotel.countryCode || ''} · {priceStr}
              {t('perNight')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" style={styles.cardImageChevron} />
        </Pressable>
      ) : (
        <Pressable style={({ pressed }) => [styles.headerRow, pressed && styles.rowPressed]} onPress={onPress}>
          <View style={styles.rowMain}>
            <Text style={styles.hotelName} numberOfLines={1}>
              {hotel.name}
            </Text>
            <Text style={styles.hotelMeta}>
              {hotel.cityName || hotel.countryCode || ''} · {priceStr}
              {t('perNight')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={SUSHI_COLORS.textMuted} />
        </Pressable>
      )}

      {/* 目標の励み用写真（1枚・ホテル下・目標金額の上） */}
      <View style={styles.dreamPhotoSection}>
        {dreamImageUri ? (
          <View style={styles.dreamPhotoWrap}>
            <Image source={{ uri: dreamImageUri }} style={styles.dreamPhotoImage} resizeMode="cover" />
            <View style={styles.dreamPhotoActions}>
              <Pressable style={styles.dreamPhotoButton} onPress={handlePickDreamImage}>
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.dreamPhotoButtonText}>{t('dreamImageChange')}</Text>
              </Pressable>
              <Pressable style={styles.dreamPhotoButton} onPress={handleRemoveDreamImage}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.dreamPhotoButtonText}>{t('dreamImageRemove')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.dreamPhotoPlaceholder} onPress={handlePickDreamImage}>
            <Ionicons name="image-outline" size={36} color={SUSHI_COLORS.textMuted} />
            <Text style={styles.dreamPhotoPlaceholderText}>{t('dreamImageAdd')}</Text>
            <Text style={styles.dreamPhotoPlaceholderHint}>{t('dreamImageHint')}</Text>
          </Pressable>
        )}
      </View>

      {/* 進捗：あこがれを感じるコピーとバー */}
      <View style={styles.barSection}>
        {isComplete ? (
          <Text style={styles.barEncourage}>{t('dreamProgressDone')}</Text>
        ) : (
          <Text style={styles.barEncourage}>
            {t('dreamProgressLabel', { percent: String(progressPercent) })}
            {' · '}
            {t('dreamAmountLeft', { amount: amountLeftStr })}
          </Text>
        )}
        <Text style={styles.barLabel}>
          {savedStr} / {goalStr}
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, progress)}%` },
            ]}
          />
        </View>
      </View>

      {/* 貯金額入力 */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{t('savedAmount')}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={SUSHI_COLORS.textMuted}
          value={savedInput}
          onChangeText={(text) => {
            const digits = text.replace(/[^0-9]/g, '');
            setSavedInput(digits);
            if (digits === '') {
              setHotelSavedAmount(hotel.id, undefined);
              return;
            }
            const n = Number(digits);
            if (!Number.isNaN(n)) setHotelSavedAmount(hotel.id, n);
          }}
          onBlur={persistSaved}
          keyboardType="number-pad"
          editable
        />
        {hotel.currency && <Text style={styles.inputSuffix}>{getCurrencySuffix(hotel.currency, locale)}</Text>}
      </View>

      {/* 目標日入力 */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{t('deadline')}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={SUSHI_COLORS.textMuted}
          value={deadlineInput}
          onChangeText={(text) => {
            setDeadlineInput(text);
            setHotelDeadline(hotel.id, text.trim() || undefined);
          }}
          onBlur={persistDeadline}
          keyboardType="numbers-and-punctuation"
          editable
        />
      </View>

      {deadline && remainingDays != null && (
        <View style={styles.hintRow}>
          <Ionicons name="calendar-outline" size={14} color={SUSHI_COLORS.textMuted} />
          <Text style={styles.hintText}>
            {remainingDays >= 0
              ? t('dreamRemainingDaysFormat', { days: String(remainingDays) })
              : t('pastTarget')}
          </Text>
        </View>
      )}
      {needPerMonth != null && remainingDays != null && remainingDays > 0 && !isComplete && (
        <View style={styles.hintRow}>
          <Ionicons name="wallet-outline" size={14} color={SUSHI_COLORS.textMuted} />
          <Text style={styles.hintText}>
            {t('neededPerMonth')} {formatPrice(Math.round(needPerMonth), hotel.currency)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3f0',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xl * 2,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: SUSHI_COLORS.dreamDarkBlue,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: 15,
    color: SUSHI_COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SUSHI_COLORS.dreamDarkBlue,
    marginBottom: SPACING.md,
  },
  achievedSection: {
    marginBottom: SPACING.xl,
  },
  achievedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUSHI_COLORS.dreamWhite,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: SUSHI_COLORS.dreamDarkBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  achievedCardGoal: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(45, 157, 120, 0.22)',
  },
  achievedCardImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.border,
  },
  achievedCardPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievedCardBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.md,
  },
  achievedCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  achievedCardMeta: {
    fontSize: 12,
    color: SUSHI_COLORS.textSecondary,
    marginTop: 2,
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  achievedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUSHI_COLORS.accentSecondary,
  },
  dreamVisitedSection: {
    marginBottom: SPACING.xl,
  },
  dreamVisitedCard: {
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(45, 157, 120, 0.45)',
  },
  dreamJourneyBlock: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: SUSHI_COLORS.border,
  },
  dreamJourneyItem: {
    marginTop: 6,
  },
  dreamJourneyItemFirst: {
    marginTop: 0,
  },
  dreamJourneyLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dreamJourneyLabel: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    flexShrink: 0,
  },
  dreamJourneyDate: {
    fontSize: 13,
    fontWeight: '500',
    color: SUSHI_COLORS.textSecondary,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inProgressSection: {
    marginBottom: SPACING.xl,
  },
  allAchievedHint: {
    fontSize: 14,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  emptyContent: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  },
  emptyIconWrap: {
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptyHint: {
    fontSize: 14,
    color: SUSHI_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: SUSHI_COLORS.dreamWhite,
    borderRadius: 20,
    padding: 0,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    shadowColor: SUSHI_COLORS.dreamDarkBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardLast: {
    marginBottom: 0,
  },
  cardImageWrap: {
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardImageContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  cardImageChevron: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    marginTop: -11,
  },
  hotelNameOnImage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hotelMetaOnImage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowMain: {
    flex: 1,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
  },
  hotelMeta: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: 2,
  },
  dreamPhotoSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dreamPhotoWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: SUSHI_COLORS.background,
  },
  dreamPhotoImage: {
    width: '100%',
    height: 140,
    backgroundColor: SUSHI_COLORS.border,
  },
  dreamPhotoActions: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  dreamPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: SUSHI_COLORS.dreamDarkBlue,
  },
  dreamPhotoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  dreamPhotoPlaceholder: {
    height: 120,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: SUSHI_COLORS.border,
    backgroundColor: SUSHI_COLORS.background + '80',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  dreamPhotoPlaceholderText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  dreamPhotoPlaceholderHint: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  barSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  barEncourage: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.dreamDarkBlue,
    marginBottom: SPACING.xs,
  },
  barLabel: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: SUSHI_COLORS.dreamGoldLight + '40',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: SUSHI_COLORS.dreamGold,
    borderRadius: RADIUS.full,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    width: 90,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: SUSHI_COLORS.textPrimary,
    backgroundColor: SUSHI_COLORS.background,
  },
  inputSuffix: {
    fontSize: 14,
    color: SUSHI_COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  hintText: {
    fontSize: 12,
    color: SUSHI_COLORS.textMuted,
  },
});
