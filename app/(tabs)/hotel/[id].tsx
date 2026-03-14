// ============================================
// Hotel Detail Screen (from Brands / Countries / Dream)
// ============================================

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUSHI_COLORS, SPACING } from '../../../src/constants/theme';
import { getLuxuryHotelPins } from '../../../src/data/hotelData';
import HotelDetail from '../../../src/components/HotelDetail';

export default function HotelDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hotelId = id ? decodeURIComponent(String(id)) : '';

  const hotels = useMemo(() => getLuxuryHotelPins(), []);
  const hotel = useMemo(
    () => hotels.find((h) => h.id === hotelId),
    [hotels, hotelId]
  );

  const handleClose = () => router.back();

  if (!hotel) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={SUSHI_COLORS.primary} />
        </Pressable>
        <Text style={styles.notFound}>Hotel not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <HotelDetail hotel={hotel} onClose={handleClose} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: SUSHI_COLORS.background,
    padding: SPACING.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: SPACING.sm,
  },
  notFound: {
    fontSize: 16,
    color: SUSHI_COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
});
