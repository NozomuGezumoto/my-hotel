// ============================================
// Hotel Detail Component
// ホテル詳細・行った・画像・思い出
// ============================================

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  Platform,
  TextInput,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SUSHI_COLORS, SPACING, RADIUS } from '../constants/theme';
import type { HotelPin } from '../types';
import { useStore } from '../store/useStore';
import { useI18n } from '../i18n/I18nContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;
const MAIN_PHOTO_HEIGHT = 160;
const SUB_PHOTO_SIZE = (PHOTO_WIDTH - SPACING.sm * 2) / 3;

interface HotelDetailProps {
  hotel: HotelPin;
  onClose: () => void;
}

function formatPrice(value: number, currency: string): string {
  if (currency === 'JPY') {
    return `¥${value.toLocaleString()}`;
  }
  return `${currency} ${value.toLocaleString()}`;
}

function HotelPhotoGallery({
  photos,
  onAddPhoto,
  onRemovePhoto,
  t,
}: {
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (uri: string) => void;
  t: (key: import('../i18n/translations').TranslationKeys) => string;
}) {
  const mainPhoto = photos[0];
  const subPhotos = photos.slice(1, 4);
  const canAddMore = photos.length < 4;
  const hasPhotos = photos.length > 0;

  const handleTapPhoto = (uri: string) => {
    Alert.alert(
      t('deletePhoto'),
      t('deletePhotoConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => onRemovePhoto(uri) },
      ]
    );
  };

  return (
    <View style={styles.photoGallery}>
      <Pressable
        style={[styles.mainPhotoSlot, hasPhotos && styles.mainPhotoSlotFilled]}
        onPress={mainPhoto ? () => handleTapPhoto(mainPhoto) : onAddPhoto}
      >
        {mainPhoto ? (
          <Image source={{ uri: mainPhoto }} style={styles.mainPhoto} />
        ) : (
          <View style={styles.addPhotoPlaceholder}>
            <Text style={styles.addPhotoEmoji}>📸</Text>
            <Text style={styles.addPhotoTitle}>{t('addPhoto')}</Text>
            <Text style={styles.addPhotoSubtitle}>{t('addPhotoSubtitle')}</Text>
          </View>
        )}
      </Pressable>
      {hasPhotos && (
        <View style={styles.subPhotoRow}>
          {[0, 1, 2].map((index) => {
            const photo = subPhotos[index];
            const isAddButton = !photo && canAddMore && index === subPhotos.length;
            return (
              <Pressable
                key={index}
                style={[styles.subPhotoSlot, photo && styles.subPhotoSlotFilled]}
                onPress={photo ? () => handleTapPhoto(photo) : isAddButton ? onAddPhoto : undefined}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.subPhoto} />
                ) : isAddButton ? (
                  <View style={styles.addPhotoPlaceholderSmall}>
                    <Ionicons name="add" size={24} color={SUSHI_COLORS.primary} />
                  </View>
                ) : (
                  <View style={styles.emptyPhotoSlot} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HotelDetail({ hotel, onClose }: HotelDetailProps) {
  const { t } = useI18n();
  const visited = useStore((s) => s.visitedHotels.includes(hotel.id));
  const wantToGo = useStore((s) => s.wantToGoHotels.includes(hotel.id));
  const markHotelVisited = useStore((s) => s.markHotelVisited);
  const unmarkHotelVisited = useStore((s) => s.unmarkHotelVisited);
  const markHotelWantToGo = useStore((s) => s.markHotelWantToGo);
  const unmarkHotelWantToGo = useStore((s) => s.unmarkHotelWantToGo);
  const setHotelMemo = useStore((s) => s.setHotelMemo);
  const addHotelPhoto = useStore((s) => s.addHotelPhoto);
  const removeHotelPhoto = useStore((s) => s.removeHotelPhoto);
  const setHotelRating = useStore((s) => s.setHotelRating);

  const storeMemoNote = useStore((s) => s.hotelMemos.find((m) => m.id === hotel.id)?.note ?? '');
  const photos = useStore((s) => s.hotelMemos.find((m) => m.id === hotel.id)?.photos ?? []);
  const rating = useStore((s) => s.hotelRatings[hotel.id]);

  const [note, setNote] = useState(storeMemoNote);
  const prevHotelIdRef = useRef(hotel.id);
  const justSwitchedRef = useRef(false);

  // ホテル切り替え時: 前のホテルにメモを保存してから、表示を新しいホテルのメモに同期
  useEffect(() => {
    if (prevHotelIdRef.current !== hotel.id) {
      setHotelMemo(prevHotelIdRef.current, note);
      prevHotelIdRef.current = hotel.id;
      justSwitchedRef.current = true;
      setNote(storeMemoNote);
    }
  }, [hotel.id, setHotelMemo, storeMemoNote]);

  // 同一ホテルでのメモ入力時に保存（切り替え直後の1回はスキップ）
  useEffect(() => {
    if (justSwitchedRef.current) {
      justSwitchedRef.current = false;
      return;
    }
    setHotelMemo(hotel.id, note);
  }, [note, hotel.id, setHotelMemo]);

  const handleOpenMaps = useCallback(() => {
    const encodedName = encodeURIComponent(hotel.name);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`;
    const appleMapsUrl = `http://maps.apple.com/?q=${encodedName}&ll=${hotel.lat},${hotel.lng}`;
    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;
    Linking.openURL(url);
  }, [hotel]);

  const handleSearchWeb = useCallback(() => {
    const query = encodeURIComponent(`${hotel.name} ${hotel.cityName} hotel`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  }, [hotel]);

  const handleToggleVisited = useCallback(() => {
    if (visited) {
      unmarkHotelVisited(hotel.id);
    } else {
      markHotelVisited(hotel.id);
    }
  }, [hotel.id, visited, markHotelVisited, unmarkHotelVisited]);

  const handleToggleWantToGo = useCallback(() => {
    if (wantToGo) {
      unmarkHotelWantToGo(hotel.id);
    } else {
      markHotelWantToGo(hotel.id);
    }
  }, [hotel.id, wantToGo, markHotelWantToGo, unmarkHotelWantToGo]);

  const handleAddPhoto = useCallback(async () => {
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
      addHotelPhoto(hotel.id, result.assets[0].uri);
    }
  }, [hotel.id, addHotelPhoto]);

  const handleRemovePhoto = useCallback(
    (uri: string) => {
      removeHotelPhoto(hotel.id, uri);
    },
    [hotel.id, removeHotelPhoto]
  );

  return (
    <View style={styles.content}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={SUSHI_COLORS.textMuted} />
      </Pressable>

      <View style={styles.nameRow}>
        <Text style={styles.emoji}>{visited ? '✅' : wantToGo ? '⭐' : '🏨'}</Text>
        <Text style={styles.name}>{hotel.name}</Text>
      </View>

      <View style={styles.tagRow}>
        {visited && (
          <View style={styles.visitedTag}>
            <Ionicons name="checkmark-circle" size={16} color={SUSHI_COLORS.accentSecondary} />
            <Text style={styles.visitedTagText}>{t('visited')}</Text>
          </View>
        )}
        {wantToGo && (
          <View style={styles.wantToGoTag}>
            <Ionicons name="heart" size={16} color={SUSHI_COLORS.primary} />
            <Text style={styles.wantToGoTagText}>{t('wantToGo')}</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Ionicons name="bed-outline" size={20} color={SUSHI_COLORS.primary} />
        <Text style={styles.priceText}>
          {t('perNightLabel')} {formatPrice(hotel.pricePerNight, hotel.currency)}〜
        </Text>
      </View>

      {(hotel.cityName || hotel.countryCode) && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color={SUSHI_COLORS.textMuted} />
          <Text style={styles.infoText}>
            {[hotel.cityName, hotel.countryCode].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}

      {hotel.address ? (
        <View style={styles.infoRow}>
          <Ionicons name="navigate-outline" size={18} color={SUSHI_COLORS.textMuted} />
          <Text style={styles.infoText} numberOfLines={2}>{hotel.address}</Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Ionicons name="compass-outline" size={18} color={SUSHI_COLORS.textMuted} />
        <Text style={styles.infoText}>
          {t('latLng')} {hotel.lat.toFixed(5)}, {hotel.lng.toFixed(5)}
        </Text>
      </View>

      {/* 写真 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sectionPhotos')}</Text>
        <HotelPhotoGallery
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          t={t}
        />
      </View>

      {/* 満足度（行ったときのみ・思い出の上） */}
      {visited && (
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>{t('sectionRating')}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                style={styles.starButton}
                onPress={() => setHotelRating(hotel.id, value)}
              >
                <Ionicons
                  name={rating !== undefined && value <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={rating !== undefined && value <= rating ? SUSHI_COLORS.accentTertiary : SUSHI_COLORS.textMuted}
                />
              </Pressable>
            ))}
          </View>
          {rating !== undefined && (
            <Text style={styles.ratingLabel}>{rating} / 5</Text>
          )}
        </View>
      )}

      {/* 思い出 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sectionMemories')}</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t('memoPlaceholder')}
          placeholderTextColor={SUSHI_COLORS.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 行った・行きたい */}
      <View style={styles.actionButtonRow}>
        <Pressable
          style={[
            styles.visitedButton,
            styles.actionButton,
            visited ? styles.visitedButtonActive : styles.visitedButtonPrimary,
          ]}
          onPress={handleToggleVisited}
        >
          <Ionicons
            name={visited ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={visited ? SUSHI_COLORS.textMuted : '#fff'}
          />
          <Text style={[styles.visitedButtonText, visited && styles.visitedButtonTextMuted]}>
            {visited ? t('unvisit') : t('visited')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.wantToGoButton,
            styles.actionButton,
            wantToGo ? styles.wantToGoButtonActive : styles.wantToGoButtonPrimary,
          ]}
          onPress={handleToggleWantToGo}
        >
          <Ionicons
            name={wantToGo ? 'heart-dislike-outline' : 'heart-outline'}
            size={20}
            color={wantToGo ? SUSHI_COLORS.textMuted : '#fff'}
          />
          <Text style={[styles.wantToGoButtonText, wantToGo && styles.wantToGoButtonTextMuted]}>
            {wantToGo ? t('unwantToGo') : t('wantToGo')}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.mapsButton} onPress={handleOpenMaps}>
        <Ionicons name="map-outline" size={20} color={SUSHI_COLORS.primary} />
        <Text style={styles.mapsButtonText}>{t('openInMaps')}</Text>
      </Pressable>

      <Pressable style={styles.webSearchButton} onPress={handleSearchWeb}>
        <Ionicons name="search-outline" size={20} color={SUSHI_COLORS.accentSecondary} />
        <Text style={styles.webSearchButtonText}>{t('searchWeb')}</Text>
      </Pressable>

      <Text style={styles.source}>{t('dataSource')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    padding: SPACING.sm,
    zIndex: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    width: '100%',
    paddingRight: 40,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: SUSHI_COLORS.textPrimary,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    width: '100%',
  },
  visitedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: SUSHI_COLORS.accentSecondary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  visitedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUSHI_COLORS.accentSecondary,
  },
  wantToGoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: SUSHI_COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  wantToGoTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    width: '100%',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: SUSHI_COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: SUSHI_COLORS.textSecondary,
    flex: 1,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  visitedButton: {},
  visitedButtonPrimary: {
    backgroundColor: SUSHI_COLORS.accentSecondary,
  },
  visitedButtonActive: {
    backgroundColor: SUSHI_COLORS.surface,
  },
  visitedButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  visitedButtonTextMuted: {
    color: SUSHI_COLORS.textMuted,
  },
  wantToGoButton: {},
  wantToGoButtonPrimary: {
    backgroundColor: SUSHI_COLORS.primary,
  },
  wantToGoButtonActive: {
    backgroundColor: SUSHI_COLORS.surface,
  },
  wantToGoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  wantToGoButtonTextMuted: {
    color: SUSHI_COLORS.textMuted,
  },
  ratingSection: {
    width: '100%',
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingLabel: {
    fontSize: 13,
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    width: '100%',
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SUSHI_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  photoGallery: {
    width: '100%',
  },
  mainPhotoSlot: {
    width: '100%',
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  mainPhotoSlotFilled: {},
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  addPhotoPlaceholder: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: SUSHI_COLORS.primary + '30',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  addPhotoEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  addPhotoTitle: { fontSize: 16, fontWeight: '600', color: SUSHI_COLORS.textPrimary, marginBottom: SPACING.xs },
  addPhotoSubtitle: { fontSize: 13, color: SUSHI_COLORS.textMuted },
  subPhotoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  subPhotoSlot: {
    width: SUB_PHOTO_SIZE,
    height: SUB_PHOTO_SIZE,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  subPhotoSlotFilled: {},
  subPhoto: { width: '100%', height: '100%' },
  addPhotoPlaceholderSmall: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.primary + '10',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: SUSHI_COLORS.primary + '30',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPhotoSlot: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.md,
    opacity: 0.5,
  },
  noteInput: {
    backgroundColor: SUSHI_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 15,
    color: SUSHI_COLORS.textPrimary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: SUSHI_COLORS.border,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.primary + '15',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    width: '100%',
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.primary,
  },
  webSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUSHI_COLORS.accentSecondary + '15',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    width: '100%',
  },
  webSearchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SUSHI_COLORS.accentSecondary,
  },
  source: {
    fontSize: 11,
    color: SUSHI_COLORS.textMuted,
    marginTop: SPACING.lg,
  },
});
