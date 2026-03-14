// ============================================
// Brand / Country Completion (isVisited only)
// ブランド達成は COMPLETION_BRANDS の15ブランドのみ
// ============================================

import type { HotelPin } from '../types';
import { getBrandForHotel, COMPLETION_BRANDS } from './hotelData';

export interface BrandCompletionItem {
  brand: string;
  total: number;
  visited: number;
  percent: number;
}

export interface CountryCompletionItem {
  countryCode: string;
  countryName: string;
  total: number;
  visited: number;
  percent: number;
}

export function getBrandCompletion(
  hotels: HotelPin[],
  visitedIds: Set<string>
): BrandCompletionItem[] {
  const byBrand = new Map<string, { total: number; visited: number }>();
  for (const b of COMPLETION_BRANDS) {
    byBrand.set(b, { total: 0, visited: 0 });
  }
  for (const h of hotels) {
    const brand = getBrandForHotel(h);
    if (brand === 'Other') continue;
    const cur = byBrand.get(brand);
    if (!cur) continue;
    cur.total += 1;
    if (visitedIds.has(h.id)) cur.visited += 1;
  }
  return Array.from(byBrand.entries())
    .map(([brand, { total, visited }]) => ({
      brand,
      total,
      visited,
      percent: total > 0 ? Math.round((visited / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total || a.brand.localeCompare(b.brand));
}

export function getCountryCompletion(
  hotels: HotelPin[],
  visitedIds: Set<string>,
  getCountryDisplayName: (code: string) => string
): CountryCompletionItem[] {
  const byCountry = new Map<string, { total: number; visited: number }>();
  for (const h of hotels) {
    const code = h.countryCode || 'Other';
    const cur = byCountry.get(code) ?? { total: 0, visited: 0 };
    cur.total += 1;
    if (visitedIds.has(h.id)) cur.visited += 1;
    byCountry.set(code, cur);
  }
  return Array.from(byCountry.entries())
    .map(([countryCode, { total, visited }]) => ({
      countryCode,
      countryName: getCountryDisplayName(countryCode),
      total,
      visited,
      percent: total > 0 ? Math.round((visited / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
